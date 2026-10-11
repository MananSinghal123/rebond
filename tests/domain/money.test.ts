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
