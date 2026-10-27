/**
 * Domain Models for Welding Shop-Floor Simulator
 * Hierarchy: Cell -> Robots -> Fixtures -> Programs -> Sub-programs -> Beads
 */

export type EntityStatus = 'Draft' | 'Idle' | 'Ready' | 'Queued' | 'Running' | 'Completed' | 'Faulted' | 'Stopped';
export type QueueItemStatus = 'Waiting' | 'Ready' | 'Running' | 'Completed' | 'Faulted' | 'Blocked' | 'Stopped';
export type QueueOverallStatus = 'Idle' | 'Running' | 'Paused' | 'Completed' | 'Faulted' | 'Stopped';
export type CsvWriteStatus = 'Pending' | 'Writing' | 'Completed' | 'Failed';

export interface WeldBead {
  beadNumber: number;
  targetCurrent: number;       // Amperes (e.g., 200 A)
  targetVoltage: number;       // Volts (e.g., 24.5 V)
  travelSpeed: number;         // cm/min (e.g., 45 cm/min)
  wireFeedRate: number;        // m/min (e.g., 8.5 m/min)
  gasFlowRate: number;         // L/min (e.g., 15.0 L/min)
  durationSeconds: number;     // e.g., 3.0 s
  lengthMm: number;            // e.g., 150 mm
  status: 'Pending' | 'Welding' | 'Completed' | 'Faulted';
  actualCurrent?: number;
  actualVoltage?: number;
  actualTravelSpeed?: number;
  waveformFile?: string;
}

export interface WeldSubProgram {
  id: string;
  name: string;
  description: string;
  beads: WeldBead[];
}

export interface WeldingProgram {
  id: string;
  name: string;
  workpieceType: string;
  subPrograms: WeldSubProgram[];
}

export interface FixtureAssignment {
  fixtureId: string;
  robotIds: string[];
  programId: string;
}

export interface Robot {
  id: string;
  name: string;
  controllerSerialNumber: string; // e.g. "SN-CTRL-98421"
  model: string;                  // e.g. "Panasonic TM-1400"
  cellId: string | null;
  status: EntityStatus;
  currentFixtureId?: string | null;
  currentBead?: number;
  arcOn: boolean;
  faultMessage?: string;
  liveTelemetry?: {
    current: number;
    voltage: number;
    wireFeed: number;
    gasFlow: number;
    motorTorque: number;
    temperature: number;
  };
}

export interface Fixture {
  id: string;
  name: string;
  cellId: string | null;
  status: EntityStatus;
  assignedRobotIds: string[];
  currentProgramId?: string;
  currentSubProgramId?: string;
  currentBeadIndex: number;
  totalBeads: number;
  progressPct: number;
  faultMessage?: string;
  currentJobWorkSN?: string; // 10-digit workpiece serial number
}

export interface Cell {
  id: string;
  name: string;
  description: string;
  status: EntityStatus;
  robots: Robot[];
  fixtures: Fixture[];
  programs: WeldingProgram[];
  assignments: FixtureAssignment[];
  createdAt: string;
  lastRunAt?: string;
  faultMessage?: string;
}

export interface EquipmentRegistryItem {
  id: string;
  type: 'robot' | 'fixture';
  name: string;
  model?: string;
  controllerSerialNumber?: string; // for robots
  currentCellId: string | null;
  availability: 'Available' | 'Reserved' | 'InUse' | 'Faulted';
  assignedToCellName?: string;
}

export interface QueueItem {
  queueItemId: string;
  cellId: string;
  cellName: string;
  order: number;
  status: QueueItemStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  csvStatus: CsvWriteStatus;
  generatedCsvFiles: string[];
  workpieceSerialNumbers: string[];
}

export interface ProductionQueue {
  id: string;
  name: string;
  status: QueueOverallStatus;
  items: QueueItem[];
  currentItemIndex: number;
  startedAt?: string;
  completedAt?: string;
}

export interface CsvFileMetadata {
  id: string;
  fileName: string;
  fileType: 'WELDEVLOG' | 'OPREVLOG' | 'WAVEFORM';
  controllerSN: string;
  cellId: string;
  workSN?: string;
  beadNumber?: number;
  createdAt: string;
  path: string;
  sizeBytes: number;
  previewRows?: string[];
}

export interface BarcodeScanRecord {
  id: string;
  cellId: string;
  barcode: string;
  scannedAt: string;
  publishedSuccessfully: boolean;
  associatedWorkSN?: string;
  productionQueueId?: string;
}

export interface ProductionHistoryRecord {
  id: string;
  queueId?: string;
  cellId: string;
  cellName: string;
  status: 'Completed' | 'Faulted' | 'Stopped';
  startedAt: string;
  completedAt: string;
  totalBeads: number;
  completedBeads: number;
  workpieceSerials: string[];
  csvFilesCount: number;
  faultReason?: string;
}

export interface WebSocketMessage {
  type: 
    | 'SNAPSHOT'
    | 'CELL_UPDATED'
    | 'FIXTURE_UPDATED'
    | 'ROBOT_UPDATED'
    | 'QUEUE_UPDATED'
    | 'SIMULATION_STEP'
    | 'CSV_GENERATED'
    | 'FAULT_INJECTED'
    | 'FAULT_CLEARED'
    | 'BARCODE_SCANNED';
  payload: any;
  timestamp: string;
}
