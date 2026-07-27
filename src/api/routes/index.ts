import { FastifyInstance } from 'fastify';
import { StorageAdapters } from '../../storage/repository.interface';
import { JURISDICTION_REGISTRY, getJurisdictionsForFootprint } from '../../config/jurisdictions';
import { runAgentForOrg } from '../../agent/orchestrator';
import { buildAuthMiddleware, hashApiKey, generateApiKey } from '../middleware/auth';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { randomUUID } from 'crypto';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ─── Health ──────────────────────────────────────────────────────────────────

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    reply.send({
      status: 'ok',
      version: process.env.npm_package_version ?? '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
}

// ─── Org Management ───────────────────────────────────────────────────────────

export function orgRoutes(storage: StorageAdapters) {
  const auth = buildAuthMiddleware(storage);

  return async (app: FastifyInstance) => {
    // Register a new org
    app.post('/', async (request, reply) => {
      const body = request.body as {
        name: string;
        jurisdictionFootprint: string[];
        sectors: string[];
        webhookUrl?: string;
        fetchCadenceConfig?: { weeklySchedule?: string; changeDetectionIntervalHours?: number };
      };

      if (!body.name || !body.jurisdictionFootprint?.length || !body.sectors?.length) {
        return reply.status(400).send({ error: 'name, jurisdictionFootprint, and sectors are required' });
      }

      const plainApiKey = generateApiKey();
      const apiKeyHash = hashApiKey(plainApiKey);

      const org = await storage.orgs.createOrg(
        {
          name: body.name,
          jurisdictionFootprint: body.jurisdictionFootprint,
          sectors: body.sectors,
          webhookUrl: body.webhookUrl,
          fetchCadenceConfig: body.fetchCadenceConfig,
        },
        apiKeyHash,
      );

      reply.status(201).send({
        orgId: org.orgId,
        apiKey: plainApiKey,
        message: 'Organization registered. Store your API key securely — it will not be shown again.',
      });
    });

    // Get current org
    app.get('/me', { preHandler: auth }, async (request, reply) => {
      const org = await storage.orgs.getOrgById(request.orgContext.orgId);
      if (!org) return reply.status(404).send({ error: 'Org not found' });

      reply.send({
        orgId: org.orgId,
        name: org.name,
        jurisdictionFootprint: org.jurisdictionFootprint,
        sectors: org.sectors,
        webhookUrl: org.webhookUrl,
        fetchCadenceConfig: org.fetchCadenceConfig,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      });
    });

    // Update org
    app.patch('/me', { preHandler: auth }, async (request, reply) => {
      const body = request.body as {
        name?: string;
        jurisdictionFootprint?: string[];
        sectors?: string[];
        webhookUrl?: string;
      };

      const updated = await storage.orgs.updateOrg(request.orgContext.orgId, body);
      reply.send({
        orgId: updated.orgId,
        jurisdictionFootprint: updated.jurisdictionFootprint,
        updatedAt: updated.updatedAt,
      });
    });
  };
}

// ─── Jurisdictions ───────────────────────────────────────────────────────────

export function jurisdictionRoutes(storage: StorageAdapters) {
  const auth = buildAuthMiddleware(storage);

  return async (app: FastifyInstance) => {
    // List all globally supported jurisdictions
    app.get('/', { preHandler: auth }, async (request, reply) => {
      const footprint = request.orgContext.jurisdictionFootprint;

      const jurisdictions = JURISDICTION_REGISTRY.map((j) => ({
        code: j.code,
        name: j.name,
        regulatoryBodies: j.regulatoryBodies,
        sectors: j.sectors,
        rssFeedAvailable: !!j.rssFeedUrl,
        inOrgFootprint: footprint.includes(j.code),
      }));

      reply.send({ jurisdictions, total: jurisdictions.length });
    });

    // Get regulations for a specific jurisdiction
    app.get('/:code/regulations', { preHandler: auth }, async (request, reply) => {
      const { code } = request.params as { code: string };
      const query = request.query as {
        sector?: string;
        page?: string;
        limit?: string;
      };

      if (!request.orgContext.jurisdictionFootprint.includes(code.toUpperCase())) {
        return reply.status(403).send({ error: 'Jurisdiction not in your footprint' });
      }

      const result = await storage.regulations.queryRegulations(request.orgContext.orgId, {
        jurisdictionCode: code.toUpperCase(),
        sector: query.sector,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
      });

      reply.send({
        jurisdiction: code.toUpperCase(),
        regulations: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    });
  };
}

// ─── Regulations ─────────────────────────────────────────────────────────────

export function regulationRoutes(storage: StorageAdapters) {
  const auth = buildAuthMiddleware(storage);

  return async (app: FastifyInstance) => {
    // Query regulations across footprint
    app.get('/', { preHandler: auth }, async (request, reply) => {
      const query = request.query as {
        sector?: string;
        jurisdiction?: string;
        changedSince?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

      const result = await storage.regulations.queryRegulations(request.orgContext.orgId, {
        jurisdictionCode: query.jurisdiction?.toUpperCase(),
        sector: query.sector,
        changedSince: query.changedSince ? new Date(query.changedSince) : undefined,
        search: query.search,
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
      });

      reply.send({
        regulations: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    });

    // Get single regulation
    app.get('/:id', { preHandler: auth }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const regulation = await storage.regulations.getRegulationById(
        request.orgContext.orgId,
        id,
      );

      if (!regulation) return reply.status(404).send({ error: 'Regulation not found' });
      reply.send(regulation);
    });
  };
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export function complianceRoutes(storage: StorageAdapters) {
  const auth = buildAuthMiddleware(storage);

  return async (app: FastifyInstance) => {
    app.post('/check', { preHandler: auth }, async (request, reply) => {
      const body = request.body as {
        jurisdictions?: string[];
        sector?: string;
        scenario: string;
      };

      if (!body.scenario) {
        return reply.status(400).send({ error: 'scenario is required' });
      }

      const jurisdictions =
        body.jurisdictions ?? request.orgContext.jurisdictionFootprint;

      // Gather relevant regulations for context
      const allRegulations = [];
      for (const code of jurisdictions) {
        const regs = await storage.regulations.getRegulationsByJurisdiction(
          request.orgContext.orgId,
          code,
        );
        allRegulations.push(...regs.filter((r) => !body.sector || r.sector === body.sector));
      }

      const regulationsContext = allRegulations
        .slice(0, 30) // Cap context size
        .map(
          (r) =>
            `[${r.jurisdictionCode}] ${r.title} (${r.body ?? 'Unknown body'}): ${r.summary ?? ''} Obligations: ${r.keyObligations?.join('; ') ?? 'N/A'} Penalties: ${JSON.stringify(r.penaltyFramework ?? {})}`,
        )
        .join('\n\n');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: `You are a regulatory compliance analyst. Given an operational scenario and a set of 
                 regulations, assess compliance status and provide actionable findings.
                 Return ONLY valid JSON. Schema:
                 { "status": "compliant"|"non_compliant"|"review_required",
                   "findings": [{ "jurisdiction", "regulation", "status", "details", "action", "penaltyIfNonCompliant" }] }`,
        messages: [
          {
            role: 'user',
            content: `Scenario: ${body.scenario}\n\nJurisdictions: ${jurisdictions.join(', ')}\n\nRelevant Regulations:\n${regulationsContext}`,
          },
        ],
      });

      const rawText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const parsed = JSON.parse(rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());

      reply.send({
        complianceReport: {
          ...parsed,
          checkedJurisdictions: jurisdictions,
          generatedAt: new Date().toISOString(),
        },
      });
    });
  };
}

// ─── Agent Control ───────────────────────────────────────────────────────────

export function agentRoutes(storage: StorageAdapters) {
  const auth = buildAuthMiddleware(storage);

  return async (app: FastifyInstance) => {
    // Trigger manual run
    app.post('/run', { preHandler: auth }, async (request, reply) => {
      const body = request.body as {
        jurisdictions?: string[];
        force?: boolean;
      };

      const { orgId } = request.orgContext;

      // Queue asynchronously — return 202 immediately
      const runId = randomUUID();
      reply.status(202).send({
        runId,
        status: 'queued',
        message: `Agent run queued${body.jurisdictions ? ` for: ${body.jurisdictions.join(', ')}` : ' for full footprint'}`,
        estimatedDuration: '2-5 minutes',
      });

      // Run in background
      setImmediate(async () => {
        try {
          await runAgentForOrg(
            orgId,
            {
              trigger: 'manual',
              jurisdictions: body.jurisdictions,
              force: body.force ?? false,
            },
            storage,
          );
        } catch (_err) {
          // Error already logged in orchestrator
        }
      });
    });

    // List run history
    app.get('/runs', { preHandler: auth }, async (request, reply) => {
      const runs = await storage.agentRuns.listRuns(request.orgContext.orgId);
      reply.send({ runs });
    });

    // Get specific run
    app.get('/runs/:runId', { preHandler: auth }, async (request, reply) => {
      const { runId } = request.params as { runId: string };
      const run = await storage.agentRuns.getRunById(runId);

      if (!run || run.orgId !== request.orgContext.orgId) {
        return reply.status(404).send({ error: 'Run not found' });
      }

      reply.send(run);
    });
  };
}
