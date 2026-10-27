import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Cell, EquipmentRegistryItem, ProductionQueue, CsvFileMetadata, EventLog } from '../types';
import { api } from '../services/api';

interface ShopFloorContextType {
  cells: Cell[];
  queue: ProductionQueue | null;
  equipment: EquipmentRegistryItem[];
  events: EventLog[];
  csvFiles: CsvFileMetadata[];
  isConnected: boolean;
  activeCell: Cell | null;
  refreshAll: () => Promise<void>;
  selectCell: (cellId: string) => void;
}

const ShopFloorContext = createContext<ShopFloorContextType | undefined>(undefined);

export const ShopFloorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [queue, setQueue] = useState<ProductionQueue | null>(null);
  const [equipment, setEquipment] = useState<EquipmentRegistryItem[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [csvFiles, setCsvFiles] = useState<CsvFileMetadata[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedCellId, setSelectedCellId] = useState<string>('CELL-01');

  const refreshAll = useCallback(async () => {
    try {
      const [fetchedCells, fetchedQueue, fetchedEq, fetchedEvts, fetchedCsv] = await Promise.all([
        api.getCells(),
        api.getQueue(),
        api.getEquipment(),
        api.getEvents(),
        api.getCsvFiles()
      ]);
      setCells(fetchedCells);
      setQueue(fetchedQueue);
      setEquipment(fetchedEq);
      setEvents(fetchedEvts);
      setCsvFiles(fetchedCsv);
    } catch (err) {
      console.error('Failed to refresh shop floor state:', err);
    }
  }, []);

  // Initial load via REST
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Connect WebSocket with resilient auto-reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      const isDev = window.location.port === '5173';
      const wsUrl = isDev
        ? `ws://${window.location.hostname || '127.0.0.1'}:3001/ws`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);
      } catch (e) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
        return;
      }

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'SNAPSHOT':
              if (msg.payload.cells) setCells(msg.payload.cells);
              if (msg.payload.queue) setQueue(msg.payload.queue);
              if (msg.payload.equipment) setEquipment(msg.payload.equipment);
              if (msg.payload.events) setEvents(msg.payload.events);
              if (msg.payload.csvFiles) setCsvFiles(msg.payload.csvFiles);
              break;

            case 'CELL_UPDATED':
              setCells((prev) => {
                const updated = msg.payload;
                if (updated.deleted) {
                  return prev.filter((c) => c.id !== updated.id);
                }
                const idx = prev.findIndex((c) => c.id === updated.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = updated;
                  return next;
                }
                return [...prev, updated];
              });
              break;

            case 'QUEUE_UPDATED':
              setQueue(msg.payload);
              break;

            case 'SIMULATION_STEP':
              // Update live telemetry in cells
              setCells((prev) =>
                prev.map((c) => {
                  if (c.id !== msg.payload.cellId) return c;
                  return {
                    ...c,
                    fixtures: c.fixtures.map((f) =>
                      f.id === msg.payload.fixtureId
                        ? { ...f, progressPct: msg.payload.stepProgressPct }
                        : f
                    ),
                    robots: c.robots.map((r) => ({
                      ...r,
                      arcOn: true,
                      liveTelemetry: msg.payload.telemetry || r.liveTelemetry
                    }))
                  };
                })
              );
              break;

            case 'ROBOT_UPDATED':
              setCells((prev) =>
                prev.map((c) => {
                  if (c.id !== msg.payload.cellId) return c;
                  return {
                    ...c,
                    robots: c.robots.map((r) =>
                      r.id === msg.payload.robot.id ? msg.payload.robot : r
                    )
                  };
                })
              );
              break;

            case 'FIXTURE_UPDATED':
              setCells((prev) =>
                prev.map((c) => {
                  if (c.id !== msg.payload.cellId) return c;
                  return {
                    ...c,
                    fixtures: c.fixtures.map((f) =>
                      f.id === msg.payload.fixture.id ? msg.payload.fixture : f
                    )
                  };
                })
              );
              break;

            case 'CSV_GENERATED':
              setCsvFiles((prev) => [msg.payload, ...prev]);
              break;

            case 'FAULT_INJECTED':
              refreshAll();
              break;
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
    };

    connect();
    refreshAll();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, [refreshAll]);

  const selectCell = (cellId: string) => {
    setSelectedCellId(cellId);
  };

  const activeCell = cells.find((c) => c.id === selectedCellId) || cells[0] || null;

  return (
    <ShopFloorContext.Provider
      value={{
        cells,
        queue,
        equipment,
        events,
        csvFiles,
        isConnected,
        activeCell,
        refreshAll,
        selectCell
      }}
    >
      {children}
    </ShopFloorContext.Provider>
  );
};

export const useShopFloor = () => {
  const context = useContext(ShopFloorContext);
  if (!context) {
    throw new Error('useShopFloor must be used within a ShopFloorProvider');
  }
  return context;
};
