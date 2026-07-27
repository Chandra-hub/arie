const BASE_URL =
  process.env.NEXT_PUBLIC_ARIE_API_URL ?? 'http://localhost:3000/api/v1';

function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('arie_api_key') ?? '';
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': getApiKey(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrgConfig {
  orgId: string;
  name: string;
  jurisdictionFootprint: string[];
  sectors: string[];
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Regulation {
  id: string;
  jurisdictionCode: string;
  title: string;
  body?: string;
  sector?: string;
  summary?: string;
  keyObligations?: string[];
  effectiveDate?: string;
  penaltyFramework?: { maxFine?: number; currency?: string; criminalLiability?: boolean; notes?: string };
  sourceUrl?: string;
  changeDetected: boolean;
  changeHistory?: { detectedAt: string; summary: string }[];
  updatedAt: string;
}

export interface AgentRun {
  runId: string;
  trigger: 'scheduled' | 'manual' | 'event';
  jurisdictions?: string[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  regulationsUpdated: number;
  changesDetected: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface JurisdictionInfo {
  code: string;
  name: string;
  regulatoryBodies: string[];
  sectors: string[];
  rssFeedAvailable: boolean;
  inOrgFootprint: boolean;
}

export interface ComplianceFinding {
  jurisdiction: string;
  regulation: string;
  status: string;
  details: string;
  action: string;
  penaltyIfNonCompliant?: string;
}

export interface ComplianceReport {
  status: 'compliant' | 'non_compliant' | 'review_required';
  checkedJurisdictions: string[];
  findings: ComplianceFinding[];
  generatedAt: string;
}

// ─── API Methods ─────────────────────────────────────────────────────────────

export const api = {
  // Health
  health: () => request<{ status: string; version: string }>('/health', { headers: { 'X-Api-Key': '' } }),

  // Org
  getOrg: () => request<OrgConfig>('/orgs/me'),
  updateOrg: (body: Partial<OrgConfig>) =>
    request<OrgConfig>('/orgs/me', { method: 'PATCH', body: JSON.stringify(body) }),
  registerOrg: (body: { name: string; jurisdictionFootprint: string[]; sectors: string[] }) =>
    request<{ orgId: string; apiKey: string; message: string }>('/orgs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Jurisdictions
  getJurisdictions: () =>
    request<{ jurisdictions: JurisdictionInfo[]; total: number }>('/jurisdictions'),

  getJurisdictionRegulations: (code: string, params?: { sector?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.sector) qs.set('sector', params.sector);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<{ jurisdiction: string; regulations: Regulation[]; total: number }>(
      `/jurisdictions/${code}/regulations?${qs}`,
    );
  },

  // Regulations
  getRegulations: (params?: { sector?: string; jurisdiction?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.sector) qs.set('sector', params.sector);
    if (params?.jurisdiction) qs.set('jurisdiction', params.jurisdiction);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<{ regulations: Regulation[]; total: number; page: number; limit: number }>(
      `/regulations?${qs}`,
    );
  },

  getRegulation: (id: string) => request<Regulation>(`/regulations/${id}`),

  // Compliance
  checkCompliance: (body: { scenario: string; jurisdictions?: string[]; sector?: string }) =>
    request<{ complianceReport: ComplianceReport }>('/compliance/check', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Agent
  triggerRun: (body?: { jurisdictions?: string[]; force?: boolean }) =>
    request<{ runId: string; status: string; message: string }>('/agent/run', {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  getRuns: () => request<{ runs: AgentRun[] }>('/agent/runs'),
  getRun: (runId: string) => request<AgentRun>(`/agent/runs/${runId}`),
};
