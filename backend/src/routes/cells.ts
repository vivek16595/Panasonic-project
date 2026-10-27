import { FastifyInstance } from 'fastify';
import { ShopFloorStateManager } from '../services/state-manager.js';
import { WeldingSimulationEngine } from '../services/simulation-engine.js';
import { WebSocketHandler } from '../websocket/ws-handler.js';
import { Cell } from '../models/types.js';

export async function cellRoutes(
  app: FastifyInstance,
  options: {
    stateManager: ShopFloorStateManager;
    simulationEngine: WeldingSimulationEngine;
    wsHandler: WebSocketHandler;
  }
) {
  const { stateManager, simulationEngine, wsHandler } = options;

  app.get('/api/cells', async (request, reply) => {
    return stateManager.getAllCells();
  });

  app.get<{ Params: { cellId: string } }>('/api/cells/:cellId', async (request, reply) => {
    const cell = stateManager.getCellById(request.params.cellId);
    if (!cell) {
      return reply.status(404).send({ error: `Cell '${request.params.cellId}' not found.` });
    }
    return cell;
  });

  app.post<{ Body: Cell }>('/api/cells', async (request, reply) => {
    try {
      const created = stateManager.createCell(request.body);
      wsHandler.broadcast('CELL_UPDATED', created);
      return reply.status(201).send(created);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.put<{ Params: { cellId: string }; Body: Partial<Cell> }>(
    '/api/cells/:cellId',
    async (request, reply) => {
      try {
        const updated = stateManager.updateCell(request.params.cellId, request.body);
        wsHandler.broadcast('CELL_UPDATED', updated);
        return updated;
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    }
  );

  app.delete<{ Params: { cellId: string } }>('/api/cells/:cellId', async (request, reply) => {
    try {
      stateManager.deleteCell(request.params.cellId);
      wsHandler.broadcast('CELL_UPDATED', { id: request.params.cellId, deleted: true });
      return { success: true, message: `Cell '${request.params.cellId}' deleted.` };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.post<{ Params: { cellId: string }; Body?: { fixtureId?: string } }>(
    '/api/cells/:cellId/manual-start',
    async (request, reply) => {
      try {
        const cell = stateManager.getCellById(request.params.cellId);
        if (!cell) {
          return reply.status(404).send({ error: `Cell '${request.params.cellId}' not found.` });
        }

        // Run simulation in background
        simulationEngine
          .executeCell(request.params.cellId, {
            onStep: (step) => wsHandler.broadcast('SIMULATION_STEP', step),
            onBeadComplete: (bead, fixture, robot) =>
              wsHandler.broadcast('ROBOT_UPDATED', { cellId: cell.id, robot }),
            onFixtureComplete: (fixture) =>
              wsHandler.broadcast('FIXTURE_UPDATED', { cellId: cell.id, fixture }),
            onCellComplete: (completedCell) =>
              wsHandler.broadcast('CELL_UPDATED', completedCell)
          })
          .catch((err) => {
            wsHandler.broadcast('FAULT_INJECTED', { cellId: cell.id, error: err.message });
          });

        wsHandler.broadcast('CELL_UPDATED', cell);
        return { success: true, message: `Manual weld execution initiated for Cell '${cell.id}'.` };
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    }
  );

  app.post<{ Params: { cellId: string } }>('/api/cells/:cellId/stop', async (request, reply) => {
    simulationEngine.stopCell(request.params.cellId);
    const cell = stateManager.getCellById(request.params.cellId);
    if (cell) {
      wsHandler.broadcast('CELL_UPDATED', cell);
    }
    return { success: true, message: `Cell '${request.params.cellId}' stopped.` };
  });

  app.post<{ Params: { cellId: string }; Body?: { fixtureId?: string; reason?: string } }>(
    '/api/cells/:cellId/fault',
    async (request, reply) => {
      const reason = request.body?.reason || 'Operator Injected Fault';
      simulationEngine.injectFault(request.params.cellId, request.body?.fixtureId, reason);
      const cell = stateManager.getCellById(request.params.cellId);
      if (cell) {
        wsHandler.broadcast('FAULT_INJECTED', { cellId: cell.id, error: reason });
        wsHandler.broadcast('CELL_UPDATED', cell);
      }
      return { success: true, message: `Fault injected into Cell '${request.params.cellId}'.` };
    }
  );
}
