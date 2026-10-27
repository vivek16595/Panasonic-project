import { ProductionQueue, QueueItem, QueueItemStatus, QueueOverallStatus } from '../models/types.js';
import { PanasonicCsvWriter } from './csv-writer.js';
import { WeldingSimulationEngine } from './simulation-engine.js';
import { ShopFloorStateManager } from './state-manager.js';

export interface QueueCallbacks {
  onQueueUpdated?: (queue: ProductionQueue) => void;
  onCellStep?: (data: any) => void;
  onCellFault?: (cellId: string, error: string) => void;
}

export class ProductionQueueEngine {
  private queue: ProductionQueue = {
    id: 'DEFAULT-QUEUE',
    name: 'Main Shop-Floor Sequential Queue',
    status: 'Idle',
    items: [],
    currentItemIndex: -1
  };

  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private callbacks: QueueCallbacks = {};

  constructor(
    private stateManager: ShopFloorStateManager,
    private simulationEngine: WeldingSimulationEngine,
    private csvWriter: PanasonicCsvWriter
  ) {
    this.seedDefaultQueue();
  }

  private seedDefaultQueue() {
    const cell1 = this.stateManager.getCellById('CELL-01');
    if (cell1) {
      this.queue.items.push({
        queueItemId: `ITEM-${Date.now()}-1`,
        cellId: cell1.id,
        cellName: cell1.name,
        order: 1,
        status: 'Ready',
        csvStatus: 'Pending',
        generatedCsvFiles: [],
        workpieceSerialNumbers: []
      });
    }
  }

  public setCallbacks(callbacks: QueueCallbacks) {
    this.callbacks = callbacks;
  }

  public getQueue(): ProductionQueue {
    return { ...this.queue, items: [...this.queue.items] };
  }

  public setQueueItems(items: Array<{ cellId: string; order: number }>): ProductionQueue {
    if (this.queue.status === 'Running') {
      throw new Error('Cannot reorder or modify queue while it is actively executing.');
    }

    const newItems: QueueItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const { cellId, order } = items[i];
      const cell = this.stateManager.getCellById(cellId);
      if (!cell) {
        throw new Error(`Cell '${cellId}' not found.`);
      }

      const isReady = this.stateManager.validateCellReadiness(cell);
      newItems.push({
        queueItemId: `ITEM-${Date.now()}-${i + 1}`,
        cellId: cell.id,
        cellName: cell.name,
        order: order || i + 1,
        status: isReady ? (i === 0 ? 'Ready' : 'Waiting') : 'Waiting',
        csvStatus: 'Pending',
        generatedCsvFiles: [],
        workpieceSerialNumbers: []
      });
    }

    // Sort by order
    newItems.sort((a, b) => a.order - b.order);
    this.queue.items = newItems;
    this.queue.status = 'Idle';
    this.queue.currentItemIndex = -1;

