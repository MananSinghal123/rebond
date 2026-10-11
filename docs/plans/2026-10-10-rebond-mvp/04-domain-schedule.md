# Distribution Schedule Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** A pure `buildSchedule()` that turns bond terms into dated distributions whose amounts sum exactly to principal + expected return.

**Architecture:** REQUIREMENTS.md FR-20 (schedule generated on funding), FR-25 (principal returned at the final payout) and §10 step 3 (a 12-month quarterly bond has 4 payouts). Owner: `lib/domain/schedule.ts`. The final distribution carries last-period interest plus principal and has `isPrincipal = true` (see the deviations table in 00-overview). Interest is allocated from rounded cumulative totals, so per-period rounding can never drift from `expectedReturnCents`.

**Tech Stack:** TypeScript, Vitest.

---

**Files:**
- Create: `lib/domain/schedule.ts`
- Test: `tests/domain/schedule.test.ts`

### Task 1: Schedule builder

- [ ] **Step 1: Write the failing test `tests/domain/schedule.test.ts`**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/domain/schedule.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/domain/schedule"`

- [ ] **Step 3: Create `lib/domain/schedule.ts`**

```ts
import { expectedReturnCents } from './money';
import type { Bps, Cents, PayoutFrequency } from './types';

export type ScheduleInput = {
  amountCents: Cents;
  rateBps: Bps;
  termMonths: number;
  frequency: PayoutFrequency;
  start: Date;
};

export type ScheduledDistribution = {
  seq: number;
  dueDate: Date;
  amountCents: Cents;
  isPrincipal: boolean;
};

const PERIOD_MONTHS: Record<PayoutFrequency, number | null> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  AT_MATURITY: null,
};

export function addMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function buildSchedule(input: ScheduleInput): ScheduledDistribution[] {
  const { amountCents, rateBps, termMonths, frequency, start } = input;
  const period = PERIOD_MONTHS[frequency] ?? termMonths;
  const count = Math.ceil(termMonths / period);
  const interestThrough = (months: number) => expectedReturnCents(amountCents, rateBps, months);

  return Array.from({ length: count }, (_, index) => {
    const seq = index + 1;
    const monthsElapsed = Math.min(seq * period, termMonths);
    const interest = interestThrough(monthsElapsed) - interestThrough(index * period);
    const isPrincipal = seq === count;
    return {
      seq,
      dueDate: addMonthsUtc(start, monthsElapsed),
      amountCents: interest + (isPrincipal ? amountCents : 0),
      isPrincipal,
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/domain/schedule.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Soundness check**

Replace the cumulative interest line with per-period rounding:
`const interest = expectedReturnCents(amountCents, rateBps, monthsElapsed - index * period);`
Run the same command. Expected: FAIL in `pays out exactly principal plus expected return…`, with a total off by a cent for some term.
Restore and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/domain/schedule.ts tests/domain/schedule.test.ts
git commit -m "feat(domain): distribution schedule with exact cumulative interest"
```
