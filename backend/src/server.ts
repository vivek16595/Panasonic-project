import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { config } from './config/index.js';
import { ShopFloorStateManager } from './services/state-manager.js';
import { EquipmentManager } from './services/equipment-manager.js';
import { PanasonicCsvWriter } from './services/csv-writer.js';
import { WampClientService } from './services/wamp-client.js';
import { WeldingSimulationEngine } from './services/simulation-engine.js';
import { ProductionQueueEngine } from './services/queue-engine.js';
import { WebSocketHandler } from './websocket/ws-handler.js';
import { cellRoutes } from './routes/cells.js';
import { equipmentRoutes } from './routes/equipment.js';
import { queueRoutes } from './routes/queue.js';
import { csvRoutes } from './routes/csv.js';
import { barcodeRoutes } from './routes/barcode.js';
import { traceabilityRoutes } from './routes/traceability.js';

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  await app.register(fastifyWebsocket);

  // Initialize Core Services
  const stateManager = new ShopFloorStateManager();
  const equipmentManager = new EquipmentManager();
  const csvWriter = new PanasonicCsvWriter();
  const wampClient = new WampClientService();
  const simulationEngine = new WeldingSimulationEngine(stateManager, equipmentManager, csvWriter);
  const queueEngine = new ProductionQueueEngine(stateManager, simulationEngine, csvWriter);
  const wsHandler = new WebSocketHandler(stateManager, queueEngine, equipmentManager, csvWriter);

  // Wire queue callbacks to live WebSocket broadcaster
  queueEngine.setCallbacks({
    onQueueUpdated: (q) => wsHandler.broadcast('QUEUE_UPDATED', q),
    onCellStep: (step) => wsHandler.broadcast('SIMULATION_STEP', step),
    onCellFault: (cellId, error) => wsHandler.broadcast('FAULT_INJECTED', { cellId, error })
  });

  // WebSocket Endpoint
  app.get('/ws', { websocket: true }, (connection: any) => {
    const socket = connection.socket || connection;
    wsHandler.handleConnection(socket);
  });

  // Healthcheck
  app.get('/api/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register REST Routes
  await app.register(cellRoutes, { stateManager, simulationEngine, wsHandler });
  await app.register(equipmentRoutes, { equipmentManager });
  await app.register(queueRoutes, { queueEngine, wsHandler });
  await app.register(csvRoutes, { csvWriter });
  await app.register(barcodeRoutes, { wampClient, wsHandler });
  await app.register(traceabilityRoutes, { stateManager, csvWriter });

  return {
    app,
    stateManager,
    equipmentManager,
    csvWriter,
    wampClient,
    simulationEngine,
    queueEngine,
    wsHandler
  };
}

// Start Server when invoked directly
async function startServer() {
  const { app } = await buildApp();
  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`[Welding Simulator Backend] Running at http://${config.host}:${config.port}`);
    console.log(`[WebSocket Server] Listening at ws://${config.host}:${config.port}/ws`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (process.argv[1]?.includes('server.ts') || process.argv[1]?.includes('server.js')) {
  startServer();
}
