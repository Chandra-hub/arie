export interface OrgConfig {
  orgId: string;
  name: string;
  apiKeyHash: string;
  jurisdictionFootprint: string[];   // ISO 3166-1 alpha-2 codes e.g. ["GB", "US", "AU"]
  sectors: string[];                 // e.g. ["water", "chemical", "manufacturing"]
  webhookUrl?: string;
  fetchCadenceConfig?: FetchCadenceConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface FetchCadenceConfig {
  weeklySchedule?: string;           // cron expression
  changeDetectionIntervalHours?: number;
}

export interface OrgContext {
  orgId: string;
  jurisdictionFootprint: string[];
  sectors: string[];
}

export interface CreateOrgInput {
  name: string;
  jurisdictionFootprint: string[];
  sectors: string[];
  webhookUrl?: string;
  fetchCadenceConfig?: FetchCadenceConfig;
}

export interface UpdateOrgInput {
  name?: string;
  jurisdictionFootprint?: string[];
  sectors?: string[];
  webhookUrl?: string;
  fetchCadenceConfig?: FetchCadenceConfig;
}

export interface CreateOrgResult {
  orgId: string;
  apiKey: string;  // Plaintext — returned once only
}

export interface StorageConfig {
  adapter: 'postgres' | 'mysql' | 'cosmos' | 'dynamo';
  connectionString?: string;         // postgres | mysql
  endpoint?: string;                 // cosmos
  key?: string;                      // cosmos
  database?: string;                 // cosmos
  region?: string;                   // dynamo
  tablePrefix?: string;              // dynamo
}
