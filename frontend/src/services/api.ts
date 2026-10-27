import { Cell, EquipmentRegistryItem, ProductionQueue, CsvFileMetadata, BarcodeScanRecord, ProductionHistoryRecord, EventLog } from '../types';

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? `http://${window.location.hostname || '127.0.0.1'}:3001/api`
  : '/api';

export const api = {
  // Cells
  async getCells(): Promise<Cell[]> {
    const res = await fetch(`${API_BASE}/cells`);
    return res.json();
  },

  async getCell(cellId: string): Promise<Cell> {
    const res = await fetch(`${API_BASE}/cells/${cellId}`);
    return res.json();
  },

  async createCell(cell: Partial<Cell>): Promise<Cell> {
    const res = await fetch(`${API_BASE}/cells`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cell)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create cell');
    }
    return res.json();
  },

  async updateCell(cellId: string, updates: Partial<Cell>): Promise<Cell> {
    const res = await fetch(`${API_BASE}/cells/${cellId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update cell');
    }
    return res.json();
  },

  async deleteCell(cellId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/cells/${cellId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete cell');
    }
    return res.json();
  },

  async startManualWeld(cellId: string, fixtureId?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/cells/${cellId}/manual-start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixtureId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start manual weld');
    }
    return res.json();
  },

  async stopCell(cellId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/cells/${cellId}/stop`, { method: 'POST' });
    return res.json();
  },

  async injectFault(cellId: string, fixtureId?: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/cells/${cellId}/fault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fixtureId, reason })
    });
    return res.json();
  },

  // Equipment
  async getEquipment(): Promise<EquipmentRegistryItem[]> {
    const res = await fetch(`${API_BASE}/equipment`);
    return res.json();
  },

  async getEquipmentAvailability(): Promise<any> {
    const res = await fetch(`${API_BASE}/equipment/availability`);
    return res.json();
  },

  async registerEquipment(item: EquipmentRegistryItem): Promise<EquipmentRegistryItem> {
    const res = await fetch(`${API_BASE}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register equipment');
    }
    return res.json();
  },

  // Production Queue
  async getQueue(): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues`);
    return res.json();
  },

  async addCellToQueue(cellId: string): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues/add-cell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cellId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add cell to queue');
    }
    return res.json();
  },

  async reorderQueue(orderedItemIds: string[]): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedItemIds })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reorder queue');
    }
    return res.json();
  },

  async startQueue(): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues/start`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start queue');
    }
    return res.json();
  },

  async pauseQueue(): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues/pause`, { method: 'POST' });
    return res.json();
  },

  async resumeQueue(): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues/resume`, { method: 'POST' });
    return res.json();
  },

  async stopQueue(): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues/stop`, { method: 'POST' });
    return res.json();
  },

  async retryCell(cellId: string): Promise<ProductionQueue> {
    const res = await fetch(`${API_BASE}/production/queues/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cellId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to retry cell');
    }
    return res.json();
  },

  // CSV
  async getCsvFiles(cellId?: string, controllerSN?: string): Promise<CsvFileMetadata[]> {
    const query = new URLSearchParams();
    if (cellId) query.set('cellId', cellId);
    if (controllerSN) query.set('controllerSN', controllerSN);
    const res = await fetch(`${API_BASE}/csv-output?${query.toString()}`);
    return res.json();
  },

  async getCsvFileContent(path: string): Promise<{ content: string }> {
    const res = await fetch(`${API_BASE}/csv-output/content?path=${encodeURIComponent(path)}`);
    return res.json();
  },

  // Barcode
  async scanBarcode(cellId: string, barcode: string): Promise<BarcodeScanRecord> {
    const res = await fetch(`${API_BASE}/barcode/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cellId, barcode })
    });
    return res.json();
  },

  async getBarcodeHistory(): Promise<BarcodeScanRecord[]> {
    const res = await fetch(`${API_BASE}/barcode/history`);
    return res.json();
  },

  // Traceability & History
  async getProductionHistory(): Promise<ProductionHistoryRecord[]> {
    const res = await fetch(`${API_BASE}/production/history`);
    return res.json();
  },

  async getEvents(): Promise<EventLog[]> {
    const res = await fetch(`${API_BASE}/events`);
    return res.json();
  },

  async getTraceability(workSN: string): Promise<any> {
    const res = await fetch(`${API_BASE}/traceability/${workSN}`);
    return res.json();
  }
};
