import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { CsvFileMetadata, WeldBead } from '../models/types.js';

export class PanasonicCsvWriter {
  private outputBaseDir: string;
  private fileMetadataStore: CsvFileMetadata[] = [];

  constructor(outputDir?: string) {
    this.outputBaseDir = outputDir || config.csvOutputDir;
    this.ensureDirectory(this.outputBaseDir);
    this.scanExistingFilesFromDisk();
  }

  private scanExistingFilesFromDisk() {
    try {
      if (!fs.existsSync(this.outputBaseDir)) return;
      const controllerDirs = fs.readdirSync(this.outputBaseDir, { withFileTypes: true });
      for (const cDir of controllerDirs) {
        if (!cDir.isDirectory()) continue;
        const controllerSN = cDir.name;
        const cPath = path.join(this.outputBaseDir, controllerSN);
        const files = fs.readdirSync(cPath);
        for (const fileName of files) {
          if (!fileName.endsWith('.csv')) continue;
          const fullPath = path.join(cPath, fileName);
          const stats = fs.statSync(fullPath);
          let fileType: 'WELDEVLOG' | 'OPREVLOG' | 'WAVEFORM' = 'WAVEFORM';
          if (fileName.includes('WELDEVLOG')) fileType = 'WELDEVLOG';
          else if (fileName.includes('OPREVLOG')) fileType = 'OPREVLOG';

          this.recordFileMetadata({
            id: `${controllerSN}-${fileName}`,
            fileName,
            fileType,
            controllerSN,
            cellId: 'CELL-01',
            createdAt: stats.mtime.toISOString(),
            path: fullPath,
            sizeBytes: stats.size
          });
        }
      }
    } catch (err) {
      // Ignore scan errors on fresh empty startup
    }
  }

