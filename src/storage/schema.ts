import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { ChangeRecord, PenaltyFramework } from '../types/regulation.types';
import { FetchCadenceConfig } from '../types/org.types';

export const orgs = pgTable('orgs', {
  orgId: varchar('org_id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  apiKeyHash: varchar('api_key_hash', { length: 255 }).notNull(),
  jurisdictionFootprint: jsonb('jurisdiction_footprint').$type<string[]>().notNull(),
  sectors: jsonb('sectors').$type<string[]>().notNull(),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  fetchCadenceConfig: jsonb('fetch_cadence_config').$type<FetchCadenceConfig>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const regulations = pgTable('regulations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  orgId: varchar('org_id', { length: 36 })
    .notNull()
    .references(() => orgs.orgId, { onDelete: 'cascade' }),
  jurisdictionCode: varchar('jurisdiction_code', { length: 10 }).notNull(),
  title: text('title').notNull(),
  body: varchar('body', { length: 500 }),
  sector: varchar('sector', { length: 100 }),
  summary: text('summary'),
  keyObligations: jsonb('key_obligations').$type<string[]>(),
  effectiveDate: varchar('effective_date', { length: 20 }),
  penaltyFramework: jsonb('penalty_framework').$type<PenaltyFramework>(),
  sourceUrl: text('source_url'),
  contentHash: varchar('content_hash', { length: 64 }),
  changeDetected: boolean('change_detected').default(false).notNull(),
  changeHistory: jsonb('change_history').$type<ChangeRecord[]>(),
  lastFetchedAt: timestamp('last_fetched_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const agentRuns = pgTable('agent_runs', {
  runId: varchar('run_id', { length: 36 }).primaryKey(),
  orgId: varchar('org_id', { length: 36 })
    .notNull()
    .references(() => orgs.orgId, { onDelete: 'cascade' }),
  trigger: varchar('trigger', { length: 50 }).notNull(),
  jurisdictions: jsonb('jurisdictions').$type<string[]>(),
  status: varchar('status', { length: 50 }).notNull(),
  regulationsUpdated: integer('regulations_updated').default(0).notNull(),
  changesDetected: integer('changes_detected').default(0).notNull(),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const jurisdictionHashes = pgTable(
  'jurisdiction_hashes',
  {
    orgId: varchar('org_id', { length: 36 })
      .notNull()
      .references(() => orgs.orgId, { onDelete: 'cascade' }),
    jurisdictionCode: varchar('jurisdiction_code', { length: 10 }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.jurisdictionCode] }),
  }),
);

export type OrgRow = typeof orgs.$inferSelect;
export type RegulationRow = typeof regulations.$inferSelect;
export type AgentRunRow = typeof agentRuns.$inferSelect;
export type JurisdictionHashRow = typeof jurisdictionHashes.$inferSelect;
