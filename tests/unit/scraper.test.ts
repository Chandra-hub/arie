import { describe, it, expect } from 'vitest';
import { hashContent, hashScrapedContents } from '../../src/agent/scraper';
import { ScrapedContent } from '../../src/types/agent.types';

describe('hashContent', () => {
  it('returns a 64-char hex SHA-256 hash', () => {
    const hash = hashContent('some regulatory text');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same input', () => {
    expect(hashContent('test')).toBe(hashContent('test'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashContent('regulation A')).not.toBe(hashContent('regulation B'));
  });

  it('handles empty string', () => {
    const hash = hashContent('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('hashScrapedContents', () => {
  const makeContent = (text: string): ScrapedContent => ({
    jurisdictionCode: 'GB',
    url: 'https://example.com',
    rawHtml: `<html>${text}</html>`,
    textContent: text,
    fetchedAt: new Date(),
  });

  it('combines multiple scraped pages into one hash', () => {
    const contents = [makeContent('Page 1 content'), makeContent('Page 2 content')];
    const hash = hashScrapedContents(contents);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same hash regardless of fetch time', () => {
    const a: ScrapedContent = { ...makeContent('same text'), fetchedAt: new Date('2025-01-01') };
    const b: ScrapedContent = { ...makeContent('same text'), fetchedAt: new Date('2025-06-01') };
    expect(hashScrapedContents([a])).toBe(hashScrapedContents([b]));
  });

  it('produces different hashes when content changes', () => {
    const before = [makeContent('Old regulatory text')];
    const after = [makeContent('New amended regulatory text')];
    expect(hashScrapedContents(before)).not.toBe(hashScrapedContents(after));
  });
});
