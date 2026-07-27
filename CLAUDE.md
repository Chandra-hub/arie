# CLAUDE.md — Agentic Regulatory Intelligence Engine (ARIE)

## Project Overview

ARIE is a cloud-agnostic, multi-tenant agentic AI system that autonomously monitors government
regulatory websites across global jurisdictions, detects regulatory changes, normalizes rules via
Claude AI, and exposes compliance intelligence via a REST API. It is designed to be deployed by
any organization, with each organization configuring their own jurisdiction footprint. ARIE evolved
from the SRIA MCP server concept but is now a standalone, reusable platform.

---

## Core Principles

- **No mock or hardcoded data** — all regulatory content must be fetched from live government sources
- **Cloud-agnostic** — no hard dependency on Azure, AWS, or GCP; runs on any cloud or on-prem
- **Multi-tenant by design** — org config is fully isolated; agent logic is org-agnostic
- **Storage-agnostic** — all database access goes through a repository abstraction layer
- **Containerized** — Docker-first deployment; runs anywhere Kubernetes, Lambda, or App Service runs
- **Hybrid fetch strategy** — weekly scheduled baseline + event-driven triggers for urgent changes

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Language | TypeScript (Node.js 20+) | Portable, strong async patterns, existing team fluency |
| Agent Orchestration | Anthropic SDK + custom orchestrator | Claude API for reasoning, normalization, and classification |
| REST API | Fastify | High-performance, schema-first, TypeScript-native |
| Scheduler | node-cron | Lightweight cron-based scheduler for weekly fetch cadence |
| Change Detection | RSS polling + hash diffing | Detects regulatory page changes without hammering gov sites |
| Storage Abstraction | Repository pattern (custom) | Pluggable adapters for any database backend |
| Default DB Adapter | PostgreSQL (via pg + Drizzle ORM) | Robust, widely supported, org-replaceable |
| Containerization | Docker + Docker Compose | Cloud-agnostic deployment |
| Secrets Management | Environment variables + org-scoped runtime config | No hard lock to any cloud secrets service |
| Logging | Pino | Structured JSON logging, production-ready |
| Testing | Vitest | Fast, TypeScript-native unit and integration tests |

---

## Directory Structure

```
arie/
├── CLAUDE.md                        # This file
├── docker-compose.yml               # Local development stack
├── Dockerfile                       # Production container
├── package.json
├── tsconfig.json
│
├── src/
│   ├── index.ts                     # Entry point — boots API + scheduler
│   │
│   ├── agent/
│   │   ├── orchestrator.ts          # Core agentic loop controller
│   │   ├── scraper.ts               # Government site scraping logic
│   │   ├── normalizer.ts            # Claude API regulatory rule normalization
│   │   ├── classifier.ts            # Jurisdiction + sector classification
│   │   ├── change-detector.ts       # Hash diffing + RSS feed monitoring
│   │   └── scheduler.ts             # Cron-based weekly fetch scheduler
│   │
│   ├── api/
│   │   ├── server.ts                # Fastify server setup
│   │   ├── routes/
│   │   │   ├── health.ts            # GET /health
│   │   │   ├── orgs.ts              # Org config CRUD
│   │   │   ├── jurisdictions.ts     # Jurisdiction management
│   │   │   ├── regulations.ts       # Regulatory data query endpoints
│   │   │   ├── compliance.ts        # Compliance check endpoints
│   │   │   └── agent.ts             # Manual agent trigger endpoints
│   │   └── middleware/
│   │       ├── auth.ts              # API key authentication
│   │       ├── tenant.ts            # Org-scoped request context
│   │       └── error-handler.ts     # Global error handling
│   │
│   ├── storage/
│   │   ├── repository.interface.ts  # Core storage abstraction contracts
│   │   ├── adapters/
│   │   │   ├── postgres.adapter.ts  # PostgreSQL implementation
│   │   │   ├── mysql.adapter.ts     # MySQL implementation
│   │   │   ├── cosmos.adapter.ts    # Azure Cosmos DB implementation
│   │   │   └── dynamo.adapter.ts    # AWS DynamoDB implementation
│   │   └── factory.ts               # Adapter factory (reads STORAGE_ADAPTER env var)
│   │
│   ├── config/
│   │   ├── env.ts                   # Environment variable validation (zod)
│   │   └── jurisdictions.ts         # Global jurisdiction registry (seed data)
│   │
│   └── types/
│       ├── org.types.ts             # Org + tenant types
│       ├── regulation.types.ts      # Regulatory rule types
│       ├── jurisdiction.types.ts    # Jurisdiction types
│       └── agent.types.ts           # Agent run + job types
│
├── tests/
│   ├── unit/
│   └── integration/
│
└── docs/
    ├── api-contracts.md             # Full REST API reference
    └── storage-adapters.md          # How to implement a custom adapter
```

