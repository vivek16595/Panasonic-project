import { Cell, Fixture, Robot, WeldBead, WeldingProgram } from '../models/types.js';
import { PanasonicCsvWriter } from './csv-writer.js';
import { EquipmentManager } from './equipment-manager.js';
import { ShopFloorStateManager } from './state-manager.js';

export interface SimulationCallbacks {
  onStep?: (data: any) => void;
  onBeadComplete?: (bead: WeldBead, fixture: Fixture, robot: Robot) => void;
  onFixtureComplete?: (fixture: Fixture) => void;
  onCellComplete?: (cell: Cell) => void;
  onFault?: (error: Error, cellId: string, fixtureId?: string) => void;
}

export class WeldingSimulationEngine {
  private activeJobs: Map<string, { abortController: AbortController; isRunning: boolean }> = new Map();
  private speedMultiplier: number = 1.0;

  constructor(
    private stateManager: ShopFloorStateManager,
    private equipmentManager: EquipmentManager,
    private csvWriter: PanasonicCsvWriter
  ) {}

  public setSpeedMultiplier(mult: number) {
    this.speedMultiplier = mult;
  }

  public isCellSimulating(cellId: string): boolean {
    const job = this.activeJobs.get(cellId);
    return !!(job && job.isRunning);
  }

  /**
   * Executes a complete cell simulation run through its assigned fixtures, programs, and beads.
   */
  public async executeCell(cellId: string, callbacks: SimulationCallbacks = {}): Promise<boolean> {
    const cell = this.stateManager.getCellById(cellId);
    if (!cell) {
      throw new Error(`Cell '${cellId}' not found.`);
    }

    if (this.isCellSimulating(cellId)) {
      throw new Error(`Cell '${cellId}' is already actively simulating.`);
    }

    if (cell.status === 'Faulted') {
      throw new Error(`Cannot start Cell '${cellId}': Cell is in Faulted state (${cell.faultMessage || 'Interlock'}).`);
    }

    const faultedFixture = cell.fixtures.find(f => f.status === 'Faulted');
    if (faultedFixture) {
      throw new Error(`Cannot start Cell '${cellId}': Fixture '${faultedFixture.name}' is Faulted (${faultedFixture.faultMessage || 'Faulted'}).`);
    }

    const faultedRobot = cell.robots.find(r => r.status === 'Faulted');
    if (faultedRobot) {
      throw new Error(`Cannot start Cell '${cellId}': Robot '${faultedRobot.name}' is Faulted (${faultedRobot.faultMessage || 'Faulted'}).`);
    }

    // 1. Reserve equipment
    const robotIds = cell.robots.map(r => r.id);
    const fixtureIds = cell.fixtures.map(f => f.id);
    this.equipmentManager.reserveEquipmentForCell(cellId, robotIds, fixtureIds);

    // Setup abort controller
    const abortCtrl = new AbortController();
    this.activeJobs.set(cellId, { abortController: abortCtrl, isRunning: true });

    // Mark cell & robots & fixtures as Running
    this.stateManager.updateCellStatus(cellId, 'Running');
    for (const r of cell.robots) {
      r.status = 'Running';
    }
    for (const f of cell.fixtures) {
      f.status = 'Running';
      f.progressPct = 0;
      f.currentBeadIndex = 0;
      // Generate 10-digit Workpiece Serial Number
      f.currentJobWorkSN = `W${Date.now().toString().slice(-9)}`;
    }

    // Log OPREVLOG for all robots: Program start
    for (const r of cell.robots) {
      await this.csvWriter.writeOprevlog(
        r.controllerSerialNumber,
        cellId,
        'EVT_AUTO_START',
        'Automatic cell production started',
        `Cell: ${cell.name}`
      );
    }

    try {
      // Execute each assignment (fixture + robots + program)
      for (const assignment of cell.assignments) {
        if (abortCtrl.signal.aborted) {
          throw new Error('Simulation aborted by operator.');
        }

        const fixture = cell.fixtures.find(f => f.id === assignment.fixtureId);
        const program = cell.programs.find(p => p.id === assignment.programId);
        const assignedRobots = cell.robots.filter(r => assignment.robotIds.includes(r.id));

        if (!fixture || !program) continue;

        await this.executeFixtureProgram(cell, fixture, program, assignedRobots, abortCtrl.signal, callbacks);
      }

      // Check if all fixtures reached completed
      const allCompleted = cell.fixtures.every(f => f.status === 'Completed');
      if (allCompleted) {
        this.stateManager.updateCellStatus(cellId, 'Completed');
        for (const r of cell.robots) {
          r.status = 'Completed';
          r.arcOn = false;
          await this.csvWriter.writeOprevlog(
            r.controllerSerialNumber,
            cellId,
            'EVT_AUTO_COMPLETE',
            'Cell production run successfully completed'
          );
        }

        callbacks.onCellComplete?.(cell);
        return true;
      } else {
        return false;
      }
    } catch (err: any) {
      const errMsg = err.message || 'Unknown simulation fault';
      this.stateManager.updateCellStatus(cellId, 'Faulted', errMsg);
      for (const r of cell.robots) {
        r.status = 'Faulted';
        r.arcOn = false;
        r.faultMessage = errMsg;
        await this.csvWriter.writeOprevlog(
          r.controllerSerialNumber,
          cellId,
          'EVT_ALARM_FAULT',
          `Production faulted: ${errMsg}`
        );
      }
      callbacks.onFault?.(err, cellId);
      throw err;
    } finally {
      // Safely release equipment reservations
      this.equipmentManager.releaseEquipmentForCell(cellId);
      const job = this.activeJobs.get(cellId);
      if (job) {
        job.isRunning = false;
      }
      this.activeJobs.delete(cellId);
    }
  }

