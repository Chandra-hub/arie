/**
 * AWS DynamoDB Storage Adapter
 *
 * TODO: Install the AWS SDK and implement all methods.
 *   npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 *
 * Recommended table design (single-table or multi-table):
 *   Multi-table approach (simpler to reason about):
 *   - {prefix}orgs         PK: orgId
 *   - {prefix}regulations  PK: orgId, SK: id
 *   - {prefix}agent_runs   PK: orgId, SK: runId
 *   - {prefix}hashes       PK: orgId, SK: jurisdictionCode
 *
 * Set DYNAMO_TABLE_PREFIX env var to namespace tables per environment.
 *
 * See: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-table-and-document-management.html
 */

import { StorageAdapters } from '../repository.interface';

export interface DynamoConfig {
  region: string;
  tablePrefix: string;
}

export function createDynamoAdapters(_config: DynamoConfig): StorageAdapters {
  throw new Error(
    'DynamoDB adapter not yet implemented. ' +
      'Install @aws-sdk/client-dynamodb and implement all four repository interfaces ' +
      'following the pattern in postgres.adapter.ts',
  );
}
