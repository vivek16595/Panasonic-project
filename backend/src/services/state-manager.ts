import { Cell, ProductionHistoryRecord, EntityStatus, Robot, Fixture, WeldingProgram } from '../models/types.js';

export class ShopFloorStateManager {
  private cells: Map<string, Cell> = new Map();
  private history: ProductionHistoryRecord[] = [];
  private eventLogs: Array<{ id: string; timestamp: string; type: string; message: string; cellId?: string; level: 'info' | 'warn' | 'error' }> = [];

  constructor() {
    this.seedDefaultCell();
  }

  private seedDefaultCell() {
    const defaultPrograms: WeldingProgram[] = [
      {
        id: 'PRG-AUTO-CHASSIS-01',
        name: 'Automotive Sub-Frame Joint Sequence',
        workpieceType: 'Automotive Crossmember Heavy',
        subPrograms: [
          {
            id: 'SUB-01',
            name: 'Base Gusset Fillet Weld',
            description: 'Outer flange continuous structural fillet weld',
            beads: [
              {
                beadNumber: 1,
                targetCurrent: 210,
                targetVoltage: 24.5,
                travelSpeed: 45,
                wireFeedRate: 8.5,
                gasFlowRate: 15.0,
                durationSeconds: 2.5,
                lengthMm: 120,
                status: 'Pending'
              },
              {
                beadNumber: 2,
                targetCurrent: 220,
                targetVoltage: 25.0,
                travelSpeed: 48,
                wireFeedRate: 9.0,
                gasFlowRate: 15.0,
                durationSeconds: 2.5,
                lengthMm: 130,
                status: 'Pending'
              }
            ]
          },
          {
            id: 'SUB-02',
            name: 'Stiffener Plate Seam',
            description: 'Internal stiffener reinforce pass',
            beads: [
              {
                beadNumber: 3,
                targetCurrent: 195,
                targetVoltage: 23.5,
                travelSpeed: 42,
                wireFeedRate: 7.8,
                gasFlowRate: 14.5,
                durationSeconds: 2.0,
                lengthMm: 95,
                status: 'Pending'
              }
            ]
          }
        ]
      }
    ];

    const defaultRobots: Robot[] = [
      {
        id: 'ROBOT-PANO-01',
        name: 'Panasonic TM-1400 Master',
        controllerSerialNumber: 'SN-CTRL-98421',
        model: 'Panasonic TM-1400',
        cellId: 'CELL-01',
        status: 'Ready',
        arcOn: false
      },
      {
        id: 'ROBOT-PANO-02',
        name: 'Panasonic TM-1400 Slave',
        controllerSerialNumber: 'SN-CTRL-98422',
        model: 'Panasonic TM-1400',
        cellId: 'CELL-01',
        status: 'Ready',
        arcOn: false
      }
    ];

    const defaultFixtures: Fixture[] = [
      {
        id: 'FIX-TABLE-A',
        name: 'Dual Rotary Table Station A',
        cellId: 'CELL-01',
        status: 'Ready',
        assignedRobotIds: ['ROBOT-PANO-01', 'ROBOT-PANO-02'],
        currentProgramId: 'PRG-AUTO-CHASSIS-01',
        currentBeadIndex: 0,
        totalBeads: 3,
        progressPct: 0
      }
    ];

    const cell01: Cell = {
      id: 'CELL-01',
      name: 'Primary Robotic Welding Cell 1',
      description: 'High-speed automated MIG welding cell with dual synchronized robots',
      status: 'Ready',
      robots: defaultRobots,
      fixtures: defaultFixtures,
      programs: defaultPrograms,
      assignments: [
        {
          fixtureId: 'FIX-TABLE-A',
          robotIds: ['ROBOT-PANO-01', 'ROBOT-PANO-02'],
          programId: 'PRG-AUTO-CHASSIS-01'
        }
      ],
      createdAt: new Date().toISOString()
    };

    this.cells.set(cell01.id, cell01);
  }

  public getAllCells(): Cell[] {
    return Array.from(this.cells.values());
  }

