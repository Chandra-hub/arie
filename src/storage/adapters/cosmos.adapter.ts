/**
 * Azure Cosmos DB Storage Adapter
 *
 * TODO: Install the Cosmos SDK and implement all methods.
 *   npm install @azure/cosmos
 *
 * Recommended approach:
 * - Use the NoSQL API (document model)
 * - One container per entity type: orgs, regulations, agentRuns, jurisdictionHashes
 * - Partition key: /orgId for all containers
 * - Use Cosmos's upsert for regulation upserts
 *
 * See: https://learn.microsoft.com/azure/cosmos-db/nosql/quickstart-nodejs
 */

import { StorageAdapters } from '../repository.interface';

export interface CosmosConfig {
  endpoint: string;
  key: string;
  database: string;
}

export function createCosmosAdapters(_config: CosmosConfig): StorageAdapters {
  throw new Error(
    'Cosmos DB adapter not yet implemented. ' +
      'Install @azure/cosmos and implement all four repository interfaces ' +
      'following the pattern in postgres.adapter.ts',
  );
}