---

## Agentic Architecture

### Agent Orchestration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ARIE Agent Orchestrator                      │
│                                                                  │
│  Trigger (Scheduled / Event / Manual API call)                   │
│         │                                                        │
│         ▼                                                        │
│  1. Load Org Config ──► Resolve jurisdiction footprint           │
│         │                                                        │
│         ▼                                                        │
│  2. Change Detection ──► RSS feed poll + page hash diff          │
│         │                                                        │
│         ├── No changes detected ──► Skip, log, exit             │
│         │                                                        │
│         └── Changes detected ──► Trigger scrape for jurisdiction │
│                   │                                              │
│                   ▼                                              │
│  3. Scraper ──► Fetch raw HTML/JSON from gov source             │
│                   │                                              │
│                   ▼                                              │
│  4. Claude Normalizer ──► Extract structured regulatory rules    │
│                   │          via Claude API (claude-sonnet-4-6)  │
│                   ▼                                              │
│  5. Classifier ──► Tag by sector, penalty type, effective date  │
│                   │                                              │
│                   ▼                                              │
│  6. Repository ──► Upsert via storage abstraction layer          │
│                   │                                              │
│                   ▼                                              │
│  7. Emit change event ──► Webhook / notification (if configured) │
└─────────────────────────────────────────────────────────────────┘
```

### Hybrid Fetch Strategy

The agent uses two complementary approaches:

**Weekly Scheduled Fetch (Baseline)**
- Runs every Sunday at 02:00 UTC via node-cron
- Fetches all jurisdictions in the org's configured footprint
- Full refresh — picks up any changes missed by event-driven monitoring
- Configurable via `WEEKLY_CRON_SCHEDULE` env var

**Event-Driven Fetch (Urgent Changes)**
- RSS feed polling every 6 hours for jurisdictions that publish RSS
- Page hash diffing every 24 hours for jurisdictions without RSS
- On change detected → immediately triggers a targeted scrape for that jurisdiction only
- Configurable polling interval via `CHANGE_DETECTION_INTERVAL_HOURS` env var

---

## Multi-Tenant Design

Each organization is identified by an `orgId`. All data — jurisdiction footprints, fetched
regulations, agent run history — is scoped to the `orgId` at the storage layer.

### Org Config Schema

```typescript
interface OrgConfig {
  orgId: string;                        // Unique org identifier
  name: string;                         // Organization display name
  apiKey: string;                       // Hashed API key for REST auth
  jurisdictionFootprint: string[];      // ISO 3166-1 alpha-2 codes e.g. ["GB", "US", "AU"]
  sectors: string[];                    // Industry sectors e.g. ["water", "chemical", "manufacturing"]
  storageConfig?: StorageConfig;        // Optional: org-provided storage override
  webhookUrl?: string;                  // Optional: webhook for change notifications
  fetchCadence?: FetchCadenceConfig;    // Optional: override default schedule
  createdAt: Date;
  updatedAt: Date;
}
```

### Org-Scoped Request Context

Every API request carries an `X-Api-Key` header. The `tenant` middleware resolves this to an
`OrgContext` object that is attached to all downstream calls, ensuring data isolation.

```typescript
interface OrgContext {
  orgId: string;
  jurisdictionFootprint: string[];
  sectors: string[];
}
```

---

## REST API Contracts

### Base URL
```
https://{host}/api/v1
```

### Authentication
All endpoints require:
```
X-Api-Key: {org-api-key}
```

---

### Health

#### `GET /health`
Returns system health status. No auth required.

**Response 200**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-07-24T10:00:00Z"
}
```