  private async executeFixtureProgram(
    cell: Cell,
    fixture: Fixture,
    program: WeldingProgram,
    robots: Robot[],
    abortSignal: AbortSignal,
    callbacks: SimulationCallbacks
  ): Promise<void> {
    const allBeads: { subId: string; bead: WeldBead }[] = [];
    for (const sub of program.subPrograms) {
      for (const bead of sub.beads) {
        allBeads.push({ subId: sub.id, bead });
      }
    }

    fixture.totalBeads = allBeads.length;
    const workSN = fixture.currentJobWorkSN || `${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    for (let i = 0; i < allBeads.length; i++) {
      if (abortSignal.aborted) {
        throw new Error('Simulation stopped by operator.');
      }

      const { subId, bead } = allBeads[i];
      fixture.currentBeadIndex = i + 1;
      fixture.currentSubProgramId = subId;
      bead.status = 'Welding';

      // Turn arc on for robots
      for (const r of robots) {
        r.arcOn = true;
        r.currentFixtureId = fixture.id;
        r.currentBead = bead.beadNumber;
      }

      // Simulate bead progress over duration
      const durationMs = Math.max(10, (bead.durationSeconds * 1000) / this.speedMultiplier);
      const stepIntervalMs = Math.max(5, Math.min(100, Math.round(durationMs / 5)));
      const steps = Math.max(2, Math.round(durationMs / stepIntervalMs));

      for (let s = 1; s <= steps; s++) {
        if (abortSignal.aborted) {
          throw new Error('Simulation stopped during weld bead.');
        }

        await new Promise(resolve => setTimeout(resolve, stepIntervalMs));

        const beadProgressFraction = s / steps;
        const overallProgress = ((i + beadProgressFraction) / allBeads.length) * 100;
        fixture.progressPct = Math.round(overallProgress);

        // Update robot telemetry
        for (const r of robots) {
          r.liveTelemetry = {
            current: bead.targetCurrent + (Math.random() - 0.5) * 4,
            voltage: bead.targetVoltage + (Math.random() - 0.5) * 0.8,
            wireFeed: bead.wireFeedRate + (Math.random() - 0.5) * 0.2,
            gasFlow: bead.gasFlowRate + (Math.random() - 0.5) * 0.1,
            motorTorque: 45 + Math.random() * 10,
            temperature: 52 + (s * 0.2)
          };
        }

        callbacks.onStep?.({
          cellId: cell.id,
          fixtureId: fixture.id,
          beadNumber: bead.beadNumber,
          stepProgressPct: fixture.progressPct,
          telemetry: robots[0]?.liveTelemetry
        });
      }

      // Bead completed
      bead.status = 'Completed';
      bead.actualCurrent = bead.targetCurrent + (Math.random() - 0.5) * 2;
      bead.actualVoltage = bead.targetVoltage + (Math.random() - 0.5) * 0.4;

      // Arc off
      for (const r of robots) {
        r.arcOn = false;

        // Generate Panasonic Waveform File (1 per bead per controller)
        const wfFile = await this.csvWriter.writeWaveform(
          r.controllerSerialNumber,
          cell.id,
          r.model,
          workSN,
          program.id,
          subId,
          bead
        );
        bead.waveformFile = wfFile;

        // Write WELDEVLOG row
        await this.csvWriter.writeWeldevlog(
          r.controllerSerialNumber,
          cell.id,
          workSN,
          program.id,
          subId,
          bead,
          'OK'
        );

        callbacks.onBeadComplete?.(bead, fixture, r);
      }
    }

    fixture.status = 'Completed';
    fixture.progressPct = 100;
    callbacks.onFixtureComplete?.(fixture);
  }

  public stopCell(cellId: string): void {
    const job = this.activeJobs.get(cellId);
    if (job) {
      job.abortController.abort();
      job.isRunning = false;
      this.stateManager.updateCellStatus(cellId, 'Stopped', 'Stopped by operator');
      this.equipmentManager.releaseEquipmentForCell(cellId);
    }
  }

  public injectFault(cellId: string, fixtureId?: string, reason: string = 'Injected E-STOP / Arc Loss Fault'): void {
    const job = this.activeJobs.get(cellId);
    const cell = this.stateManager.getCellById(cellId);
    if (cell) {
      this.stateManager.updateCellStatus(cellId, 'Faulted', reason);
      if (fixtureId) {
        const fixture = cell.fixtures.find(f => f.id === fixtureId);
        if (fixture) {
          fixture.status = 'Faulted';
          fixture.faultMessage = reason;
        }
      }
      for (const r of cell.robots) {
        r.status = 'Faulted';
        r.arcOn = false;
        r.faultMessage = reason;
      }
    }

    if (job) {
      job.abortController.abort();
      job.isRunning = false;
    }

    this.equipmentManager.releaseEquipmentForCell(cellId);
  }
}
