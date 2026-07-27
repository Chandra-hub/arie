import './config/env'; // Validate env vars first
import { env } from './config/env';
import { createStorageAdapters } from './storage/factory';
import { buildServer } from './api/server';
import { startScheduler } from './agent/scheduler';
import pino from 'pino';

const logger = pino({ name: 'arie' });

async function main(): Promise<void> {
  logger.info({ storageAdapter: env.STORAGE_ADAPTER }, 'Starting ARIE');

  // Initialise storage
  const storage = createStorageAdapters();
  await storage.initialize();
  logger.info('Storage initialised');

  // Start API server
  const app = await buildServer(storage);
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info({ port: env.PORT }, 'API server listening');

  // Start scheduler
  startScheduler(storage);
  logger.info('Scheduler started');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    await app.close();
    await storage.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  pino({ name: 'arie' }).fatal({ err }, 'Fatal startup error');
  process.exit(1);
});
