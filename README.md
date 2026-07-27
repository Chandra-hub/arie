# ARIE — Agentic Regulatory Intelligence Engine

A cloud-agnostic, multi-tenant agentic AI platform that autonomously monitors government
regulatory websites across global jurisdictions, detects changes, normalizes rules via Claude AI,
and exposes compliance intelligence via a REST API.

## Architecture

```
┌─────────────────┐     REST API      ┌──────────────────────┐
│   arie-web      │ ◄───────────────► │   ARIE Engine        │
│  (Next.js UI)   │                   │  (Fastify + Agent)   │
└─────────────────┘                   └──────────┬───────────┘
                                                  │
                              ┌───────────────────┼──────────────────┐
                              ▼                   ▼                  ▼
                         PostgreSQL          Claude API         Gov Websites
                        (pluggable)       (Normalization)       (Scraping)
```

## Quick Start (Docker)

```bash
# 1. Clone
git clone https://github.com/Chandra-hub/arie.git && cd arie

# 2. Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and API_KEY_SALT

# 3. Start the full stack
docker compose up -d

# 4. Run database migrations
docker compose exec arie npm run db:migrate

# API is live at http://localhost:3000
# Web UI is live at http://localhost:3001
```

## Local Development

### Backend (ARIE Engine)

```bash
cd arie/
npm install
cp .env.example .env   # fill in your values

# Start PostgreSQL (requires Docker)
docker compose up db -d

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

### Frontend (arie-web)

```bash
cd arie-web/
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_ARIE_API_URL

npm run dev   # http://localhost:3001
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `STORAGE_ADAPTER` | ✅ | `postgres` \| `mysql` \| `cosmos` \| `dynamo` |
| `DATABASE_URL` | ✅ (postgres/mysql) | Connection string |
| `API_KEY_SALT` | ✅ | Random string for API key hashing |
| `WEEKLY_CRON_SCHEDULE` | ❌ | Cron expression (default: `0 2 * * 0`) |
| `CHANGE_DETECTION_INTERVAL_HOURS` | ❌ | Poll interval (default: `6`) |

## API Reference

### Register an Organisation

```bash
curl -X POST http://localhost:3000/api/v1/orgs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Chemical Corp",
    "jurisdictionFootprint": ["GB", "US", "AU", "DE"],
    "sectors": ["chemical", "water", "manufacturing"]
  }'
# Returns: { "orgId": "...", "apiKey": "arie_live_..." }
```

### Trigger an Agent Run

```bash
curl -X POST http://localhost:3000/api/v1/agent/run \
  -H "X-Api-Key: arie_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "force": true }'
```

### Check Compliance

```bash
curl -X POST http://localhost:3000/api/v1/compliance/check \
  -H "X-Api-Key: arie_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "We discharge 500m3/day of treated wastewater into a river at our UK facility.",
    "jurisdictions": ["GB"],
    "sector": "water"
  }'
```

## Supported Jurisdictions

| Code | Country | Regulatory Bodies |
|---|---|---|
| GB | United Kingdom | Environment Agency, HSE, DEFRA |
| US | United States | EPA, OSHA, DOT |
| AU | Australia | DCCEEW, Safe Work Australia |
| DE | Germany | UBA, BAuA |
| JP | Japan | Ministry of Environment, METI |
| SG | Singapore | NEA, PUB |
| CA | Canada | ECCC, Health Canada |
| NL | Netherlands | RIVM, Rijkswaterstaat |
| FR | France | ADEME, DREAL |
| IN | India | CPCB, MoEFCC |

## Adding a New Storage Adapter

See [docs/storage-adapters.md](docs/storage-adapters.md).

## Tech Stack

- **Engine**: TypeScript, Fastify, Claude API (Anthropic SDK)
- **Agent**: node-cron, axios, cheerio, rss-parser
- **Storage**: Drizzle ORM, PostgreSQL (pluggable via adapter pattern)
- **Web UI**: Next.js 14, Tailwind CSS, shadcn/ui
- **Deployment**: Docker, Docker Compose

## License

MIT
