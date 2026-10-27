import { FastifyInstance } from 'fastify';
import { ShopFloorStateManager } from '../services/state-manager.js';
import { PanasonicCsvWriter } from '../services/csv-writer.js';

export async function traceabilityRoutes(
  app: FastifyInstance,
  options: {
    stateManager: ShopFloorStateManager;
    csvWriter: PanasonicCsvWriter;
  }
) {
  const { stateManager, csvWriter } = options;

  app.get('/api/production/history', async () => {
    return stateManager.getHistory();
  });

  app.get('/api/events', async () => {
    return stateManager.getEvents();
  });

  app.get<{ Params: { workSN: string } }>('/api/traceability/:workSN', async (request, reply) => {
    const { workSN } = request.params;
    const allFiles = csvWriter.getAllMetadata();
    const relatedFiles = allFiles.filter(f => f.workSN === workSN);
    return {
      workSN,
      associatedCsvFiles: relatedFiles,
      beadRecordsCount: relatedFiles.length
    };
  });
}
