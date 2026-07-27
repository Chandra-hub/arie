# Storage Adapters Guide

ARIE uses a repository pattern — all database access goes through typed interfaces.
This means you can plug in any database by implementing four interfaces.

## Implementing a Custom Adapter

### Step 1 — Install your driver

```bash
# Example: MySQL
npm install mysql2

# Example: MongoDB
npm install mongodb
```

### Step 2 — Create your adapter file

```
src/storage/adapters/your-db.adapter.ts
```

### Step 3 — Implement all four interfaces

```typescript
import { StorageAdapters, IOrgRepository, IRegulationRepository,
         IAgentRunRepository, IChangeHashRepository } from '../repository.interface';

class YourOrgRepository implements IOrgRepository {
  async createOrg(input, apiKeyHash) { /* ... */ }
  async getOrgByApiKeyHash(hash)     { /* ... */ }
  async getOrgById(orgId)            { /* ... */ }
  async getAllOrgs()                 { /* ... */ }
  async updateOrg(orgId, updates)    { /* ... */ }
  async deleteOrg(orgId)             { /* ... */ }
}

// ... implement IRegulationRepository, IAgentRunRepository, IChangeHashRepository

export function createYourDbAdapters(config: YourConfig): StorageAdapters {
  return {
    orgs:         new YourOrgRepository(/* ... */),
    regulations:  new YourRegulationRepository(/* ... */),
    agentRuns:    new YourAgentRunRepository(/* ... */),
    changeHashes: new YourChangeHashRepository(/* ... */),
    async initialize() { /* connect, create tables, etc. */ },
    async close()      { /* disconnect */ },
  };
}
```

### Step 4 — Register in the factory

```typescript
// src/storage/factory.ts
import { createYourDbAdapters } from './adapters/your-db.adapter';

case 'yourdb':
  return createYourDbAdapters({ ... });
```

### Step 5 — Set environment variables

```env
STORAGE_ADAPTER=yourdb
# Add any connection vars your adapter needs
```

## Built-in Adapters

| Adapter | Status | Driver |
|---|---|---|
| `postgres` | ✅ Full implementation | `pg` + `drizzle-orm` |
| `mysql` | 🔧 Stub — implement with `mysql2` | `mysql2` + `drizzle-orm` |
| `cosmos` | 🔧 Stub — implement with `@azure/cosmos` | `@azure/cosmos` |
| `dynamo` | 🔧 Stub — implement with `@aws-sdk/client-dynamodb` | `@aws-sdk/client-dynamodb` |

## Data Isolation

Every repository method takes `orgId` as the first argument.
This ensures all queries are scoped to the requesting organization — multi-tenancy is enforced
at the repository layer, not the API layer.

**Never** write a query without an `orgId` filter on a shared table.
