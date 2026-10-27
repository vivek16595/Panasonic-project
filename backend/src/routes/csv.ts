import { FastifyInstance } from 'fastify';
import { PanasonicCsvWriter } from '../services/csv-writer.js';

export async function csvRoutes(
  app: FastifyInstance,
  options: {
    csvWriter: PanasonicCsvWriter;
  }
) {
  const { csvWriter } = options;

  app.get<{ Querystring: { cellId?: string; controllerSN?: string } }>(
    '/api/csv-output',
    async (request) => {
      const { cellId, controllerSN } = request.query;
      let files = csvWriter.getAllMetadata();
      if (cellId) {
        files = files.filter(f => f.cellId === cellId);
      }
      if (controllerSN) {
        files = files.filter(f => f.controllerSN === controllerSN);
      }
      return files;
    }
  );

  app.get<{ Querystring: { path: string } }>('/api/csv-output/content', async (request, reply) => {
    try {
      const content = await csvWriter.getFileContent(request.query.path);
      return { content };
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
}
