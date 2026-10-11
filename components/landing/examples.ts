import { expectedReturnCents, formatRate, formatUsd, fundedPct } from '@/lib/domain/money';
import type { PayoutFrequency } from '@/lib/domain/types';

/**
 * Illustrative bonds built from the demo's fictional companies and curators. Everything that
 * renders them labels them "Example"; derived figures use the app's own money helpers.
 */
export type ExampleBond = {
  company: string;
  market: string;
  rateBps: number;
  termMonths: number;
  frequency: PayoutFrequency;
  amountCents: number;
  fundedCents: number;
  backing: string;
  curator: string;
  rank: number;
  tx: string;
};

export const EXAMPLE_BONDS: ExampleBond[] = [
  {
    company: 'Northwind Health',
    market: 'Health-plan premiums',
    rateBps: 1100,
    termMonths: 12,
    frequency: 'QUARTERLY',
    amountCents: 25_000_000,
    fundedCents: 15_000_000,
    backing: 'Three-year capitation contract with a regional health plan, paid monthly',
    curator: 'Atlas Credit Review',
    rank: 100,
    tx: '3f9a51c2e0…b17d42',
  },
  {
    company: 'Harbor Dialysis Partners',
    market: 'Dialysis service agreements',
    rateBps: 975,
    termMonths: 18,
    frequency: 'MONTHLY',
    amountCents: 40_000_000,
    fundedCents: 31_200_000,
    backing: 'Five-year service agreement with a regional payer network',
    curator: 'Juniper Diligence',
    rank: 96,
    tx: '8b21e7d4a9…c03f15',
  },
  {
    company: 'Meridian Home Care',
    market: 'In-home care visits',
    rateBps: 1050,
    termMonths: 24,
    frequency: 'MONTHLY',
    amountCents: 18_000_000,
    fundedCents: 5_400_000,
    backing: 'Two-year managed-care contract covering in-home visits',
    curator: 'Atlas Credit Review',
    rank: 100,
    tx: '5d0c93fa17…e8a264',
  },
];

const COMPACT_USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' });

/** The reference ticket used to show what a bond pays: $1,000. */
export const TICKET_CENTS = 100_000;

export const exampleFigures = (bond: ExampleBond) => ({
  rate: formatRate(bond.rateBps),
  raise: formatUsd(bond.amountCents),
  /** "$250K": fits the four-cell term strip on phones. */
  raiseShort: COMPACT_USD.format(bond.amountCents / 100),
  raised: formatUsd(bond.fundedCents),
  pct: fundedPct(bond.fundedCents, bond.amountCents),
  /** Principal plus all interest on a $1,000 ticket, as the confirm sheet computes it. */
  perTicket: formatUsd(TICKET_CENTS + expectedReturnCents(TICKET_CENTS, bond.rateBps, bond.termMonths)),
});