  public getCellById(cellId: string): Cell | undefined {
    return this.cells.get(cellId);
  }

  public createCell(cell: Cell): Cell {
    if (this.cells.has(cell.id)) {
      throw new Error(`Cell with ID '${cell.id}' already exists.`);
    }

    // Validate cell readiness
    const isValidReady = this.validateCellReadiness(cell);
    const finalCell: Cell = {
      ...cell,
      status: isValidReady ? 'Ready' : (cell.status === 'Draft' ? 'Draft' : 'Draft'),
      createdAt: cell.createdAt || new Date().toISOString()
    };

    this.cells.set(finalCell.id, finalCell);
    this.logEvent('info', `Cell '${finalCell.name}' (${finalCell.id}) created with status ${finalCell.status}.`, finalCell.id);
    return finalCell;
  }

  public updateCell(cellId: string, updates: Partial<Cell>): Cell {
    const existing = this.cells.get(cellId);
    if (!existing) {
      throw new Error(`Cell '${cellId}' not found.`);
    }

    if (existing.status === 'Running') {
      throw new Error(`Cannot modify configuration of actively running cell '${cellId}'.`);
    }

    const updated: Cell = {
      ...existing,
      ...updates,
      id: cellId // immutable ID
    };

    const isReady = this.validateCellReadiness(updated);
    if (updated.status !== 'Draft' && !isReady) {
      updated.status = 'Draft';
    } else if (isReady && updated.status === 'Draft' && updates.status === 'Ready') {
      updated.status = 'Ready';
    }

    this.cells.set(cellId, updated);
    this.logEvent('info', `Cell '${cellId}' configuration updated.`, cellId);
    return updated;
  }

  public deleteCell(cellId: string): boolean {
    const cell = this.cells.get(cellId);
    if (!cell) {
      throw new Error(`Cell '${cellId}' does not exist.`);
    }

    if (cell.status === 'Running' || cell.status === 'Queued') {
      throw new Error(`Cannot delete cell '${cellId}' while it is currently ${cell.status}.`);
    }

    this.cells.delete(cellId);
    this.logEvent('warn', `Cell '${cellId}' was deleted.`, cellId);
    return true;
  }

  public validateCellReadiness(cell: Cell): boolean {
    if (!cell.robots || cell.robots.length === 0) return false;
    if (!cell.fixtures || cell.fixtures.length === 0) return false;
    if (!cell.programs || cell.programs.length === 0) return false;
    if (!cell.assignments || cell.assignments.length === 0) return false;

    // Verify all assigned fixtures and programs exist
    for (const assign of cell.assignments) {
      const fixtureExists = cell.fixtures.some(f => f.id === assign.fixtureId);
      const programExists = cell.programs.some(p => p.id === assign.programId);
      const robotsExist = assign.robotIds.every(rId => cell.robots.some(r => r.id === rId));
      if (!fixtureExists || !programExists || !robotsExist || assign.robotIds.length === 0) {
        return false;
      }
    }

    return true;
  }

  public updateCellStatus(cellId: string, status: EntityStatus, faultMsg?: string): void {
    const cell = this.cells.get(cellId);
    if (cell) {
      cell.status = status;
      if (faultMsg !== undefined) {
        cell.faultMessage = faultMsg;
      }
      if (status === 'Running') {
        cell.lastRunAt = new Date().toISOString();
      }
      this.logEvent(status === 'Faulted' ? 'error' : 'info', `Cell '${cellId}' status changed to ${status}${faultMsg ? ': ' + faultMsg : ''}`, cellId);
    }
  }

  public logEvent(level: 'info' | 'warn' | 'error', message: string, cellId?: string) {
    const event = {
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type: level.toUpperCase(),
      message,
      cellId,
      level
    };
    this.eventLogs.unshift(event);
    if (this.eventLogs.length > 200) {
      this.eventLogs.pop();
    }
  }

  public getEvents() {
    return [...this.eventLogs];
  }

  public recordHistory(record: ProductionHistoryRecord) {
    this.history.unshift(record);
  }

  public getHistory() {
    return [...this.history];
  }
}