---

### Org Management

#### `POST /orgs`
Register a new organization.

**Request Body**
```json
{
  "name": "Acme Chemical Corp",
  "jurisdictionFootprint": ["GB", "US", "AU", "DE"],
  "sectors": ["chemical", "water", "manufacturing"],
  "webhookUrl": "https://acme.com/webhooks/regulations",
  "fetchCadence": {
    "weeklySchedule": "0 2 * * 0",
    "changeDetectionIntervalHours": 6
  }
}
```

**Response 201**
```json
{
  "orgId": "org_abc123",
  "apiKey": "arie_live_xxxxxxxxxxxx",
  "message": "Organization registered. Store your API key securely — it will not be shown again."
}
```

---

#### `GET /orgs/me`
Get current org configuration.

**Response 200**
```json
{
  "orgId": "org_abc123",
  "name": "Acme Chemical Corp",
  "jurisdictionFootprint": ["GB", "US", "AU", "DE"],
  "sectors": ["chemical", "water", "manufacturing"],
  "createdAt": "2026-07-01T00:00:00Z",
  "updatedAt": "2026-07-20T00:00:00Z"
}
```

---

#### `PATCH /orgs/me`
Update org configuration (e.g. expand jurisdiction footprint).

**Request Body** (partial update)
```json
{
  "jurisdictionFootprint": ["GB", "US", "AU", "DE", "JP", "SG"]
}
```

**Response 200**
```json
{
  "orgId": "org_abc123",
  "jurisdictionFootprint": ["GB", "US", "AU", "DE", "JP", "SG"],
  "updatedAt": "2026-07-24T10:00:00Z"
}
```

---

### Jurisdictions

#### `GET /jurisdictions`
List all globally supported jurisdictions.

**Response 200**
```json
{
  "jurisdictions": [
    {
      "code": "GB",
      "name": "United Kingdom",
      "regulatoryBodies": ["Environment Agency", "Health and Safety Executive"],
      "rssFeedAvailable": true,
      "lastIndexed": "2026-07-20T02:00:00Z"
    },
    {
      "code": "US",
      "name": "United States",
      "regulatoryBodies": ["EPA", "OSHA", "DOT"],
      "rssFeedAvailable": true,
      "lastIndexed": "2026-07-20T02:00:00Z"
    }
  ],
  "total": 195
}
```

---

#### `GET /jurisdictions/{code}/regulations`
Get all current regulations for a specific jurisdiction within org's footprint.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `sector` | string | Filter by sector e.g. `chemical` |
| `effectiveAfter` | ISO date | Filter by effective date |
| `page` | number | Pagination (default 1) |
| `limit` | number | Results per page (default 20, max 100) |

