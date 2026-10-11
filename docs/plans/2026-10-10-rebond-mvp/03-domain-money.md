# Money and Returns Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Pure functions for cents and basis-point conversion, the FR-19 expected return, the curator fee, the fund-amount rule, funding percentage and display formatting, plus the shared `MAX_AMOUNT_USD` limit (client-safe, so the application form can use it too).

**Architecture:** REQUIREMENTS.md FR-19 (minimum $100, ≤ remaining, return = principal × rate × term/12) and NFR-3 (cents and basis points). Owner: `lib/domain/money.ts`, which has no I/O. The client-side fund form (plan 24) imports it as well, so it must stay free of Node imports.

**Tech Stack:** TypeScript, `Intl.NumberFormat`, Vitest.

---

**Files:**
- Create: `lib/domain/money.ts`
- Test: `tests/domain/money.test.ts`

### Task 1: Money functions

- [ ] **Step 1: Write the failing test `tests/domain/money.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  checkFundAmount,
  curatorFeeCents,
  expectedReturnCents,
  feesAccruedCents,
  formatRate,
  formatUsd,
  fundedPct,
  pctToBps,
  usdToCents,
} from '@/lib/domain/money';

describe('investors see the fixed return a bond pays', () => {
  describe('when the acceptance bond is $250k at 11% for 12 months', () => {
    it('expects $27,500 of interest', () => {
      expect(expectedReturnCents(usdToCents(250_000), pctToBps(11), 12)).toBe(2_750_000);
    });
  });

  describe('when the term is shorter than a year', () => {
    it('prorates interest by term/12', () => {
      expect(expectedReturnCents(25_000_000, 1100, 6)).toBe(1_375_000);
    });
  });

  describe('when interest lands on a fraction of a cent', () => {
    it('rounds to the nearest cent', () => {
      expect(expectedReturnCents(10_001, 1100, 1)).toBe(92);
    });
  });
});

describe('curators earn a fee on the raise', () => {
  describe('when a $250k bond lists at a 1% curator fee', () => {
    it('accrues a $2,500 fee', () => {
      expect(curatorFeeCents(25_000_000, 100)).toBe(250_000);
    });
  });

  describe('when only some of the curator\'s bonds have raised money', () => {
    it('accrues fees on raised bonds and ignores listed ones', () => {
      expect(
        feesAccruedCents([
          { status: 'ACTIVE', amountCents: 25_000_000, curatorFeeBps: 100 },
          { status: 'LISTED', amountCents: 50_000_000, curatorFeeBps: 100 },
        ]),
      ).toBe(250_000);
    });
  });
});

describe('fund amounts respect the ticket rules', () => {
  describe('when the ticket is below $100', () => {
    it('rejects the ticket with the minimum named', () => {
      expect(checkFundAmount(9_999, 25_000_000)).toBe('Minimum investment is $100.');
    });
  });

  describe('when the ticket exceeds what is left to raise', () => {
    it('rejects the ticket and states the remaining amount', () => {
      expect(checkFundAmount(5_000_000, 4_000_000)).toBe('Only $40,000 is left to raise.');
    });
  });

  describe('when the ticket is not a number', () => {
    it('rejects the ticket as invalid', () => {
      expect(checkFundAmount(Number.NaN, 4_000_000)).toBe('Enter an amount in dollars.');
    });
  });

  describe('when the ticket would leave less than $100 to raise', () => {
    it('rejects the ticket so the bond can still fill', () => {
      expect(checkFundAmount(24_995_000, 25_000_000)).toBe('Leave at least $100 for others, or fund the full $250,000.');
    });
  });

  describe('when the ticket exactly fills the raise', () => {
    it('accepts the ticket', () => {
      expect(checkFundAmount(4_000_000, 4_000_000)).toBeNull();
    });
  });
});

describe('amounts and rates display for humans', () => {
  it('drops cents when the amount is whole dollars', () => {
    expect(formatUsd(25_000_000)).toBe('$250,000');
  });

  it('shows two decimals when the amount has cents', () => {
    expect(formatUsd(12_345)).toBe('$123.45');
  });

  it('shows rates without trailing zeros', () => {
    expect(formatRate(1100)).toBe('11%');
    expect(formatRate(50)).toBe('0.5%');
    expect(formatRate(1125)).toBe('11.25%');
  });

  it('floors the funded percentage so a bond never shows 100% early', () => {
    expect(fundedPct(24_999_999, 25_000_000)).toBe(99);
    expect(fundedPct(25_000_000, 25_000_000)).toBe(100);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/domain/money.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/domain/money"`

- [ ] **Step 3: Create `lib/domain/money.ts`**

```ts
import { RAISED_STATUSES } from './lifecycle';
import type { BondStatus, Bps, Cents } from './types';

export const MIN_TICKET_CENTS: Cents = 10_000;
export const MAX_AMOUNT_USD = 8_000_000;
export const MIN_FEE_BPS: Bps = 50;
export const MAX_FEE_BPS: Bps = 200;
const BPS_PER_UNIT = 10_000;
const MONTHS_PER_YEAR = 12;

export const usdToCents = (usd: number): Cents => Math.round(usd * 100);
export const pctToBps = (pct: number): Bps => Math.round(pct * 100);
export const centsToUsd = (cents: Cents): number => cents / 100;
export const bpsToPct = (bps: Bps): number => bps / 100;

export function expectedReturnCents(principal: Cents, rateBps: Bps, termMonths: number): Cents {
  return Math.round((principal * rateBps * termMonths) / (BPS_PER_UNIT * MONTHS_PER_YEAR));
}

export function curatorFeeCents(amountCents: Cents, feeBps: Bps): Cents {
  return Math.round((amountCents * feeBps) / BPS_PER_UNIT);
}

export type FeeBearingBond = { status: BondStatus; amountCents: Cents; curatorFeeBps: Bps | null };

export function feesAccruedCents(bonds: readonly FeeBearingBond[]): Cents {
  return bonds
    .filter((bond) => RAISED_STATUSES.includes(bond.status))
    .reduce((sum, bond) => sum + curatorFeeCents(bond.amountCents, bond.curatorFeeBps ?? 0), 0);
}

export function fundedPct(fundedCents: Cents, amountCents: Cents): number {
  return Math.floor((fundedCents * 100) / amountCents);
}

export function checkFundAmount(amountCents: Cents, remainingCents: Cents): string | null {
  if (!Number.isInteger(amountCents)) return 'Enter an amount in dollars.';
  if (amountCents < MIN_TICKET_CENTS) return 'Minimum investment is $100.';
  if (amountCents > remainingCents) return `Only ${formatUsd(remainingCents)} is left to raise.`;
  const leftover = remainingCents - amountCents;
  if (leftover > 0 && leftover < MIN_TICKET_CENTS) {
    return `Leave at least $100 for others, or fund the full ${formatUsd(remainingCents)}.`;
  }
  return null;
}

export function formatUsd(cents: Cents): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(centsToUsd(cents));
}

export function formatRate(bps: Bps): string {
  return `${Number(bpsToPct(bps).toFixed(2))}%`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/domain/money.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Soundness check**

In `expectedReturnCents`, change the divisor `(BPS_PER_UNIT * MONTHS_PER_YEAR)` to `BPS_PER_UNIT`. This drops the `/12`, which is exactly the bug FR-19 guards against.
Run the same command. Expected: FAIL `expected 33000000 to be 2750000`.
Restore and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/domain/money.ts tests/domain/money.test.ts
git commit -m "feat(domain): cents/bps money helpers and fund amount rule"
```
