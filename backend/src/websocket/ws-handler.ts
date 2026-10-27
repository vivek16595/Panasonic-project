import { WebSocket } from 'ws';
import { WebSocketMessage } from '../models/types.js';
import { EquipmentManager } from '../services/equipment-manager.js';
import { ProductionQueueEngine } from '../services/queue-engine.js';
import { ShopFloorStateManager } from '../services/state-manager.js';
import { PanasonicCsvWriter } from '../services/csv-writer.js';

export class WebSocketHandler {
  private clients: Set<WebSocket> = new Set();

  constructor(
    private stateManager: ShopFloorStateManager,
    private queueEngine: ProductionQueueEngine,
    private equipmentManager: EquipmentManager,
    private csvWriter: PanasonicCsvWriter
  ) {}

  public handleConnection(ws: WebSocket) {
    this.clients.add(ws);

    // Send full authoritative snapshot immediately
    this.sendSnapshot(ws);

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', () => {
      this.clients.delete(ws);
    });
  }

  public sendSnapshot(ws: WebSocket) {
    if (ws.readyState !== WebSocket.OPEN) return;

    const snapshot = {
      cells: this.stateManager.getAllCells(),
      queue: this.queueEngine.getQueue(),
      equipment: this.equipmentManager.getAllEquipment(),
      events: this.stateManager.getEvents(),
      csvFiles: this.csvWriter.getAllMetadata()
    };

    const msg: WebSocketMessage = {
      type: 'SNAPSHOT',
      payload: snapshot,
      timestamp: new Date().toISOString()
    };

    ws.send(JSON.stringify(msg));
  }

  public broadcast(type: WebSocketMessage['type'], payload: any) {
    const msg: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    const data = JSON.stringify(msg);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}
