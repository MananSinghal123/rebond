import { describe, expect, it } from 'vitest';
import { splitProRata } from '@/lib/domain/payouts';
import { curatorRank } from '@/lib/domain/rank';

describe('distributions are split pro-rata across positions', () => {
  describe('when two investors hold $150k and $100k of the acceptance bond', () => {
    it('pays each investor their share of a $6,875 quarterly coupon', () => {
      const split = splitProRata(687_500, [
        { id: 'a', weight: 15_000_000 },
        { id: 'b', weight: 10_000_000 },
      ]);
      expect(split).toEqual([
        { id: 'a', amountCents: 412_500 },
        { id: 'b', amountCents: 275_000 },
      ]);
    });
  });

  describe('when the amount does not divide evenly', () => {
    it('gives leftover cents to the largest remainders, earliest position first on ties', () => {
      const split = splitProRata(100, [
        { id: 'a', weight: 1 },
        { id: 'b', weight: 1 },
        { id: 'c', weight: 1 },
      ]);
      expect(split.map((s) => s.amountCents)).toEqual([34, 33, 33]);
    });
  });

  describe('when amount × weight is far above 2^53', () => {
    it('never creates or loses a cent', () => {
      const shares = [
        { id: 'a', weight: 1_999_999_999 },
        { id: 'b', weight: 7 },
        { id: 'c', weight: 333_333_333 },
      ];
      const split = splitProRata(2_000_000_001, shares);
      expect(split.reduce((sum, s) => sum + s.amountCents, 0)).toBe(2_000_000_001);
    });
  });

  describe('when there are no positions to pay', () => {
    it('throws because a paid distribution must have holders', () => {
      expect(() => splitProRata(100, [])).toThrow('positive total weight');
    });
  });
});

describe('curator rank rewards on-time distributions, weighted by volume', () => {
  describe('when the curator has one bond with every distribution on time', () => {
    it('scores 100 with 100% on time', () => {
      expect(curatorRank([{ volumeCents: 25_000_000, paidOnTime: 4, paidLate: 0 }])).toEqual({
        onTimePct: 100,
        score: 100,
        lateCount: 0,
      });
    });
  });

  describe('when a smaller bond paid late', () => {
    it('weights the score by bond volume and counts the late payment', () => {
      const rank = curatorRank([
        { volumeCents: 300, paidOnTime: 4, paidLate: 0 },
        { volumeCents: 100, paidOnTime: 1, paidLate: 1 },
      ]);
      expect(rank).toEqual({ onTimePct: 83.3, score: 87.5, lateCount: 1 });
    });
  });

  describe('when a bond has no paid distributions yet', () => {
    it('leaves that bond out of the score', () => {
      const rank = curatorRank([
        { volumeCents: 100, paidOnTime: 2, paidLate: 0 },
        { volumeCents: 900, paidOnTime: 0, paidLate: 0 },
      ]);
      expect(rank.score).toBe(100);
    });
  });

  describe('when no distribution has been paid on any curated bond', () => {
    it('reports the curator as unrated', () => {
      expect(curatorRank([{ volumeCents: 100, paidOnTime: 0, paidLate: 0 }])).toEqual({
        onTimePct: null,
        score: null,
        lateCount: 0,
      });
    });
  });
});
