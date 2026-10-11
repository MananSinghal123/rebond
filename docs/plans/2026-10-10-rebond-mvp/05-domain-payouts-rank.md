# Pro-Rata Split and Curator Rank Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Two pure functions. `splitProRata` divides a distribution across positions to the exact cent. `curatorRank` implements the FR-15 MVP rank: on-time distribution %, weighted by volume.

**Architecture:** REQUIREMENTS.md FR-24 (pro-rata payout to positions), FR-15 and FR-26 (rank). Owner: `lib/domain/`. The split uses the largest-remainder method with BigInt, so `amount × weight` cannot lose precision above 2^53 and the parts always sum to the total. (The tsconfig target is ES2017, so use `BigInt(0)` and not the `0n` literal.)

**Tech Stack:** TypeScript, Vitest.

---

**Files:**
- Create: `lib/domain/payouts.ts`
- Create: `lib/domain/rank.ts`
- Test: `tests/domain/payouts-rank.test.ts`

### Task 1: Pro-rata split

- [ ] **Step 1: Write the failing tests `tests/domain/payouts-rank.test.ts`**

```ts
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run tests/domain/payouts-rank.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/domain/payouts"`

- [ ] **Step 3: Create `lib/domain/payouts.ts`**

```ts
import { assert, type Cents } from './types';

export type Share = { id: string; weight: number };
export type Allocation = { id: string; amountCents: Cents };

export function splitProRata(totalCents: Cents, shares: readonly Share[]): Allocation[] {
  const totalWeight = shares.reduce((sum, share) => sum + share.weight, 0);
  assert(totalWeight > 0, 'pro-rata split needs a positive total weight');

  const total = BigInt(totalCents);
  const weightSum = BigInt(totalWeight);
  const parts = shares.map((share, index) => {
    const numerator = total * BigInt(share.weight);
    return { id: share.id, index, floor: numerator / weightSum, remainder: numerator % weightSum };
  });

  const floored = parts.reduce((sum, part) => sum + part.floor, BigInt(0));
  const leftover = Number(total - floored);
  const byRemainder = [...parts].sort((a, b) => {
    if (a.remainder === b.remainder) return a.index - b.index;
    return b.remainder > a.remainder ? 1 : -1;
  });
  const bonus = new Set(byRemainder.slice(0, leftover).map((part) => part.index));

  return parts.map((part) => ({
    id: part.id,
    amountCents: Number(part.floor) + (bonus.has(part.index) ? 1 : 0),
  }));
}
```

- [ ] **Step 4: Create `lib/domain/rank.ts`**

```ts
import type { Cents } from './types';

export type RankInput = { volumeCents: Cents; paidOnTime: number; paidLate: number };
export type CuratorRank = { onTimePct: number | null; score: number | null; lateCount: number };

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

export function curatorRank(records: readonly RankInput[]): CuratorRank {
  const lateCount = records.reduce((sum, r) => sum + r.paidLate, 0);
  const rated = records.filter((r) => r.paidOnTime + r.paidLate > 0);
  if (rated.length === 0) return { onTimePct: null, score: null, lateCount };

  const paid = rated.reduce((sum, r) => sum + r.paidOnTime + r.paidLate, 0);
  const onTime = rated.reduce((sum, r) => sum + r.paidOnTime, 0);
  const volume = rated.reduce((sum, r) => sum + r.volumeCents, 0);
  const weighted = rated.reduce((sum, r) => sum + (r.volumeCents * r.paidOnTime) / (r.paidOnTime + r.paidLate), 0);

  return {
    onTimePct: oneDecimal((onTime * 100) / paid),
    score: oneDecimal((weighted * 100) / volume),
    lateCount,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run tests/domain/payouts-rank.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Soundness check, split**

In `splitProRata`, change `byRemainder.slice(0, leftover)` to `byRemainder.slice(0, 0)`.
Run the same command. Expected: FAIL `[33, 33, 33]` vs `[34, 33, 33]`, and the cap test sums to `1999999999` instead of `2000000001`.
Restore.

- [ ] **Step 7: Soundness check, rank**

In `curatorRank`, replace `(weighted * 100) / volume` with `(onTime * 100) / paid`, which removes volume weighting.
Run the same command. Expected: FAIL `score: 83.3` vs `87.5`.
Restore and re-run. Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/domain/payouts.ts lib/domain/rank.ts tests/domain/payouts-rank.test.ts
git commit -m "feat(domain): exact pro-rata split and volume-weighted curator rank"
```
