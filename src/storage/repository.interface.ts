import { OrgConfig, CreateOrgInput, UpdateOrgInput } from '../types/org.types';
import { Regulation, RegulationFilters, PaginatedResult } from '../types/regulation.types';
import { AgentRun, CreateAgentRunInput } from '../types/agent.types';

// ─── Org Repository ──────────────────────────────────────────────────────────

export interface IOrgRepository {
  createOrg(input: CreateOrgInput, apiKeyHash: string): Promise<OrgConfig>;
  getOrgByApiKeyHash(hash: string): Promise<OrgConfig | null>;
  getOrgById(orgId: string): Promise<OrgConfig | null>;
  getAllOrgs(): Promise<OrgConfig[]>;
  updateOrg(orgId: string, updates: UpdateOrgInput): Promise<OrgConfig>;
  deleteOrg(orgId: string): Promise<void>;
}

// ─── Regulation Repository ───────────────────────────────────────────────────

export interface IRegulationRepository {
  upsertRegulation(orgId: string, regulation: Omit<Regulation, 'orgId' | 'createdAt' | 'updatedAt'>): Promise<Regulation>;
  getRegulationById(orgId: string, id: string): Promise<Regulation | null>;
  queryRegulations(orgId: string, filters: RegulationFilters): Promise<PaginatedResult<Regulation>>;
  getRegulationsByJurisdiction(orgId: string, jurisdictionCode: string): Promise<Regulation[]>;
  deleteRegulation(orgId: string, id: string): Promise<void>;
  deleteAllForOrg(orgId: string): Promise<void>;
}

// ─── Agent Run Repository ────────────────────────────────────────────────────

export interface IAgentRunRepository {
  createRun(input: CreateAgentRunInput): Promise<AgentRun>;
  updateRun(runId: string, updates: Partial<AgentRun>): Promise<AgentRun>;
  getRunById(runId: string): Promise<AgentRun | null>;
  listRuns(orgId: string, limit?: number): Promise<AgentRun[]>;
}

// ─── Change Hash Repository ──────────────────────────────────────────────────

export interface IChangeHashRepository {
  getHash(orgId: string, jurisdictionCode: string): Promise<string | null>;
  setHash(orgId: string, jurisdictionCode: string, hash: string): Promise<void>;
  deleteHash(orgId: string, jurisdictionCode: string): Promise<void>;
}

// ─── Aggregate Storage Adapters ──────────────────────────────────────────────

export interface StorageAdapters {
  orgs: IOrgRepository;
  regulations: IRegulationRepository;
  agentRuns: IAgentRunRepository;
  changeHashes: IChangeHashRepository;
  /** Called once on startup to set up tables/collections */
  initialize(): Promise<void>;
  /** Called on shutdown to close connections */
  close(): Promise<void>;
}
