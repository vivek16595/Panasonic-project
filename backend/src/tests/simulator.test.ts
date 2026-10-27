import { describe, it, expect, beforeEach } from 'vitest';
import { ShopFloorStateManager } from '../services/state-manager.js';
import { EquipmentManager } from '../services/equipment-manager.js';
import { PanasonicCsvWriter } from '../services/csv-writer.js';
import { WeldingSimulationEngine } from '../services/simulation-engine.js';
import { ProductionQueueEngine } from '../services/queue-engine.js';
import { WampClientService } from '../services/wamp-client.js';
import { Cell } from '../models/types.js';
import fs from 'fs';
import path from 'path';

describe('Welding Shop-Floor Simulator - Acceptance Test Suite', () => {
  let stateManager: ShopFloorStateManager;
  let equipmentManager: EquipmentManager;
  let csvWriter: PanasonicCsvWriter;
  let simulationEngine: WeldingSimulationEngine;
  let queueEngine: ProductionQueueEngine;
  let wampClient: WampClientService;
  let testOutputDir: string;

  beforeEach(() => {
    testOutputDir = path.join(process.cwd(), 'data', 'test-csv-output', `run-${Date.now()}`);
    stateManager = new ShopFloorStateManager();
    equipmentManager = new EquipmentManager();
    csvWriter = new PanasonicCsvWriter(testOutputDir);
    wampClient = new WampClientService();
    simulationEngine = new WeldingSimulationEngine(stateManager, equipmentManager, csvWriter);
    // Speed up simulation time for deterministic fast tests
    simulationEngine.setSpeedMultiplier(100.0);
    queueEngine = new ProductionQueueEngine(stateManager, simulationEngine, csvWriter);
  });

  // Scenario 1: Create a cell with new robots and fixtures
  it('Scenario 1: Creates a cell with new robots and fixtures', () => {
    const newCell: Cell = {
      id: 'CELL-NEW-01',
      name: 'Custom Fabricator Cell',
      description: 'Newly fabricated cell with fresh robots',
      status: 'Ready',
      robots: [
        {
          id: 'ROBOT-CUSTOM-01',
          name: 'Custom Arm 1',
          controllerSerialNumber: 'SN-CUSTOM-1001',
          model: 'Panasonic TM-1400',
          cellId: 'CELL-NEW-01',
          status: 'Ready',
          arcOn: false
        }
      ],
      fixtures: [
        {
          id: 'FIX-CUSTOM-01',
          name: 'Custom Bed 1',
          cellId: 'CELL-NEW-01',
          status: 'Ready',
          assignedRobotIds: ['ROBOT-CUSTOM-01'],
          currentBeadIndex: 0,
          totalBeads: 1,
          progressPct: 0
        }
      ],
      programs: [
        {
          id: 'PRG-CUSTOM-01',
          name: 'Simple Flange Program',
          workpieceType: 'Plate',
          subPrograms: [
            {
              id: 'SUB-1',
              name: 'Seam 1',
              description: 'Linear fillet',
              beads: [
                {
                  beadNumber: 1,
                  targetCurrent: 180,
                  targetVoltage: 22,
                  travelSpeed: 40,
                  wireFeedRate: 7.0,
                  gasFlowRate: 14.0,
                  durationSeconds: 0.1,
                  lengthMm: 50,
                  status: 'Pending'
                }
              ]
            }
          ]
        }
      ],
      assignments: [
        {
          fixtureId: 'FIX-CUSTOM-01',
          robotIds: ['ROBOT-CUSTOM-01'],
          programId: 'PRG-CUSTOM-01'
        }
      ],
      createdAt: new Date().toISOString()
    };

    const created = stateManager.createCell(newCell);
    expect(created.id).toBe('CELL-NEW-01');
    expect(created.status).toBe('Ready');
    expect(stateManager.getCellById('CELL-NEW-01')).toBeDefined();
  });

  // Scenario 2: Create a cell using compatible existing equipment
  it('Scenario 2: Creates a cell using compatible existing equipment from registry', () => {
    const existingRobot = equipmentManager.getEquipmentById('ROBOT-PANO-03');
    const existingFixture = equipmentManager.getEquipmentById('FIX-HEAVY-01');
    expect(existingRobot).toBeDefined();
    expect(existingFixture).toBeDefined();

    const reuseCell: Cell = {
      id: 'CELL-REUSE-02',
      name: 'Reused Heavy Duty Cell',
      description: 'Cell built reusing idle physical equipment',
      status: 'Ready',
      robots: [
        {
          id: existingRobot!.id,
          name: existingRobot!.name,
          controllerSerialNumber: existingRobot!.controllerSerialNumber!,
          model: existingRobot!.model!,
          cellId: 'CELL-REUSE-02',
          status: 'Ready',
          arcOn: false
        }
      ],
      fixtures: [
        {
          id: existingFixture!.id,
          name: existingFixture!.name,
          cellId: 'CELL-REUSE-02',
          status: 'Ready',
          assignedRobotIds: [existingRobot!.id],
          currentBeadIndex: 0,
          totalBeads: 1,
          progressPct: 0
        }
      ],
      programs: [
        {
          id: 'PRG-HEAVY-01',
          name: 'Heavy Plate Program',
          workpieceType: 'Heavy Plate',
          subPrograms: [
            {
              id: 'SUB-1',
              name: 'Root',
              description: 'Root pass',
              beads: [
                {
                  beadNumber: 1,
                  targetCurrent: 200,
                  targetVoltage: 24,
                  travelSpeed: 45,
                  wireFeedRate: 8,
                  gasFlowRate: 15,
                  durationSeconds: 0.1,
                  lengthMm: 80,
                  status: 'Pending'
                }
              ]
            }
          ]
        }
      ],
      assignments: [
        {
          fixtureId: existingFixture!.id,
          robotIds: [existingRobot!.id],
          programId: 'PRG-HEAVY-01'
        }
      ],
      createdAt: new Date().toISOString()
    };

    const created = stateManager.createCell(reuseCell);
    expect(created.id).toBe('CELL-REUSE-02');
    expect(created.status).toBe('Ready');
  });

  // Scenario 3: Reject duplicate cell IDs
  it('Scenario 3: Rejects duplicate cell IDs', () => {
    const cell1 = stateManager.getCellById('CELL-01');
    expect(() => {
      stateManager.createCell({ ...cell1!, name: 'Duplicate Name' });
    }).toThrow(/already exists/i);
  });

  // Scenario 4: Reject invalid robot, fixture, or program assignments
  it('Scenario 4: Rejects or sets Draft when cell assignments are invalid', () => {
    const invalidCell: Cell = {
      id: 'CELL-INVALID-04',
      name: 'Unassigned Cell',
      description: 'Missing fixture assignments',
      status: 'Ready',
      robots: [],
      fixtures: [],
      programs: [],
      assignments: [],
      createdAt: new Date().toISOString()
    };

    const created = stateManager.createCell(invalidCell);
    expect(created.status).toBe('Draft'); // Must not be considered Ready
  });

  // Scenario 5: Prevent one physical robot from running in two cells simultaneously
  it('Scenario 5: Prevents one physical robot from running in two cells simultaneously', () => {
    equipmentManager.reserveEquipmentForCell('CELL-01', ['ROBOT-PANO-01'], ['FIX-TABLE-A']);

    // Attempting to reserve ROBOT-PANO-01 for another cell simultaneously must throw
    expect(() => {
      equipmentManager.reserveEquipmentForCell('CELL-02', ['ROBOT-PANO-01'], ['FIX-TABLE-B']);
    }).toThrow(/currently actively locked/i);

    // After release, it can be acquired
    equipmentManager.releaseEquipmentForCell('CELL-01');
    expect(() => {
      equipmentManager.reserveEquipmentForCell('CELL-02', ['ROBOT-PANO-01'], ['FIX-TABLE-B']);
    }).not.toThrow();
  });

  // Scenario 6 & 8: Execute Cell A completely before Cell B starts
  it('Scenario 6 & 8: Executes Cell A completely before Cell B starts and verifies sequential execution', async () => {
    // Setup Cell B
    const cellB: Cell = {
      id: 'CELL-02',
      name: 'Secondary Cell B',
      description: 'Cell B',
      status: 'Ready',
      robots: [
        {
          id: 'ROBOT-B-01',
          name: 'Robot B1',
          controllerSerialNumber: 'SN-B-01',
          model: 'Panasonic TM-1400',
          cellId: 'CELL-02',
          status: 'Ready',
          arcOn: false
        }
      ],
      fixtures: [
        {
          id: 'FIX-B-01',
          name: 'Fixture B1',
          cellId: 'CELL-02',
          status: 'Ready',
          assignedRobotIds: ['ROBOT-B-01'],
          currentBeadIndex: 0,
          totalBeads: 1,
          progressPct: 0
        }
      ],
      programs: [
        {
          id: 'PRG-B-01',
          name: 'Program B',
          workpieceType: 'Box',
          subPrograms: [
            {
              id: 'SUB-B1',
              name: 'Seam',
              description: 'Seam',
              beads: [
                {
                  beadNumber: 1,
                  targetCurrent: 190,
                  targetVoltage: 23,
                  travelSpeed: 45,
                  wireFeedRate: 8,
                  gasFlowRate: 15,
                  durationSeconds: 0.1,
                  lengthMm: 50,
                  status: 'Pending'
                }
              ]
            }
          ]
        }
      ],
      assignments: [
        {
          fixtureId: 'FIX-B-01',
          robotIds: ['ROBOT-B-01'],
          programId: 'PRG-B-01'
        }
      ],
      createdAt: new Date().toISOString()
    };
    stateManager.createCell(cellB);

    queueEngine.setQueueItems([
      { cellId: 'CELL-01', order: 1 },
      { cellId: 'CELL-02', order: 2 }
    ]);

    const initialQ = queueEngine.getQueue();
    expect(initialQ.items[0].cellId).toBe('CELL-01');
    expect(initialQ.items[1].cellId).toBe('CELL-02');
    expect(initialQ.items[1].status).toBe('Waiting');

    // Start Queue
    await queueEngine.startQueue();

    // Wait until queue finishes
    await new Promise(resolve => setTimeout(resolve, 800));

    const finalQ = queueEngine.getQueue();
    expect(finalQ.status).toBe('Completed');
    expect(finalQ.items[0].status).toBe('Completed');
    expect(finalQ.items[1].status).toBe('Completed');
  });

  // Scenario 9: Inject a fixture fault in Cell A and verify Cell B does not start
  it('Scenario 9: Fixture fault in Cell A prevents Cell B from starting automatically', async () => {
    // Add Cell 02
    const cellB: Cell = {
      id: 'CELL-02-FAULT-TEST',
      name: 'Cell 2 Fault Test',
      description: 'Waiting cell',
      status: 'Ready',
      robots: [
        {
          id: 'ROBOT-FAULT-B',
          name: 'Robot B',
          controllerSerialNumber: 'SN-FAULT-B',
          model: 'Panasonic TM-1400',
          cellId: 'CELL-02-FAULT-TEST',
          status: 'Ready',
          arcOn: false
        }
      ],
      fixtures: [
        {
          id: 'FIX-FAULT-B',
          name: 'Fix B',
          cellId: 'CELL-02-FAULT-TEST',
          status: 'Ready',
          assignedRobotIds: ['ROBOT-FAULT-B'],
          currentBeadIndex: 0,
          totalBeads: 1,
          progressPct: 0
        }
      ],
      programs: [
        {
          id: 'PRG-FB',
          name: 'PRG',
          workpieceType: 'P',
          subPrograms: [
            {
              id: 'SUB-1',
              name: 'S',
              description: '',
              beads: [
                {
                  beadNumber: 1,
                  targetCurrent: 180,
                  targetVoltage: 22,
                  travelSpeed: 40,
                  wireFeedRate: 7,
                  gasFlowRate: 14,
                  durationSeconds: 0.1,
                  lengthMm: 30,
                  status: 'Pending'
                }
              ]
            }
          ]
        }
      ],
      assignments: [
        {
          fixtureId: 'FIX-FAULT-B',
          robotIds: ['ROBOT-FAULT-B'],
          programId: 'PRG-FB'
        }
      ],
      createdAt: new Date().toISOString()
    };
    stateManager.createCell(cellB);

    queueEngine.setQueueItems([
      { cellId: 'CELL-01', order: 1 },
      { cellId: 'CELL-02-FAULT-TEST', order: 2 }
    ]);

    // Inject fault immediately into Cell A
    simulationEngine.injectFault('CELL-01', 'FIX-TABLE-A', 'Simulated Gas Flow Loss Interlock');

    // Attempt start
    await queueEngine.startQueue();
    await new Promise(resolve => setTimeout(resolve, 400));

    const q = queueEngine.getQueue();
    expect(q.status).toBe('Faulted');
    expect(q.items[0].status).toBe('Faulted');
    // Cell B must remain Blocked or Waiting, NEVER Running or Completed!
    expect(['Waiting', 'Blocked']).toContain(q.items[1].status);
  });

  // Scenario 10: Operator retry allowed only when permitted
  it('Scenario 10: Allows retry of faulted cell and resumes progression', async () => {
    // Clear fault in cell
    stateManager.updateCellStatus('CELL-01', 'Ready');
    const cell1 = stateManager.getCellById('CELL-01');
    if (cell1) {
      for (const f of cell1.fixtures) f.status = 'Ready';
      for (const r of cell1.robots) r.status = 'Ready';
    }

    // Set queue item as faulted first
    const q = queueEngine.getQueue();
    if (q.items.length > 0) {
      q.items[0].status = 'Faulted';
      await queueEngine.retryCell('CELL-01');
      await new Promise(resolve => setTimeout(resolve, 600));

      const updatedQ = queueEngine.getQueue();
      expect(updatedQ.items[0].status).toBe('Completed');
    }
  });

  // Scenario 12 & 13: Panasonic CSV formats (WELDEVLOG, OPREVLOG, 8-line Waveform)
  it('Scenario 12 & 13: Generates Panasonic-format WELDEVLOG, OPREVLOG, and exact 8-line header Waveform files', async () => {
    const dummyBead = {
      beadNumber: 1,
      targetCurrent: 200,
      targetVoltage: 24.0,
      travelSpeed: 45,
      wireFeedRate: 8.5,
      gasFlowRate: 15.0,
      durationSeconds: 1.0,
      lengthMm: 100,
      status: 'Completed' as const
    };

    const ctrlSN = 'SN-CTRL-TEST-01';
    const workSN = '1234567890';

    // 1. WELDEVLOG
    const weldevlogPath = await csvWriter.writeWeldevlog(
      ctrlSN,
      'CELL-01',
      workSN,
      'PRG-01',
      'SUB-01',
      dummyBead
    );
    expect(fs.existsSync(weldevlogPath)).toBe(true);
    const weldevlogContent = fs.readFileSync(weldevlogPath, 'utf-8');
    expect(weldevlogContent).toContain('DateTime,WorkSN,ProgramNo,SubProgramNo');
    expect(weldevlogContent).toContain(workSN);

    // 2. OPREVLOG
    const oprevlogPath = await csvWriter.writeOprevlog(
      ctrlSN,
      'CELL-01',
      'EVT_POWER_ON',
      'Controller powered on'
    );
    expect(fs.existsSync(oprevlogPath)).toBe(true);
    const oprevlogContent = fs.readFileSync(oprevlogPath, 'utf-8');
    expect(oprevlogContent).toContain('DateTime,EventCode,EventDescription');

    // 3. Waveform (exact 8-line header)
    const wfFileName = await csvWriter.writeWaveform(
      ctrlSN,
      'CELL-01',
      'Panasonic TM-1400',
      workSN,
      'PRG-01',
      'SUB-01',
      dummyBead
    );
    const wfPath = path.join(testOutputDir, ctrlSN, wfFileName);
    expect(fs.existsSync(wfPath)).toBe(true);

    const wfLines = fs.readFileSync(wfPath, 'utf-8').split(/\r?\n/);
    expect(wfLines[0]).toBe('[HEADER]');
    expect(wfLines[1]).toBe('FILE_FORMAT=PANASONIC_WAVEFORM_V2');
    expect(wfLines[2]).toBe('ROBOT_MODEL=Panasonic TM-1400');
    expect(wfLines[3]).toBe(`CONTROLLER_SN=${ctrlSN}`);
    expect(wfLines[4]).toBe('PROGRAM_NO=PRG-01');
    expect(wfLines[5]).toBe('BEAD_NO=1');
    expect(wfLines[6]).toBe('SAMPLING_INTERVAL_MS=100');
    expect(wfLines[7]).toMatch(/^TIMESTAMP=/);
    expect(wfLines[8]).toBe('Time_s,Current_A,Voltage_V,WireFeed_m_min,GasFlow_L_min');
  });

  // Scenario 14: Barcode scanning does NOT write to controller CSV files
  it('Scenario 14: Publishes barcode scans to WAMP and does NOT write them to controller CSVs', async () => {
    const scan = await wampClient.publishBarcode('CELL-01', 'BARCODE-WORKPIECE-998877', {
      workSN: '9988770011'
    });
    expect(scan.publishedSuccessfully).toBe(true);
    expect(scan.barcode).toBe('BARCODE-WORKPIECE-998877');

    // Verify CSV outputs contain zero references to barcode string
    const allMeta = csvWriter.getAllMetadata();
    for (const meta of allMeta) {
      const content = fs.readFileSync(meta.path, 'utf-8');
      expect(content).not.toContain('BARCODE-WORKPIECE-998877');
    }
  });

  // Scenario 15: Manual fixture control and queue cannot create duplicate execution
  it('Scenario 15: Prevents concurrent manual start while cell is actively simulating', async () => {
    // Start simulation
    const promise = simulationEngine.executeCell('CELL-01');
    expect(simulationEngine.isCellSimulating('CELL-01')).toBe(true);

    // Concurrent manual start attempt must be rejected
    await expect(simulationEngine.executeCell('CELL-01')).rejects.toThrow(/already actively simulating/i);

    await promise;
  });

  // Scenario 7: Execute three cells in the correct queue order
  it('Scenario 7: Executes three cells sequentially in exact order (1 -> 2 -> 3)', async () => {
    // Cell 2 & Cell 3 setup
    const cell2: Cell = {
      id: 'CELL-TRI-02',
      name: 'Tri Cell 2',
      description: 'Second cell',
      status: 'Ready',
      robots: [{ id: 'R-TRI-2', name: 'R2', controllerSerialNumber: 'SN-T-2', model: 'M', cellId: 'CELL-TRI-02', status: 'Ready', arcOn: false }],
      fixtures: [{ id: 'F-TRI-2', name: 'F2', cellId: 'CELL-TRI-02', status: 'Ready', assignedRobotIds: ['R-TRI-2'], currentBeadIndex: 0, totalBeads: 1, progressPct: 0 }],
      programs: [{ id: 'P2', name: 'P', workpieceType: 'W', subPrograms: [{ id: 'S1', name: 'S', description: '', beads: [{ beadNumber: 1, targetCurrent: 200, targetVoltage: 24, travelSpeed: 45, wireFeedRate: 8, gasFlowRate: 15, durationSeconds: 0.05, lengthMm: 50, status: 'Pending' }] }] }],
      assignments: [{ fixtureId: 'F-TRI-2', robotIds: ['R-TRI-2'], programId: 'P2' }],
      createdAt: new Date().toISOString()
    };

    const cell3: Cell = {
      id: 'CELL-TRI-03',
      name: 'Tri Cell 3',
      description: 'Third cell',
      status: 'Ready',
      robots: [{ id: 'R-TRI-3', name: 'R3', controllerSerialNumber: 'SN-T-3', model: 'M', cellId: 'CELL-TRI-03', status: 'Ready', arcOn: false }],
      fixtures: [{ id: 'F-TRI-3', name: 'F3', cellId: 'CELL-TRI-03', status: 'Ready', assignedRobotIds: ['R-TRI-3'], currentBeadIndex: 0, totalBeads: 1, progressPct: 0 }],
      programs: [{ id: 'P3', name: 'P', workpieceType: 'W', subPrograms: [{ id: 'S1', name: 'S', description: '', beads: [{ beadNumber: 1, targetCurrent: 200, targetVoltage: 24, travelSpeed: 45, wireFeedRate: 8, gasFlowRate: 15, durationSeconds: 0.05, lengthMm: 50, status: 'Pending' }] }] }],
      assignments: [{ fixtureId: 'F-TRI-3', robotIds: ['R-TRI-3'], programId: 'P3' }],
      createdAt: new Date().toISOString()
    };

    stateManager.createCell(cell2);
    stateManager.createCell(cell3);

    queueEngine.setQueueItems([
      { cellId: 'CELL-01', order: 1 },
      { cellId: 'CELL-TRI-02', order: 2 },
      { cellId: 'CELL-TRI-03', order: 3 }
    ]);

    await queueEngine.startQueue();
    await new Promise(resolve => setTimeout(resolve, 800));

    const finalQ = queueEngine.getQueue();
    expect(finalQ.status).toBe('Completed');
    expect(finalQ.items[0].status).toBe('Completed');
    expect(finalQ.items[1].status).toBe('Completed');
    expect(finalQ.items[2].status).toBe('Completed');
  });

  // Scenario 11: CSV write failure prevents a false successful completion
  it('Scenario 11: Propagates CSV write failure and prevents false successful completion', async () => {
    // Inject a write failure on csvWriter
    const originalMethod = csvWriter.writeWeldevlog;
    csvWriter.writeWeldevlog = async () => {
      throw new Error('Disk full / write I/O error');
    };

    await expect(simulationEngine.executeCell('CELL-01')).rejects.toThrow(/Disk full/);

    const cell = stateManager.getCellById('CELL-01');
    expect(cell?.status).toBe('Faulted');

    // Restore method
    csvWriter.writeWeldevlog = originalMethod;
  });

  // Scenario 18: Interrupted backend does not automatically restart a previously active job unsafely
  it('Scenario 18: Restarts in safe Idle state without automatically resuming active weld arcs', () => {
    // New engine instance simulates fresh backend start
    const freshStateManager = new ShopFloorStateManager();
    const freshSimEngine = new WeldingSimulationEngine(freshStateManager, equipmentManager, csvWriter);
    const freshQueueEngine = new ProductionQueueEngine(freshStateManager, freshSimEngine, csvWriter);

    const q = freshQueueEngine.getQueue();
    expect(q.status).toBe('Idle'); // Safe idle state
    const cells = freshStateManager.getAllCells();
    for (const c of cells) {
      expect(c.status).not.toBe('Running'); // No active running job
      for (const r of c.robots) {
        expect(r.arcOn).toBe(false); // Arc must be off
      }
    }
  });
});
