import Fastify from 'fastify';
import cors from '@fastify/cors';
import { StorageAdapters } from '../storage/repository.interface';
import {
  healthRoutes,
  orgRoutes,
  jurisdictionRoutes,
  regulationRoutes,
  complianceRoutes,
  agentRoutes,
} from './routes/index';
import { errorHandler } from './middleware/error-handler';

export async function buildServer(storage: StorageAdapters) {
  const app = Fastify({
    logger: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' },
  });

  await app.register(cors, { origin: true });

  // Routes
  await app.register(healthRoutes);
  await app.register(orgRoutes(storage), { prefix: '/api/v1/orgs' });
  await app.register(jurisdictionRoutes(storage), { prefix: '/api/v1/jurisdictions' });
  await app.register(regulationRoutes(storage), { prefix: '/api/v1/regulations' });
  await app.register(complianceRoutes(storage), { prefix: '/api/v1/compliance' });
  await app.register(agentRoutes(storage), { prefix: '/api/v1/agent' });

  app.setErrorHandler(errorHandler);

  return app;
}
