import { randomUUID } from 'crypto';
import { hashContent } from './scraper';
import { NormalizedRegulation, Regulation, ChangeRecord } from '../types/regulation.types';

/**
 * Takes a normalized regulation and an existing stored regulation (if any),
 * computes a content hash, detects changes, and returns a complete Regulation
 * ready for upsert into the repository.
 */
export function classifyRegulation(
  jurisdictionCode: string,
  normalized: NormalizedRegulation,
  existingRegulation?: Regulation,
): Omit<Regulation, 'orgId' | 'createdAt' | 'updatedAt'> {
  const contentHash = hashContent(
    JSON.stringify({ title: normalized.title, summary: normalized.summary }),
  );

  const changeDetected = existingRegulation
    ? existingRegulation.contentHash !== contentHash
    : false;

  let changeHistory: ChangeRecord[] = existingRegulation?.changeHistory ?? [];
  if (changeDetected && existingRegulation) {
    changeHistory = [
      ...changeHistory,
      {
        detectedAt: new Date(),
        summary: `Content change detected. Previous hash: ${existingRegulation.contentHash?.slice(0, 8)}`,
      },
    ];
  }

  return {
    id: existingRegulation?.id ?? randomUUID(),
    jurisdictionCode,
    title: normalized.title,
    body: normalized.body,
    sector: normalized.sector,
    summary: normalized.summary,
    keyObligations: normalized.keyObligations,
    effectiveDate: normalized.effectiveDate ?? undefined,
    penaltyFramework: normalized.penaltyFramework,
    sourceUrl: normalized.sourceUrl,
    contentHash,
    changeDetected,
    changeHistory,
    lastFetchedAt: new Date(),
  };
}

/**
 * Attempts to match a newly scraped regulation to an existing one by title similarity.
 * Returns the best matching existing regulation, or undefined if no close match found.
 */
export function findExistingRegulation(
  normalized: NormalizedRegulation,
  existingRegulations: Regulation[],
): Regulation | undefined {
  const normalizedTitle = normalized.title.toLowerCase().trim();
  return existingRegulations.find(
    (reg) => reg.title.toLowerCase().trim() === normalizedTitle,
  );
}
