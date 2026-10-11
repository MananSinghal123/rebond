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
