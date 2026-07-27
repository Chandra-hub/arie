import { env } from '../config/env';
import { StorageAdapters } from './repository.interface';
import { createPostgresAdapters } from './adapters/postgres.adapter';
import { createMySQLAdapters } from './adapters/mysql.adapter';
import { createCosmosAdapters } from './adapters/cosmos.adapter';
import { createDynamoAdapters } from './adapters/dynamo.adapter';

export function createStorageAdapters(): StorageAdapters {
  switch (env.STORAGE_ADAPTER) {
    case 'postgres': {
      if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for the postgres adapter');
      return createPostgresAdapters(env.DATABASE_URL);
    }

    case 'mysql': {
      if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for the mysql adapter');
      return createMySQLAdapters(env.DATABASE_URL);
    }

    case 'cosmos': {
      if (!env.COSMOS_ENDPOINT || !env.COSMOS_KEY || !env.COSMOS_DATABASE) {
        throw new Error(
          'COSMOS_ENDPOINT, COSMOS_KEY, and COSMOS_DATABASE are required for the cosmos adapter',
        );
      }
      return createCosmosAdapters({
        endpoint: env.COSMOS_ENDPOINT,
        key: env.COSMOS_KEY,
        database: env.COSMOS_DATABASE,
      });
    }

    case 'dynamo': {
      if (!env.AWS_REGION) throw new Error('AWS_REGION is required for the dynamo adapter');
      return createDynamoAdapters({
        region: env.AWS_REGION,
        tablePrefix: env.DYNAMO_TABLE_PREFIX,
      });
    }

    default:
      throw new Error(`Unsupported STORAGE_ADAPTER: ${env.STORAGE_ADAPTER}`);
  }
}