**Response 200**
```json
{
  "jurisdiction": "GB",
  "regulations": [
    {
      "id": "reg_xyz789",
      "title": "Environmental Permitting (England and Wales) Regulations 2016",
      "body": "Environment Agency",
      "sector": "chemical",
      "summary": "Requires operators of regulated facilities to hold an environmental permit.",
      "effectiveDate": "2016-04-06",
      "lastUpdated": "2026-06-15",
      "penaltyFramework": {
        "maxFine": 250000,
        "currency": "GBP",
        "criminalLiability": true
      },
      "sourceUrl": "https://www.legislation.gov.uk/uksi/2016/1154",
      "changeDetected": false
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### Regulations

#### `GET /regulations`
Query regulations across all jurisdictions in the org's footprint.

**Query Parameters**
| Param | Type | Description |
|---|---|---|
| `sector` | string | Filter by sector |
| `jurisdiction` | string | Filter by jurisdiction code |
| `changedSince` | ISO date | Only regulations updated since date |
| `search` | string | Full-text search across regulation titles and summaries |
| `page` | number | Pagination |
| `limit` | number | Results per page |

**Response 200**
```json
{
  "regulations": [...],
  "total": 128,
  "page": 1,
  "limit": 20,
  "filters": {
    "jurisdictions": ["GB", "US"],
    "sector": "chemical"
  }
}
```

---

#### `GET /regulations/{id}`
Get full details of a single regulation.

**Response 200**
```json
{
  "id": "reg_xyz789",
  "jurisdiction": "GB",
  "title": "Environmental Permitting Regulations 2016",
  "body": "Environment Agency",
  "sector": "chemical",
  "fullText": "...",
  "summary": "...",
  "keyObligations": [
    "Obtain environmental permit before operating",
    "Submit annual compliance report",
    "Report incidents within 24 hours"
  ],
  "effectiveDate": "2016-04-06",
  "lastUpdated": "2026-06-15",
  "penaltyFramework": {
    "maxFine": 250000,
    "currency": "GBP",
    "criminalLiability": true,
    "notes": "Unlimited fines on indictment"
  },
  "sourceUrl": "https://www.legislation.gov.uk/uksi/2016/1154",
  "changeHistory": [
    {
      "detectedAt": "2026-06-15T02:00:00Z",
      "summary": "Penalty thresholds updated"
    }
  ]
}
```

---

### Compliance

#### `POST /compliance/check`
Check a given operational scenario against all relevant regulations in the org's footprint.

**Request Body**
```json
{
  "jurisdictions": ["GB", "DE"],
  "sector": "chemical",
  "scenario": "We discharge treated wastewater into a river at our UK and German facilities. Volume: 500m3/day."
}
```

**Response 200**
```json
{
  "complianceReport": {
    "status": "review_required",
    "checkedJurisdictions": ["GB", "DE"],
    "findings": [
      {
        "jurisdiction": "GB",
        "regulation": "Environmental Permitting Regulations 2016",
        "status": "permit_required",
        "details": "Discharge of this volume requires an environmental permit from the Environment Agency.",
        "action": "Apply for water discharge permit before commencing operations.",
        "penaltyIfNonCompliant": "Up to £250,000 fine or unlimited on indictment"
      },
      {
        "jurisdiction": "DE",
        "regulation": "Wasserhaushaltsgesetz (WHG)",
        "status": "compliant_if_permitted",
        "details": "Requires permit under Federal Water Act. Volume thresholds apply.",
        "action": "Obtain Wasserrechtliche Erlaubnis from relevant Wasserbehörde."
      }
    ],
    "generatedAt": "2026-07-24T10:00:00Z"
  }
}
```

---

### Agent Control

#### `POST /agent/run`
Manually trigger an agent fetch run for the org's footprint (or a specific jurisdiction).

**Request Body**
```json
{
  "jurisdictions": ["JP", "SG"],   // Optional: omit to run full footprint
  "force": true                    // Optional: bypass change detection, force full fetch
}
```

**Response 202**
```json
{
  "runId": "run_abc456",
  "status": "queued",
  "message": "Agent run queued for jurisdictions: JP, SG",
  "estimatedDuration": "2-5 minutes"
}
```

---

#### `GET /agent/runs`
List agent run history for the org.

**Response 200**
```json
{
  "runs": [
    {
      "runId": "run_abc456",
      "trigger": "manual",
      "jurisdictions": ["JP", "SG"],
      "status": "completed",
      "regulationsUpdated": 12,
      "changesDetected": 3,
      "startedAt": "2026-07-24T10:00:00Z",
      "completedAt": "2026-07-24T10:03:22Z"
    }
  ]
}
```

---

#### `GET /agent/runs/{runId}`
Get status and results of a specific agent run.

---

## Storage Abstraction Layer

### Repository Interface Contract

All storage adapters must implement the following interface. The agent and API layers
interact **only** with these interfaces — never with a database client directly.

```typescript
// src/storage/repository.interface.ts

