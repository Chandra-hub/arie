import Parser from 'rss-parser';
import pino from 'pino';
import { getJurisdiction } from '../config/jurisdictions';
import { IChangeHashRepository } from '../storage/repository.interface';
import { fetchJurisdictionContent, hashScrapedContents } from './scraper';

const logger = pino({ name: 'change-detector' });
const rssParser = new Parser({ timeout: 15_000 });

/**
 * Returns only the jurisdiction codes that have detectable changes.
 * Uses RSS feed publication dates (fast path) or page hash diffing (fallback).
 */
export async function detectChangedJurisdictions(
  orgId: string,
  jurisdictionCodes: string[],
  changeHashRepo: IChangeHashRepository,
  lastCheckedAt?: Date,
): Promise<string[]> {
  const changed: string[] = [];

  for (const code of jurisdictionCodes) {
    const hasChanged = await hasJurisdictionChanged(
      orgId,
      code,
      changeHashRepo,
      lastCheckedAt,
    );
    if (hasChanged) {
      changed.push(code);
    }
  }

  logger.info(
    { orgId, checked: jurisdictionCodes.length, changed: changed.length },
    'Change detection complete',
  );

  return changed;
}

async function hasJurisdictionChanged(
  orgId: string,
  jurisdictionCode: string,
  changeHashRepo: IChangeHashRepository,
  lastCheckedAt?: Date,
): Promise<boolean> {
  const jurisdiction = getJurisdiction(jurisdictionCode);
  if (!jurisdiction) return false;

  // Fast path: check RSS feed if available
  if (jurisdiction.rssFeedUrl) {
    try {
      const hasRssChanges = await checkRssFeed(
        jurisdiction.rssFeedUrl,
        lastCheckedAt,
      );
      if (hasRssChanges) {
        logger.info({ jurisdictionCode }, 'RSS feed indicates changes');
        return true;
      }
    } catch (err) {
      logger.warn(
        { jurisdictionCode, rssFeedUrl: jurisdiction.rssFeedUrl, err },
        'RSS check failed, falling back to hash diff',
      );
    }
  }

  // Fallback: scrape page content and compare hashes
  try {
    const storedHash = await changeHashRepo.getHash(orgId, jurisdictionCode);

    // No stored hash means first run — always process
    if (!storedHash) {
      logger.info({ jurisdictionCode }, 'No stored hash — treating as changed');
      return true;
    }

    const freshContents = await fetchJurisdictionContent(jurisdictionCode);
    if (freshContents.length === 0) return false;

    const freshHash = hashScrapedContents(freshContents);
    const changed = freshHash !== storedHash;

    if (changed) {
      logger.info({ jurisdictionCode }, 'Hash diff detected changes');
    }

    return changed;
  } catch (err) {
    logger.error({ jurisdictionCode, err }, 'Hash diff check failed');
    // If we can not check, assume changed to be safe
    return true;
  }
}

async function checkRssFeed(
  feedUrl: string,
  lastCheckedAt?: Date,
): Promise<boolean> {
  const feed = await rssParser.parseURL(feedUrl);

  if (!lastCheckedAt || !feed.items?.length) {
    // No last checked time — assume changed
    return true;
  }

  return feed.items.some((item) => {
    const pubDate = item.pubDate ? new Date(item.pubDate) : null;
    return pubDate && pubDate > lastCheckedAt;
  });
}
