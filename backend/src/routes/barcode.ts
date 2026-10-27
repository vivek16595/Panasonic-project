import { FastifyInstance } from 'fastify';
import { WampClientService } from '../services/wamp-client.js';
import { WebSocketHandler } from '../websocket/ws-handler.js';

export async function barcodeRoutes(
  app: FastifyInstance,
  options: {
    wampClient: WampClientService;
    wsHandler: WebSocketHandler;
  }
) {
  const { wampClient, wsHandler } = options;

  app.post<{ Body: { cellId: string; barcode: string; context?: any } }>(
    '/api/barcode/scan',
    async (request, reply) => {
      const { cellId, barcode, context } = request.body;
      if (!cellId || !barcode) {
        return reply.status(400).send({ error: 'cellId and barcode are required.' });
      }

      const scanResult = await wampClient.publishBarcode(cellId, barcode, context);
      wsHandler.broadcast('BARCODE_SCANNED', scanResult);
      return scanResult;
    }
  );

  app.get('/api/barcode/history', async () => {
    return wampClient.getScanHistory();
  });
}