export interface IRegulationRepository {
  upsertRegulation(orgId: string, regulation: Regulation): Promise<Regulation>;
  getRegulationById(orgId: string, id: string): Promise<Regulation | null>;
  queryRegulations(orgId: string, filters: RegulationFilters): Promise<PaginatedResult<Regulation>>;
  getRegulationsByJurisdiction(orgId: string, jurisdictionCode: string): Promise<Regulation[]>;
  deleteRegulation(orgId: string, id: string): Promise<void>;
}

export interface IOrgRepository {
  createOrg(org: CreateOrgInput): Promise<OrgConfig>;
  getOrgByApiKey(hashedApiKey: string): Promise<OrgConfig | null>;
  getOrgById(orgId: string): Promise<OrgConfig | null>;
  updateOrg(orgId: string, updates: Partial<OrgConfig>): Promise<OrgConfig>;
}

export interface IAgentRunRepository {
  createRun(orgId: string, run: CreateAgentRunInput): Promise<AgentRun>;
  updateRun(runId: string, updates: Partial<AgentRun>): Promise<AgentRun>;
  getRunById(runId: string): Promise<AgentRun | null>;
  listRuns(orgId: string, limit?: number): Promise<AgentRun[]>;
}

export interface IChangeHashRepository {
  getHash(orgId: string, jurisdictionCode: string): Promise<string | null>;
  setHash(orgId: string, jurisdictionCode: string, hash: string): Promise<void>;
}
```

### Adapter Factory

```typescript
// src/storage/factory.ts

