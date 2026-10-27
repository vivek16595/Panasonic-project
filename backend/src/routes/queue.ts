import { FastifyInstance } from 'fastify';
import { ProductionQueueEngine } from '../services/queue-engine.js';
import { WebSocketHandler } from '../websocket/ws-handler.js';

export async function queueRoutes(
  app: FastifyInstance,
  options: {
    queueEngine: ProductionQueueEngine;
    wsHandler: WebSocketHandler;
  }
) {
  const { queueEngine, wsHandler } = options;

  app.get('/api/production/queues', async () => {
    return queueEngine.getQueue();
  });

  app.post<{ Body: { items: Array<{ cellId: string; order: number }> } }>(
    '/api/production/queues/items',
    async (request, reply) => {
      try {
        const queue = queueEngine.setQueueItems(request.body.items);
        wsHandler.broadcast('QUEUE_UPDATED', queue);
        return queue;
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    }
  );

  app.post<{ Body: { cellId: string } }>('/api/production/queues/add-cell', async (request, reply) => {
    try {
      const queue = queueEngine.addCellToQueue(request.body.cellId);
      wsHandler.broadcast('QUEUE_UPDATED', queue);
      return queue;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.post<{ Body: { orderedItemIds: string[] } }>(
    '/api/production/queues/reorder',
    async (request, reply) => {
      try {
        const queue = queueEngine.reorderItems(request.body.orderedItemIds);
        wsHandler.broadcast('QUEUE_UPDATED', queue);
        return queue;
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    }
  );

  app.post('/api/production/queues/start', async (request, reply) => {
    try {
      const queue = await queueEngine.startQueue();
      wsHandler.broadcast('QUEUE_UPDATED', queue);
      return queue;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.post('/api/production/queues/pause', async (request, reply) => {
    try {
      const queue = queueEngine.pauseQueue();
      wsHandler.broadcast('QUEUE_UPDATED', queue);
      return queue;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.post('/api/production/queues/resume', async (request, reply) => {
    try {
      const queue = queueEngine.resumeQueue();
      wsHandler.broadcast('QUEUE_UPDATED', queue);
      return queue;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.post('/api/production/queues/stop', async (request, reply) => {
    try {
      const queue = queueEngine.stopQueue();
      wsHandler.broadcast('QUEUE_UPDATED', queue);
      return queue;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.post<{ Body: { cellId: string } }>('/api/production/queues/retry', async (request, reply) => {
    try {
      const queue = await queueEngine.retryCell(request.body.cellId);
      wsHandler.broadcast('QUEUE_UPDATED', queue);
      return queue;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