    this.notifyUpdate();
    return this.getQueue();
  }

  public addCellToQueue(cellId: string): ProductionQueue {
    if (this.queue.status === 'Running') {
      throw new Error('Cannot add cells while queue is running.');
    }

    const cell = this.stateManager.getCellById(cellId);
    if (!cell) {
      throw new Error(`Cell '${cellId}' not found.`);
    }

    // Check if cell is already in queue
    const exists = this.queue.items.some(it => it.cellId === cellId && it.status !== 'Completed');
    if (exists) {
      throw new Error(`Cell '${cell.name}' is already in the production queue.`);
    }

    const nextOrder = this.queue.items.length + 1;
    const isReady = this.stateManager.validateCellReadiness(cell);

    this.queue.items.push({
      queueItemId: `ITEM-${Date.now()}-${nextOrder}`,
      cellId: cell.id,
      cellName: cell.name,
      order: nextOrder,
      status: this.queue.items.length === 0 && isReady ? 'Ready' : 'Waiting',
      csvStatus: 'Pending',
      generatedCsvFiles: [],
      workpieceSerialNumbers: []
    });

    this.notifyUpdate();
    return this.getQueue();
  }

  public reorderItems(orderedItemIds: string[]): ProductionQueue {
    if (this.queue.status === 'Running') {
      throw new Error('Cannot reorder queue while it is running.');
    }

    const reordered: QueueItem[] = [];
    for (let i = 0; i < orderedItemIds.length; i++) {
      const item = this.queue.items.find(it => it.queueItemId === orderedItemIds[i]);
      if (item) {
        item.order = i + 1;
        item.status = (i === 0 && item.status !== 'Completed') ? 'Ready' : 'Waiting';
        reordered.push(item);
      }
    }

    this.queue.items = reordered;
    this.notifyUpdate();
    return this.getQueue();
  }

  /**
   * Starts sequential queue execution.
   */
  public async startQueue(): Promise<ProductionQueue> {
    if (this.queue.status === 'Running') {
      return this.getQueue(); // Idempotent: Ignore duplicate start
    }

    if (this.queue.items.length === 0) {
      throw new Error('Production queue is empty.');
    }

    this.queue.status = 'Running';
    this.queue.startedAt = this.queue.startedAt || new Date().toISOString();
    this.isPaused = false;
    this.notifyUpdate();

    // Trigger sequential loop in background
    if (!this.isProcessing) {
      this.processQueueLoop().catch(err => {
        this.queue.status = 'Faulted';
        this.notifyUpdate();
      });
    }

    return this.getQueue();
  }

  public pauseQueue(): ProductionQueue {
    if (this.queue.status !== 'Running') {
      return this.getQueue();
    }
    this.isPaused = true;
    this.queue.status = 'Paused';
    this.notifyUpdate();
    return this.getQueue();
  }

  public resumeQueue(): ProductionQueue {
    if (this.queue.status !== 'Paused') {
      return this.getQueue();
    }
    this.isPaused = false;
    this.queue.status = 'Running';
    this.notifyUpdate();

    if (!this.isProcessing) {
      this.processQueueLoop().catch(() => {});
    }
    return this.getQueue();
  }

  public stopQueue(): ProductionQueue {
    this.isPaused = false;
    this.queue.status = 'Stopped';

    // Stop current active cell simulation safely
    if (this.queue.currentItemIndex >= 0 && this.queue.currentItemIndex < this.queue.items.length) {
      const currentItem = this.queue.items[this.queue.currentItemIndex];
      if (currentItem.status === 'Running') {
        this.simulationEngine.stopCell(currentItem.cellId);
        currentItem.status = 'Stopped';
        currentItem.completedAt = new Date().toISOString();
      }
    }

    this.notifyUpdate();
    return this.getQueue();
  }

  public async retryCell(cellId: string): Promise<ProductionQueue> {
    const item = this.queue.items.find(it => it.cellId === cellId && it.status === 'Faulted');
    if (!item) {
      throw new Error(`Cell '${cellId}' is not in a Faulted state in the queue.`);
    }

    item.status = 'Ready';
    item.error = undefined;
    item.csvStatus = 'Pending';
    this.queue.status = 'Running';
    this.isPaused = false;
    this.notifyUpdate();

    if (!this.isProcessing) {
      this.processQueueLoop().catch(() => {});
    }

    return this.getQueue();
  }

  private async processQueueLoop(): Promise<void> {
    this.isProcessing = true;

    try {
      while (this.queue.status === 'Running' && !this.isPaused) {
        // Find next item to run: either Ready or first Waiting
        let nextIndex = this.queue.items.findIndex(it => it.status === 'Running');
        if (nextIndex === -1) {
          nextIndex = this.queue.items.findIndex(it => it.status === 'Ready');
        }
        if (nextIndex === -1) {
          nextIndex = this.queue.items.findIndex(it => it.status === 'Waiting');
        }

        // All items completed or no executable items
        if (nextIndex === -1) {
          const hasFaulted = this.queue.items.some(it => it.status === 'Faulted');
          this.queue.status = hasFaulted ? 'Faulted' : 'Completed';
          this.queue.completedAt = new Date().toISOString();
          this.notifyUpdate();
          break;
        }

        this.queue.currentItemIndex = nextIndex;
        const currentItem = this.queue.items[nextIndex];

        // Mark remaining waiting items as Blocked / Waiting
        for (let j = nextIndex + 1; j < this.queue.items.length; j++) {
          if (this.queue.items[j].status !== 'Completed' && this.queue.items[j].status !== 'Faulted') {
            this.queue.items[j].status = 'Waiting';
          }
        }

        currentItem.status = 'Running';
        currentItem.startedAt = new Date().toISOString();
        currentItem.csvStatus = 'Writing';
        this.notifyUpdate();

        try {
          // Execute cell simulation to authoritative completion
          await this.simulationEngine.executeCell(currentItem.cellId, {
            onStep: (step) => this.callbacks.onCellStep?.(step)
          });

          // Verify authoritative completion & CSV generation
          const cellCsvs = this.csvWriter.getMetadataByCell(currentItem.cellId);
          currentItem.generatedCsvFiles = cellCsvs.map(c => c.fileName);
          currentItem.csvStatus = 'Completed';
          currentItem.status = 'Completed';
          currentItem.completedAt = new Date().toISOString();

          // Prepare next item as Ready
          if (nextIndex + 1 < this.queue.items.length) {
            this.queue.items[nextIndex + 1].status = 'Ready';
          }

          this.notifyUpdate();
        } catch (cellErr: any) {
          // Cell faulted!
          const errMsg = cellErr.message || 'Execution error';
          currentItem.status = 'Faulted';
          currentItem.error = errMsg;
          currentItem.csvStatus = 'Failed';
          currentItem.completedAt = new Date().toISOString();

          // Block subsequent cells
          for (let k = nextIndex + 1; k < this.queue.items.length; k++) {
            this.queue.items[k].status = 'Blocked';
          }

          this.queue.status = 'Faulted';
          this.callbacks.onCellFault?.(currentItem.cellId, errMsg);
          this.notifyUpdate();
          break; // Stop queue: Do NOT automatically start next cell!
        }

        if (this.isPaused) {
          this.queue.status = 'Paused';
          this.notifyUpdate();
          break;
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private notifyUpdate() {
    this.callbacks.onQueueUpdated?.(this.getQueue());
  }
}
