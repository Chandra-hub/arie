export interface PenaltyFramework {
  maxFine?: number;
  currency?: string;
  criminalLiability?: boolean;
  notes?: string;
}

export interface ChangeRecord {
  detectedAt: Date;
  summary: string;
}

export interface Regulation {
  id: string;
  orgId: string;
  jurisdictionCode: string;
  title: string;
  body?: string;                     // Regulatory body name e.g. "Environment Agency"
  sector?: string;
  summary?: string;
  keyObligations?: string[];
  effectiveDate?: string;            // ISO date string
  penaltyFramework?: PenaltyFramework;
  sourceUrl?: string;
  contentHash?: string;
  changeDetected: boolean;
  changeHistory?: ChangeRecord[];
  lastFetchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulationFilters {
  jurisdictionCode?: string;
  sector?: string;
  changedSince?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface NormalizedRegulation {
  title: string;
  body?: string;
  sector?: string;
  summary?: string;
  keyObligations?: string[];
  effectiveDate?: string;
  penaltyFramework?: PenaltyFramework;
  sourceUrl?: string;
}
