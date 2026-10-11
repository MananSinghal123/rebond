import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase } from '@/lib/db';
import { listBonds, parseFilters } from '@/lib/services/marketplace';
import { fundBond } from '@/lib/services/funding';
import { unwrap } from '@/lib/domain/types';
import { makeActiveBond, makeActor, makeListedBond } from '../helpers/actors';

describe('investors browse listed bonds', () => {
  let ninePct: string;
  let elevenPct: string;

  beforeEach(async () => {
    await clearDatabase();
    ({ bondId: ninePct } = await makeListedBond({ ratePct: 9, termMonths: 24, payoutFrequency: 'MONTHLY' }, new Date('2026-10-01')));
    ({ bondId: elevenPct } = await makeListedBond({ ratePct: 11, termMonths: 12 }, new Date('2026-10-05')));
    await makeActiveBond();
  });

  describe('when no filters are set', () => {
    it('shows only LISTED bonds, newest first', async () => {
      const bonds = await listBonds(parseFilters({}));
      expect(bonds.map((b) => b.id)).toEqual([elevenPct, ninePct]);
    });
  });

  describe('when the minimum yield is 10%', () => {
    it('hides bonds paying less than 10%', async () => {
      const bonds = await listBonds(parseFilters({ minRate: '10' }));
      expect(bonds.map((b) => b.id)).toEqual([elevenPct]);
    });
  });

  describe('when filtering by monthly payouts and a term of at least 18 months', () => {
    it('returns only bonds matching both', async () => {
      const bonds = await listBonds(parseFilters({ frequency: 'MONTHLY', minTerm: '18' }));
      expect(bonds.map((b) => b.id)).toEqual([ninePct]);
    });
  });

  describe('when sorted by % funded', () => {
    it('puts the most-funded bond first', async () => {
      unwrap(await fundBond(await makeActor('INVESTOR'), ninePct, 10_000_000));
      const bonds = await listBonds(parseFilters({ sort: 'funded' }));
      expect(bonds.map((b) => [b.id, b.fundedPct])).toEqual([
        [ninePct, 40],
        [elevenPct, 0],
      ]);
    });
  });

  describe('when the card needs curator details', () => {
    it('includes the curator name and an unrated score for a new curator', async () => {
      const [card] = await listBonds(parseFilters({}));
      expect(card.curator).toMatchObject({ displayName: expect.any(String), score: null });
      expect(card.companyName).toBe('Northwind Health');
    });
  });

  describe('when the URL carries junk values', () => {
    it('ignores them and falls back to defaults', () => {
      expect(parseFilters({ minRate: 'abc', maxTerm: '', sort: 'random', frequency: 'WEEKLY' })).toEqual({ sort: 'newest' });
    });
  });
});
