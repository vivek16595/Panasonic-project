import { EquipmentRegistryItem, Robot, Fixture } from '../models/types.js';

export class EquipmentManager {
  private registry: Map<string, EquipmentRegistryItem> = new Map();
  // Tracks active execution lock by equipmentId -> cellId
  private activeLocks: Map<string, string> = new Map();

  constructor() {
    this.seedDefaultEquipment();
  }

  private seedDefaultEquipment() {
    // Seed initial physical equipment pool for easy testing and reuse
    const defaultRobots: EquipmentRegistryItem[] = [
      {
        id: 'ROBOT-PANO-01',
        type: 'robot',
        name: 'Panasonic TM-1400 Master',
        model: 'Panasonic TM-1400',
        controllerSerialNumber: 'SN-CTRL-98421',
        currentCellId: 'CELL-01',
        availability: 'Available'
      },
      {
        id: 'ROBOT-PANO-02',
        type: 'robot',
        name: 'Panasonic TM-1400 Slave',
        model: 'Panasonic TM-1400',
        controllerSerialNumber: 'SN-CTRL-98422',
        currentCellId: 'CELL-01',
        availability: 'Available'
      },
      {
        id: 'ROBOT-PANO-03',
        type: 'robot',
        name: 'Panasonic TL-1800 Heavy',
        model: 'Panasonic TL-1800',
        controllerSerialNumber: 'SN-CTRL-98501',
        currentCellId: null,
        availability: 'Available'
      },
      {
        id: 'ROBOT-PANO-04',
        type: 'robot',
        name: 'Panasonic TL-1800 Secondary',
        model: 'Panasonic TL-1800',
        controllerSerialNumber: 'SN-CTRL-98502',
        currentCellId: null,
        availability: 'Available'
      }
    ];

    const defaultFixtures: EquipmentRegistryItem[] = [
      {
        id: 'FIX-TABLE-A',
        type: 'fixture',
        name: 'Dual Rotary Table Station A',
        model: 'Panasonic Positioner RJR-500',
        currentCellId: 'CELL-01',
        availability: 'Available'
      },
      {
        id: 'FIX-TABLE-B',
        type: 'fixture',
        name: 'Dual Rotary Table Station B',
        model: 'Panasonic Positioner RJR-500',
        currentCellId: 'CELL-01',
        availability: 'Available'
      },
      {
        id: 'FIX-HEAVY-01',
        type: 'fixture',
        name: 'Chassis Clamping Table Alpha',
        model: 'Heavy Duty Indexer HD-1000',
        currentCellId: null,
        availability: 'Available'
      },
      {
        id: 'FIX-HEAVY-02',
        type: 'fixture',
        name: 'Chassis Clamping Table Beta',
        model: 'Heavy Duty Indexer HD-1000',
        currentCellId: null,
        availability: 'Available'
      }
    ];

    for (const item of [...defaultRobots, ...defaultFixtures]) {
      this.registry.set(item.id, item);
    }
  }

  public getAllEquipment(): EquipmentRegistryItem[] {
    return Array.from(this.registry.values()).map(item => {
      const activeCellId = this.activeLocks.get(item.id);
      return {
        ...item,
        availability: activeCellId ? 'InUse' : item.availability
      };
    });
  }

  public getEquipmentById(id: string): EquipmentRegistryItem | undefined {
    const item = this.registry.get(id);
    if (!item) return undefined;
    const activeCellId = this.activeLocks.get(item.id);
    return {
      ...item,
      availability: activeCellId ? 'InUse' : item.availability
    };
  }

  public registerEquipment(item: EquipmentRegistryItem): void {
    if (this.registry.has(item.id)) {
      throw new Error(`Equipment with ID '${item.id}' already exists in registry.`);
    }

    if (item.type === 'robot' && item.controllerSerialNumber) {
      const duplicateSerial = Array.from(this.registry.values()).find(
        r => r.type === 'robot' && r.controllerSerialNumber === item.controllerSerialNumber
      );
      if (duplicateSerial) {
        throw new Error(
          `Controller serial number '${item.controllerSerialNumber}' is already in use by '${duplicateSerial.name}' (${duplicateSerial.id}).`
        );
      }
    }

    this.registry.set(item.id, {
      ...item,
      availability: 'Available'
    });
  }

  /**
   * Reserving equipment for cell execution.
   * Throws if any robot or fixture is already locked / in use by another cell.
   */
  public reserveEquipmentForCell(cellId: string, robotIds: string[], fixtureIds: string[]): void {
    const allIds = [...robotIds, ...fixtureIds];

    // Check if any item is currently locked by a DIFFERENT cell
    for (const eqId of allIds) {
      const activeCell = this.activeLocks.get(eqId);
      if (activeCell && activeCell !== cellId) {
        const item = this.registry.get(eqId);
        throw new Error(
          `Equipment '${item?.name || eqId}' is currently actively locked by Cell '${activeCell}'. Cannot execute simultaneously.`
        );
      }

      const item = this.registry.get(eqId);
      if (item && item.availability === 'Faulted') {
        throw new Error(`Equipment '${item.name}' is currently in Faulted state.`);
      }
    }

    // Acquire lock
    for (const eqId of allIds) {
      this.activeLocks.set(eqId, cellId);
      const item = this.registry.get(eqId);
      if (item) {
        item.availability = 'InUse';
      }
    }
  }

  /**
   * Releases locks when a cell completes, faults, or stops.
   */
  public releaseEquipmentForCell(cellId: string): void {
    for (const [eqId, lockedByCell] of Array.from(this.activeLocks.entries())) {
      if (lockedByCell === cellId) {
        this.activeLocks.delete(eqId);
        const item = this.registry.get(eqId);
        if (item && item.availability === 'InUse') {
          item.availability = 'Available';
        }
      }
    }
  }

  public isEquipmentInUse(eqId: string): boolean {
    return this.activeLocks.has(eqId);
  }

  public getLockedCell(eqId: string): string | undefined {
    return this.activeLocks.get(eqId);
  }

  public setEquipmentStatus(eqId: string, status: 'Available' | 'Reserved' | 'InUse' | 'Faulted'): void {
    const item = this.registry.get(eqId);
    if (item) {
      item.availability = status;
    }
  }
}
