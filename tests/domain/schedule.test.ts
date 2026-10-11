import { describe, expect, it } from 'vitest';
import { expectedReturnCents } from '@/lib/domain/money';
import { addMonthsUtc, buildSchedule } from '@/lib/domain/schedule';
import { PAYOUT_FREQUENCIES } from '@/lib/domain/types';

const start = new Date('2026-01-15T00:00:00Z');

describe('funded bonds get a distribution schedule', () => {
  describe('when the acceptance bond is $250k / 11% / 12 months / quarterly', () => {
    it('schedules 4 quarterly payouts with principal returned on the last', () => {
      const rows = buildSchedule({
        amountCents: 25_000_000,
        rateBps: 1100,
        termMonths: 12,
        frequency: 'QUARTERLY',
        start,
      });

      expect(rows.map((r) => r.amountCents)).toEqual([687_500, 687_500, 687_500, 25_687_500]);
      expect(rows.map((r) => r.isPrincipal)).toEqual([false, false, false, true]);
      expect(rows.map((r) => r.seq)).toEqual([1, 2, 3, 4]);
      expect(rows.map((r) => r.dueDate.toISOString().slice(0, 10))).toEqual([
        '2026-04-15',
        '2026-07-15',
        '2026-10-15',
        '2027-01-15',
      ]);
    });
  });

  describe('when a quarterly term is not a multiple of 3 months', () => {
    it('shortens the final period to the remaining months', () => {
      const rows = buildSchedule({
        amountCents: 10_000_000,
        rateBps: 1200,
        termMonths: 7,
        frequency: 'QUARTERLY',
        start,
      });

      expect(rows.map((r) => r.amountCents)).toEqual([300_000, 300_000, 10_100_000]);
      expect(rows.at(-1)?.dueDate.toISOString().slice(0, 10)).toBe('2026-08-15');
    });
  });

  describe('when payout frequency is AT_MATURITY', () => {
    it('schedules a single payout of principal plus all interest', () => {
      const rows = buildSchedule({
        amountCents: 10_000_000,
        rateBps: 1000,
        termMonths: 18,
        frequency: 'AT_MATURITY',
        start,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ seq: 1, amountCents: 11_500_000, isPrincipal: true });
    });
  });

  describe('when the bond is funded on the 31st of a month', () => {
    it('clamps due dates to the last day of shorter months', () => {
      expect(addMonthsUtc(new Date('2026-01-31T00:00:00Z'), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
      expect(addMonthsUtc(new Date('2026-01-31T00:00:00Z'), 2).toISOString().slice(0, 10)).toBe('2026-03-31');
    });
  });

  describe('when any valid term and frequency is scheduled', () => {
    it('pays out exactly principal plus expected return with no rounding drift', () => {
      for (const frequency of PAYOUT_FREQUENCIES) {
        for (let termMonths = 1; termMonths <= 60; termMonths += 1) {
          const amountCents = 1_234_567;
          const rateBps = 1137;
          const rows = buildSchedule({ amountCents, rateBps, termMonths, frequency, start });
          const total = rows.reduce((sum, r) => sum + r.amountCents, 0);
          expect(total).toBe(amountCents + expectedReturnCents(amountCents, rateBps, termMonths));
          expect(rows.filter((r) => r.isPrincipal)).toHaveLength(1);
        }
      }
    });
  });
});
