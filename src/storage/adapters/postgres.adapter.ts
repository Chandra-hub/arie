import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, ilike, gte, desc, sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import * as schema from '../schema';
import {
  StorageAdapters,
  IOrgRepository,
  IRegulationRepository,
  IAgentRunRepository,
  IChangeHashRepository,
} from '../repository.interface';
import { OrgConfig, CreateOrgInput, UpdateOrgInput } from '../../types/org.types';
import { Regulation, RegulationFilters, PaginatedResult } from '../../types/regulation.types';
import { AgentRun, CreateAgentRunInput } from '../../types/agent.types';

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function rowToOrg(row: schema.OrgRow): OrgConfig {
  return {
    orgId: row.orgId,
    name: row.name,
    apiKeyHash: row.apiKeyHash,
    jurisdictionFootprint: row.jurisdictionFootprint as string[],
    sectors: row.sectors as string[],
    webhookUrl: row.webhookUrl ?? undefined,
    fetchCadenceConfig: row.fetchCadenceConfig ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToRegulation(row: schema.RegulationRow): Regulation {
  return {
    id: row.id,
    orgId: row.orgId,
    jurisdictionCode: row.jurisdictionCode,
    title: row.title,
    body: row.body ?? undefined,
    sector: row.sector ?? undefined,
    summary: row.summary ?? undefined,
    keyObligations: (row.keyObligations as string[]) ?? undefined,
    effectiveDate: row.effectiveDate ?? undefined,
    penaltyFramework: row.penaltyFramework ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    contentHash: row.contentHash ?? undefined,
    changeDetected: row.changeDetected,
    changeHistory: (row.changeHistory as Regulation['changeHistory']) ?? undefined,
    lastFetchedAt: row.lastFetchedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToAgentRun(row: schema.AgentRunRow): AgentRun {
  return {
    runId: row.runId,
    orgId: row.orgId,
    trigger: row.trigger as AgentRun['trigger'],
    jurisdictions: (row.jurisdictions as string[]) ?? undefined,
    status: row.status as AgentRun['status'],
    regulationsUpdated: row.regulationsUpdated,
    changesDetected: row.changesDetected,
    error: row.error ?? undefined,
    startedAt: row.startedAt,
    completedAt: row.completedAt ?? undefined,
  };
}

// ─── Repository Implementations ──────────────────────────────────────────────

class PostgresOrgRepository implements IOrgRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async createOrg(input: CreateOrgInput, apiKeyHash: string): Promise<OrgConfig> {
    const [row] = await this.db
      .insert(schema.orgs)
      .values({
        orgId: randomUUID(),
        name: input.name,
        apiKeyHash,
        jurisdictionFootprint: input.jurisdictionFootprint,
        sectors: input.sectors,
        webhookUrl: input.webhookUrl ?? null,
        fetchCadenceConfig: input.fetchCadenceConfig ?? null,
      })
      .returning();
    return rowToOrg(row);
  }

  async getOrgByApiKeyHash(hash: string): Promise<OrgConfig | null> {
    const [row] = await this.db
      .select()
      .from(schema.orgs)
      .where(eq(schema.orgs.apiKeyHash, hash))
      .limit(1);
    return row ? rowToOrg(row) : null;
  }

  async getOrgById(orgId: string): Promise<OrgConfig | null> {
    const [row] = await this.db
      .select()
      .from(schema.orgs)
      .where(eq(schema.orgs.orgId, orgId))
      .limit(1);
    return row ? rowToOrg(row) : null;
  }

  async getAllOrgs(): Promise<OrgConfig[]> {
    const rows = await this.db.select().from(schema.orgs);
    return rows.map(rowToOrg);
  }

  async updateOrg(orgId: string, updates: UpdateOrgInput): Promise<OrgConfig> {
    const [row] = await this.db
      .update(schema.orgs)
      .set({
        ...(updates.name && { name: updates.name }),
        ...(updates.jurisdictionFootprint && {
          jurisdictionFootprint: updates.jurisdictionFootprint,
        }),
        ...(updates.sectors && { sectors: updates.sectors }),
        ...(updates.webhookUrl !== undefined && { webhookUrl: updates.webhookUrl }),
        ...(updates.fetchCadenceConfig !== undefined && {
          fetchCadenceConfig: updates.fetchCadenceConfig,
        }),
        updatedAt: new Date(),
      })
      .where(eq(schema.orgs.orgId, orgId))
      .returning();
    return rowToOrg(row);
  }

  async deleteOrg(orgId: string): Promise<void> {
    await this.db.delete(schema.orgs).where(eq(schema.orgs.orgId, orgId));
  }
}

class PostgresRegulationRepository implements IRegulationRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async upsertRegulation(
    orgId: string,
    regulation: Omit<Regulation, 'orgId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Regulation> {
    const id = regulation.id || randomUUID();
    const now = new Date();

    const [row] = await this.db
      .insert(schema.regulations)
      .values({
        id,
        orgId,
        jurisdictionCode: regulation.jurisdictionCode,
        title: regulation.title,
        body: regulation.body ?? null,
        sector: regulation.sector ?? null,
        summary: regulation.summary ?? null,
        keyObligations: regulation.keyObligations ?? null,
        effectiveDate: regulation.effectiveDate ?? null,
        penaltyFramework: regulation.penaltyFramework ?? null,
        sourceUrl: regulation.sourceUrl ?? null,
        contentHash: regulation.contentHash ?? null,
        changeDetected: regulation.changeDetected,
        changeHistory: regulation.changeHistory ?? null,
        lastFetchedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.regulations.id,
        set: {
          title: regulation.title,
          body: regulation.body ?? null,
          sector: regulation.sector ?? null,
          summary: regulation.summary ?? null,
          keyObligations: regulation.keyObligations ?? null,
          effectiveDate: regulation.effectiveDate ?? null,
          penaltyFramework: regulation.penaltyFramework ?? null,
          sourceUrl: regulation.sourceUrl ?? null,
          contentHash: regulation.contentHash ?? null,
          changeDetected: regulation.changeDetected,
          changeHistory: regulation.changeHistory ?? null,
          lastFetchedAt: now,
          updatedAt: now,
        },
      })
      .returning();
    return rowToRegulation(row);
  }

  async getRegulationById(orgId: string, id: string): Promise<Regulation | null> {
    const [row] = await this.db
      .select()
      .from(schema.regulations)
      .where(and(eq(schema.regulations.orgId, orgId), eq(schema.regulations.id, id)))
      .limit(1);
    return row ? rowToRegulation(row) : null;
  }

  async queryRegulations(
    orgId: string,
    filters: RegulationFilters,
  ): Promise<PaginatedResult<Regulation>> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.regulations.orgId, orgId)];

    if (filters.jurisdictionCode) {
      conditions.push(eq(schema.regulations.jurisdictionCode, filters.jurisdictionCode));
    }
    if (filters.sector) {
      conditions.push(eq(schema.regulations.sector, filters.sector));
    }
    if (filters.changedSince) {
      conditions.push(gte(schema.regulations.updatedAt, filters.changedSince));
    }
    if (filters.search) {
      conditions.push(ilike(schema.regulations.title, `%${filters.search}%`));
    }

    const whereClause = and(...conditions);

    const [rows, countResult] = await Promise.all([
      this.db
        .select()
        .from(schema.regulations)
        .where(whereClause)
        .orderBy(desc(schema.regulations.updatedAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(schema.regulations)
        .where(whereClause),
    ]);

    return {
      data: rows.map(rowToRegulation),
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  async getRegulationsByJurisdiction(
    orgId: string,
    jurisdictionCode: string,
  ): Promise<Regulation[]> {
    const rows = await this.db
      .select()
      .from(schema.regulations)
      .where(
        and(
          eq(schema.regulations.orgId, orgId),
          eq(schema.regulations.jurisdictionCode, jurisdictionCode),
        ),
      )
      .orderBy(desc(schema.regulations.updatedAt));
    return rows.map(rowToRegulation);
  }

  async deleteRegulation(orgId: string, id: string): Promise<void> {
    await this.db
      .delete(schema.regulations)
      .where(and(eq(schema.regulations.orgId, orgId), eq(schema.regulations.id, id)));
  }

  async deleteAllForOrg(orgId: string): Promise<void> {
    await this.db
      .delete(schema.regulations)
      .where(eq(schema.regulations.orgId, orgId));
  }
}

class PostgresAgentRunRepository implements IAgentRunRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async createRun(input: CreateAgentRunInput): Promise<AgentRun> {
    const [row] = await this.db
      .insert(schema.agentRuns)
      .values({
        runId: randomUUID(),
        orgId: input.orgId,
        trigger: input.trigger,
        jurisdictions: input.jurisdictions ?? null,
        status: 'queued',
        regulationsUpdated: 0,
        changesDetected: 0,
      })
      .returning();
    return rowToAgentRun(row);
  }

  async updateRun(runId: string, updates: Partial<AgentRun>): Promise<AgentRun> {
    const [row] = await this.db
      .update(schema.agentRuns)
      .set({
        ...(updates.status && { status: updates.status }),
        ...(updates.regulationsUpdated !== undefined && {
          regulationsUpdated: updates.regulationsUpdated,
        }),
        ...(updates.changesDetected !== undefined && {
          changesDetected: updates.changesDetected,
        }),
        ...(updates.error !== undefined && { error: updates.error }),
        ...(updates.completedAt && { completedAt: updates.completedAt }),
      })
      .where(eq(schema.agentRuns.runId, runId))
      .returning();
    return rowToAgentRun(row);
  }

  async getRunById(runId: string): Promise<AgentRun | null> {
    const [row] = await this.db
      .select()
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.runId, runId))
      .limit(1);
    return row ? rowToAgentRun(row) : null;
  }

  async listRuns(orgId: string, limit = 20): Promise<AgentRun[]> {
    const rows = await this.db
      .select()
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.orgId, orgId))
      .orderBy(desc(schema.agentRuns.startedAt))
      .limit(limit);
    return rows.map(rowToAgentRun);
  }
}

