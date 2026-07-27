export type AgentRunTrigger = 'scheduled' | 'manual' | 'event';
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface AgentRun {
  runId: string;
  orgId: string;
  trigger: AgentRunTrigger;
  jurisdictions?: string[];          // null means full footprint
  status: AgentRunStatus;
  regulationsUpdated: number;
  changesDetected: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface CreateAgentRunInput {
  orgId: string;
  trigger: AgentRunTrigger;
  jurisdictions?: string[];
}

export interface RunOptions {
  jurisdictions?: string[];          // Override org footprint
  force?: boolean;                   // Bypass change detection
  trigger?: AgentRunTrigger;
}

export interface AgentRunResult {
  runId: string;
  regulationsUpdated: number;
  changesDetected: number;
  jurisdictionsProcessed: string[];
}

export interface ScrapedContent {
  jurisdictionCode: string;
  url: string;
  rawHtml: string;
  textContent: string;
  fetchedAt: Date;
}