  private ensureDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private formatDateForFileName(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  private formatTimestamp(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
  }

  /**
   * Appends a record to the daily WELDEVLOG for the specified controller.
   * File format: YYYYMMDDWELDEVLOG00.csv
   */
  public async writeWeldevlog(
    controllerSN: string,
    cellId: string,
    workSN: string,
    programNo: string,
    subProgramNo: string,
    bead: WeldBead,
    status: 'OK' | 'FAULT' = 'OK',
    errorCode: string = '0000'
  ): Promise<string> {
    const now = new Date();
    const dateStr = this.formatDateForFileName(now);
    const fileName = `${dateStr}WELDEVLOG00.csv`;
    const controllerDir = path.join(this.outputBaseDir, controllerSN);
    this.ensureDirectory(controllerDir);

    const filePath = path.join(controllerDir, fileName);
    const isNew = !fs.existsSync(filePath);

    // Standard Panasonic Weldevlog Header
    const header = 'DateTime,WorkSN,ProgramNo,SubProgramNo,BeadNo,ArcTimeSec,AvgCurrentA,AvgVoltageV,WireSpeedMPerMin,GasFlowLPerMin,Status,ErrorCode\r\n';

    const avgCurrent = bead.actualCurrent ?? bead.targetCurrent;
    const avgVoltage = bead.actualVoltage ?? bead.targetVoltage;
    const wireSpeed = bead.wireFeedRate;
    const gasFlow = bead.gasFlowRate;
    const arcTime = bead.durationSeconds.toFixed(2);

    const row = `${now.toISOString()},${workSN},${programNo},${subProgramNo},${bead.beadNumber},${arcTime},${avgCurrent.toFixed(1)},${avgVoltage.toFixed(1)},${wireSpeed.toFixed(1)},${gasFlow.toFixed(1)},${status},${errorCode}\r\n`;

    if (isNew) {
      await fs.promises.writeFile(filePath, header + row, 'utf-8');
    } else {
      await fs.promises.appendFile(filePath, row, 'utf-8');
    }

    const stats = await fs.promises.stat(filePath);
    this.recordFileMetadata({
      id: `${controllerSN}-${fileName}`,
      fileName,
      fileType: 'WELDEVLOG',
      controllerSN,
      cellId,
      workSN,
      beadNumber: bead.beadNumber,
      createdAt: now.toISOString(),
      path: filePath,
      sizeBytes: stats.size
    });

    return filePath;
  }

  /**
   * Appends an event to the daily OPREVLOG for the specified controller.
   * File format: YYYYMMDDOPREVLOG00.csv
   */
  public async writeOprevlog(
    controllerSN: string,
    cellId: string,
    eventCode: string,
    eventDescription: string,
    details: string = '',
    operatorId: string = 'AUTO_OP_01'
  ): Promise<string> {
    const now = new Date();
    const dateStr = this.formatDateForFileName(now);
    const fileName = `${dateStr}OPREVLOG00.csv`;
    const controllerDir = path.join(this.outputBaseDir, controllerSN);
    this.ensureDirectory(controllerDir);

    const filePath = path.join(controllerDir, fileName);
    const isNew = !fs.existsSync(filePath);

    // Standard Panasonic Operational Event Log Header
    const header = 'DateTime,EventCode,EventDescription,OperatorId,Details\r\n';
    const row = `${now.toISOString()},${eventCode},"${eventDescription}",${operatorId},"${details.replace(/"/g, '""')}"\r\n`;

    if (isNew) {
      await fs.promises.writeFile(filePath, header + row, 'utf-8');
    } else {
      await fs.promises.appendFile(filePath, row, 'utf-8');
    }

    const stats = await fs.promises.stat(filePath);
    this.recordFileMetadata({
      id: `${controllerSN}-${fileName}`,
      fileName,
      fileType: 'OPREVLOG',
      controllerSN,
      cellId,
      createdAt: now.toISOString(),
      path: filePath,
      sizeBytes: stats.size
    });

    return filePath;
  }

  /**
   * Generates a Panasonic-format Waveform file for a completed bead.
   * File format: W<10-digit WorkSN><YYYYMMDDHHMMSS>.csv
   * Header: Exactly 8 lines
   * Sampling: 100 ms physical intervals
   */
  public async writeWaveform(
    controllerSN: string,
    cellId: string,
    robotModel: string,
    workSN: string,
    programNo: string,
    subProgramNo: string,
    bead: WeldBead
  ): Promise<string> {
    const now = new Date();
    const tsStr = this.formatTimestamp(now);
    // 10-digit WorkSN padded if needed
    const paddedWorkSN = workSN.padStart(10, '0').slice(-10);
    const fileName = `W${paddedWorkSN}${tsStr}.csv`;
    const controllerDir = path.join(this.outputBaseDir, controllerSN);
    this.ensureDirectory(controllerDir);

    const filePath = path.join(controllerDir, fileName);

    // EXACT 8-line Panasonic controller header:
    const headerLines = [
      '[HEADER]',
      'FILE_FORMAT=PANASONIC_WAVEFORM_V2',
      `ROBOT_MODEL=${robotModel}`,
      `CONTROLLER_SN=${controllerSN}`,
      `PROGRAM_NO=${programNo}`,
      `BEAD_NO=${bead.beadNumber}`,
      'SAMPLING_INTERVAL_MS=100',
      `TIMESTAMP=${now.toISOString()}`
    ];

    // Data table header
    const dataHeader = 'Time_s,Current_A,Voltage_V,WireFeed_m_min,GasFlow_L_min';

    // Generate 100 ms time-series points
    const rows: string[] = [];
    const totalSamples = Math.max(10, Math.round((bead.durationSeconds * 1000) / 100));

    const baseCurrent = bead.actualCurrent ?? bead.targetCurrent;
    const baseVoltage = bead.actualVoltage ?? bead.targetVoltage;
    const baseWire = bead.wireFeedRate;
    const baseGas = bead.gasFlowRate;

    for (let i = 0; i <= totalSamples; i++) {
      const timeS = (i * 0.1).toFixed(2);
      // Realistic minor physical fluctuations
      const noiseI = (Math.sin(i * 0.5) * 2.2) + ((Math.random() - 0.5) * 1.5);
      const noiseV = (Math.cos(i * 0.5) * 0.4) + ((Math.random() - 0.5) * 0.3);
      const cur = Math.max(0, baseCurrent + noiseI).toFixed(1);
      const volt = Math.max(0, baseVoltage + noiseV).toFixed(1);
      const wire = Math.max(0, baseWire + (Math.random() - 0.5) * 0.2).toFixed(1);
      const gas = Math.max(0, baseGas + (Math.random() - 0.5) * 0.1).toFixed(1);

      rows.push(`${timeS},${cur},${volt},${wire},${gas}`);
    }

    const fileContent = [...headerLines, dataHeader, ...rows].join('\r\n') + '\r\n';
    await fs.promises.writeFile(filePath, fileContent, 'utf-8');

    const stats = await fs.promises.stat(filePath);
    this.recordFileMetadata({
      id: `${controllerSN}-${fileName}`,
      fileName,
      fileType: 'WAVEFORM',
      controllerSN,
      cellId,
      workSN: paddedWorkSN,
      beadNumber: bead.beadNumber,
      createdAt: now.toISOString(),
      path: filePath,
      sizeBytes: stats.size,
      previewRows: rows.slice(0, 10)
    });

    return fileName;
  }

  private recordFileMetadata(meta: CsvFileMetadata) {
    const existingIdx = this.fileMetadataStore.findIndex(f => f.id === meta.id);
    if (existingIdx >= 0) {
      this.fileMetadataStore[existingIdx] = meta;
    } else {
      this.fileMetadataStore.unshift(meta);
    }
  }

  public getAllMetadata(): CsvFileMetadata[] {
    return [...this.fileMetadataStore];
  }

  public getMetadataByCell(cellId: string): CsvFileMetadata[] {
    return this.fileMetadataStore.filter(f => f.cellId === cellId);
  }

  public getMetadataByController(controllerSN: string): CsvFileMetadata[] {
    return this.fileMetadataStore.filter(f => f.controllerSN === controllerSN);
  }

  public async getFileContent(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.promises.readFile(filePath, 'utf-8');
  }
}
