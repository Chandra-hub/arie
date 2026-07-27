import { describe, it, expect } from 'vitest';
import { classifyRegulation, findExistingRegulation } from '../../src/agent/classifier';
import { Regulation } from '../../src/types/regulation.types';

const baseRegulation: Omit<Regulation, 'orgId' | 'createdAt' | 'updatedAt'> = {
  id: 'reg-001',
  jurisdictionCode: 'GB',
  title: 'Environmental Permitting Regulations 2016',
  body: 'Environment Agency',
  sector: 'chemical',
  summary: 'Requires operators to hold an environmental permit.',
  keyObligations: ['Obtain permit', 'Submit annual report'],
  effectiveDate: '2016-04-06',
  penaltyFramework: { maxFine: 250000, currency: 'GBP', criminalLiability: true },
  sourceUrl: 'https://www.legislation.gov.uk/uksi/2016/1154',
  contentHash: 'abc123',
  changeDetected: false,
  changeHistory: [],
  lastFetchedAt: new Date(),
};

describe('classifyRegulation', () => {
  it('assigns a new UUID when no existing regulation', () => {
    const result = classifyRegulation('GB', { title: 'Test Regulation', sector: 'water' });
    expect(result.id).toBeTruthy();
    expect(result.id.length).toBeGreaterThan(10);
  });

  it('preserves the existing ID on update', () => {
    const existing: Regulation = {
      ...baseRegulation,
      orgId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = classifyRegulation('GB', { title: baseRegulation.title!, sector: 'chemical' }, existing);
    expect(result.id).toBe('reg-001');
  });

  it('does not flag changeDetected for a brand new regulation', () => {
    const result = classifyRegulation('GB', { title: 'New Reg', sector: 'water' });
    expect(result.changeDetected).toBe(false);
  });

  it('flags changeDetected when content hash differs from existing', () => {
    const existing: Regulation = {
      ...baseRegulation,
      orgId: 'org-1',
      contentHash: 'completely-different-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = classifyRegulation(
      'GB',
      { title: 'Environmental Permitting Regulations 2016 — Amended', sector: 'chemical' },
      existing,
    );
    expect(result.changeDetected).toBe(true);
  });

  it('appends to changeHistory when change is detected', () => {
    const existing: Regulation = {
      ...baseRegulation,
      orgId: 'org-1',
      contentHash: 'old-hash',
      changeHistory: [{ detectedAt: new Date('2025-01-01'), summary: 'Previous change' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = classifyRegulation(
      'GB',
      { title: 'Updated Title', sector: 'chemical' },
      existing,
    );
    expect(result.changeHistory?.length).toBe(2);
  });

  it('sets jurisdictionCode correctly', () => {
    const result = classifyRegulation('JP', { title: 'Japanese Water Law' });
    expect(result.jurisdictionCode).toBe('JP');
  });

  it('generates a SHA-256 content hash', () => {
    const result = classifyRegulation('GB', { title: 'Test', summary: 'Summary' });
    expect(result.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('findExistingRegulation', () => {
  const existing: Regulation[] = [
    {
      ...baseRegulation,
      orgId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      ...baseRegulation,
      id: 'reg-002',
      title: 'Control of Substances Hazardous to Health Regulations 2002',
      orgId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('finds an exact title match (case-insensitive)', () => {
    const found = findExistingRegulation(
      { title: 'environmental permitting regulations 2016' },
      existing,
    );
    expect(found?.id).toBe('reg-001');
  });

  it('returns undefined when no match', () => {
    const found = findExistingRegulation({ title: 'Completely Unknown Regulation' }, existing);
    expect(found).toBeUndefined();
  });

  it('returns undefined for empty existing list', () => {
    const found = findExistingRegulation({ title: 'Any Regulation' }, []);
    expect(found).toBeUndefined();
  });
});