export function createStorageAdapters(config: StorageConfig): StorageAdapters {
  switch (config.adapter) {
    case 'postgres':   return new PostgresAdapters(config.connectionString);
    case 'mysql':      return new MySQLAdapters(config.connectionString);
    case 'cosmos':     return new CosmosAdapters(config.endpoint, config.key, config.database);
    case 'dynamo':     return new DynamoAdapters(config.region, config.tablePrefix);
    default:
      throw new Error(`Unsupported storage adapter: ${config.adapter}`);
  }
}
```

### Adding a Custom Adapter

Implement all four repository interfaces and register in `factory.ts`. No other changes required.
See `docs/storage-adapters.md` for a step-by-step guide.

---

## Agent Orchestration Logic

### Orchestrator (`src/agent/orchestrator.ts`)

```typescript
async function runAgentForOrg(orgId: string, options: RunOptions): Promise<AgentRunResult> {

  // 1. Load org config + resolve jurisdiction footprint
  const org = await orgRepo.getOrgById(orgId);
  const jurisdictions = options.jurisdictions ?? org.jurisdictionFootprint;

  // 2. For each jurisdiction — check for changes unless force=true
  const toProcess = options.force
    ? jurisdictions
    : await changeDetector.detectChangedJurisdictions(orgId, jurisdictions);

  // 3. For each changed jurisdiction — scrape, normalize, classify, store
  for (const code of toProcess) {
    const rawContent = await scraper.fetchJurisdiction(code);
    const normalized = await normalizer.normalize(code, org.sectors, rawContent);
    const classified = await classifier.classify(normalized);
    await regulationRepo.upsertRegulation(orgId, classified);
    await changeHashRepo.setHash(orgId, code, hashContent(rawContent));
  }

  // 4. Emit webhook if configured
  if (org.webhookUrl && toProcess.length > 0) {
    await emitWebhook(org.webhookUrl, { orgId, updatedJurisdictions: toProcess });
  }
}
```

### Normalizer — Claude API Integration (`src/agent/normalizer.ts`)

The normalizer calls Claude API to extract structured regulatory rules from raw scraped content.

```typescript
async function normalize(
  jurisdictionCode: string,
  sectors: string[],
  rawContent: string
): Promise<NormalizedRegulation[]> {

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are a regulatory intelligence analyst. Extract structured regulatory rules
             from government website content. Return ONLY valid JSON — no preamble, no markdown.
             Schema: { regulations: Array<{ title, body, sector, summary, keyObligations,
             effectiveDate, penaltyFramework: { maxFine, currency, criminalLiability, notes },
             sourceUrl }> }`,
    messages: [{
      role: 'user',
      content: `Jurisdiction: ${jurisdictionCode}
                Relevant sectors: ${sectors.join(', ')}
                Raw content:
                ${rawContent.slice(0, 50000)}`  // Token guard
    }]
  });

  const text = response.content.map(b => b.type === 'text' ? b.text : '').join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim()).regulations;
}
```

### Scheduler (`src/agent/scheduler.ts`)

```typescript
// Weekly baseline — every Sunday at 02:00 UTC
cron.schedule(env.WEEKLY_CRON_SCHEDULE ?? '0 2 * * 0', async () => {
  const allOrgs = await orgRepo.getAllOrgs();
  for (const org of allOrgs) {
    await runAgentForOrg(org.orgId, { force: false });
  }
});

// Change detection polling — every N hours
cron.schedule(`0 */${env.CHANGE_DETECTION_INTERVAL_HOURS ?? 6} * * *`, async () => {
  const allOrgs = await orgRepo.getAllOrgs();
  for (const org of allOrgs) {
    await runAgentForOrg(org.orgId, { force: false });
  }
});
```

---

## Environment Variables

```env
# Required
NODE_ENV=production
PORT=3000
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# Storage (one adapter required)
STORAGE_ADAPTER=postgres                            # postgres | mysql | cosmos | dynamo
DATABASE_URL=postgresql://user:pass@host:5432/arie  # For postgres / mysql

# Cosmos DB (if adapter=cosmos)
COSMOS_ENDPOINT=https://xxxx.documents.azure.com
COSMOS_KEY=xxxxxxxxxxxx
COSMOS_DATABASE=arie

# DynamoDB (if adapter=dynamo)
AWS_REGION=us-east-1
DYNAMO_TABLE_PREFIX=arie_

# Agent config
WEEKLY_CRON_SCHEDULE=0 2 * * 0
CHANGE_DETECTION_INTERVAL_HOURS=6

# Security
API_KEY_SALT=your-random-salt-here
```

---

## Deployment Patterns

### Docker (Any Cloud / On-Prem)

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml (local dev)
services:
  arie:
    build: .
    ports:
      - "3000:3000"
    environment:
      - STORAGE_ADAPTER=postgres
      - DATABASE_URL=postgresql://arie:arie@db:5432/arie
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: arie
      POSTGRES_PASSWORD: arie
      POSTGRES_DB: arie
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Web Application Deployment

ARIE ships with an optional web application layer — a React-based admin portal that wraps the
REST API and gives organizations a browser-based interface to manage their regulatory intelligence
without writing any code.

#### Web App Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS |
| API Communication | REST calls to ARIE backend (`/api/v1`) |
| Auth | API key stored in session (org-scoped) |
| Hosting | Any static/SSR host — Vercel, Azure Static Web Apps, AWS Amplify, Nginx |

#### Web App Directory Structure

```
arie-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                      # Dashboard — regulation summary + agent status
│   ├── jurisdictions/
│   │   └── page.tsx                  # Jurisdiction footprint manager
│   ├── regulations/
│   │   ├── page.tsx                  # Regulation browser with search + filters
│   │   └── [id]/page.tsx             # Regulation detail view
│   ├── compliance/
│   │   └── page.tsx                  # Compliance check form + report viewer
│   ├── agent/
│   │   └── page.tsx                  # Agent run history + manual trigger
│   └── settings/
│       └── page.tsx                  # Org config — sectors, webhooks, storage
├── components/
│   ├── RegulationCard.tsx
│   ├── JurisdictionMap.tsx           # Visual world map of active jurisdictions
│   ├── ComplianceReport.tsx
│   └── AgentRunStatus.tsx
└── lib/
    └── api-client.ts                 # Typed REST client for ARIE backend
```

#### Key Web App Features

| Feature | Description |
|---|---|
| **Dashboard** | Live summary of regulations per jurisdiction, recent agent runs, change alerts |
| **Jurisdiction Manager** | Add/remove jurisdictions from org footprint via a visual world map |
| **Regulation Browser** | Search, filter, and paginate regulations across all active jurisdictions |
| **Compliance Checker** | Natural language scenario input → structured compliance report rendered in UI |
| **Agent Console** | View run history, trigger manual runs, monitor status in real time |
| **Org Settings** | Configure sectors, webhook URL, fetch cadence, and storage adapter |

#### Environment Variables (Web App)

```env
NEXT_PUBLIC_ARIE_API_URL=https://your-arie-backend.com/api/v1
```

#### Deployment — Vercel (Recommended for Web App)

```bash
# From arie-web/
vercel deploy --prod
```

Set `NEXT_PUBLIC_ARIE_API_URL` in Vercel project settings pointing to your ARIE backend.

#### Deployment — Azure Static Web Apps

```yaml
# .github/workflows/azure-static-web-apps.yml
- name: Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: upload
    app_location: /arie-web
    output_location: .next
```

#### Deployment — Self-Hosted (Nginx + Docker)

```dockerfile
# arie-web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
EXPOSE 3001
CMD ["node", "server.js"]
```

Add to `docker-compose.yml`:

```yaml
  arie-web:
    build: ./arie-web
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_ARIE_API_URL=http://arie:3000/api/v1
    depends_on:
      - arie
```

---

### Cloud Deployment Options

| Platform | How |
|---|---|
| **Azure App Service** | Deploy Docker container; use Cosmos DB adapter |
| **AWS ECS/Fargate** | Deploy Docker container; use DynamoDB adapter |
| **GCP Cloud Run** | Deploy Docker container; use PostgreSQL via Cloud SQL |
| **Kubernetes** | Deploy as Deployment + CronJob for scheduler |
| **On-prem** | Docker Compose or bare Node.js with any supported DB |
| **Web App (Vercel)** | Deploy `arie-web` Next.js frontend; point to any hosted ARIE backend |
| **Web App (Azure SWA)** | Deploy `arie-web` via GitHub Actions to Azure Static Web Apps |
| **Web App (Self-hosted)** | Docker Compose — `arie` backend + `arie-web` frontend on same stack |

---

## Key Conventions

- **No mock or hardcoded data** — all regulatory content must come from live government sources
- All database access goes through repository interfaces — never call a DB client directly in agent or API code
- All Claude API calls go through `src/agent/normalizer.ts` — no scattered API calls elsewhere
- Every agent run must be logged to `IAgentRunRepository` — full audit trail required
- Org API keys are always stored hashed (bcrypt) — never in plaintext
- All responses include ISO 8601 timestamps in UTC
- Pagination is required on all list endpoints — no unbounded queries
- Webhook payloads must be idempotent — consumers may receive duplicate events

---

## Extending the System

### Adding a New Storage Adapter
1. Create `src/storage/adapters/{name}.adapter.ts`
2. Implement `IRegulationRepository`, `IOrgRepository`, `IAgentRunRepository`, `IChangeHashRepository`
3. Register in `src/storage/factory.ts`
4. Document in `docs/storage-adapters.md`

### Adding a New Jurisdiction
1. Add entry to `src/config/jurisdictions.ts` with jurisdiction code, regulatory bodies, and RSS feed URL (if available)
2. The agent will automatically include it when orgs add it to their footprint

### Exposing as MCP Server (Optional)
Wrap REST API endpoints as MCP tools in a thin `mcp-wrapper/` layer. This enables Claude-native
integrations (Copilot Studio, Power Apps via Custom Connector) without duplicating business logic.

---

*Document version: 1.0.0 — July 2026*
*Built for use with Claude Code, GitHub Copilot, and other AI coding tools*