class PostgresChangeHashRepository implements IChangeHashRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async getHash(orgId: string, jurisdictionCode: string): Promise<string | null> {
    const [row] = await this.db
      .select()
      .from(schema.jurisdictionHashes)
      .where(
        and(
          eq(schema.jurisdictionHashes.orgId, orgId),
          eq(schema.jurisdictionHashes.jurisdictionCode, jurisdictionCode),
        ),
      )
      .limit(1);
    return row?.contentHash ?? null;
  }

  async setHash(orgId: string, jurisdictionCode: string, hash: string): Promise<void> {
    await this.db
      .insert(schema.jurisdictionHashes)
      .values({ orgId, jurisdictionCode, contentHash: hash })
      .onConflictDoUpdate({
        target: [schema.jurisdictionHashes.orgId, schema.jurisdictionHashes.jurisdictionCode],
        set: { contentHash: hash, updatedAt: new Date() },
      });
  }

  async deleteHash(orgId: string, jurisdictionCode: string): Promise<void> {
    await this.db
      .delete(schema.jurisdictionHashes)
      .where(
        and(
          eq(schema.jurisdictionHashes.orgId, orgId),
          eq(schema.jurisdictionHashes.jurisdictionCode, jurisdictionCode),
        ),
      );
  }
}

// ─── PostgreSQL Adapter Factory ──────────────────────────────────────────────

export function createPostgresAdapters(connectionString: string): StorageAdapters {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  return {
    orgs: new PostgresOrgRepository(db),
    regulations: new PostgresRegulationRepository(db),
    agentRuns: new PostgresAgentRunRepository(db),
    changeHashes: new PostgresChangeHashRepository(db),

    async initialize() {
      // Run Drizzle migrations: npx drizzle-kit migrate
      // Tables are created via: npm run db:migrate
      await pool.query('SELECT 1'); // Health check
    },

    async close() {
      await pool.end();
    },
  };
}
