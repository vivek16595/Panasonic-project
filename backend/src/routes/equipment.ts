import { FastifyInstance } from 'fastify';
import { EquipmentManager } from '../services/equipment-manager.js';
import { EquipmentRegistryItem } from '../models/types.js';

export async function equipmentRoutes(
  app: FastifyInstance,
  options: {
    equipmentManager: EquipmentManager;
  }
) {
  const { equipmentManager } = options;

  app.get('/api/equipment', async (request, reply) => {
    return equipmentManager.getAllEquipment();
  });

  app.get('/api/equipment/availability', async (request, reply) => {
    const all = equipmentManager.getAllEquipment();
    return {
      availableRobots: all.filter(e => e.type === 'robot' && e.availability === 'Available'),
      availableFixtures: all.filter(e => e.type === 'fixture' && e.availability === 'Available'),
      inUseRobots: all.filter(e => e.type === 'robot' && e.availability === 'InUse'),
      inUseFixtures: all.filter(e => e.type === 'fixture' && e.availability === 'InUse'),
      totalCount: all.length
    };
  });

  app.post<{ Body: EquipmentRegistryItem }>('/api/equipment', async (request, reply) => {
    try {
      equipmentManager.registerEquipment(request.body);
      return reply.status(201).send(request.body);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
