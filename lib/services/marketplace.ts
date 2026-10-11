import { z } from 'zod';
import { db } from '@/lib/db';
import { fundedPct, pctToBps } from '@/lib/domain/money';
import { assert, parseEnum, PAYOUT_FREQUENCIES, type PayoutFrequency } from '@/lib/domain/types';
import { getCuratorRanks } from './curators';

export const SORTS = ['newest', 'yield', 'term', 'funded'] as const;
export type Sort = (typeof SORTS)[number];

const optionalNumber = z
  .preprocess((value) => (value === '' ? undefined : value), z.coerce.number().nonnegative().optional())
  .catch(undefined);

const FilterSchema = z.object({
  minRate: optionalNumber,
  maxRate: optionalNumber,
  minTerm: optionalNumber,
  maxTerm: optionalNumber,
  curator: z.string().min(1).optional().catch(undefined),
  frequency: z.enum(PAYOUT_FREQUENCIES).optional().catch(undefined),
  sort: z.enum(SORTS).catch('newest'),
});

export type BondFilters = z.infer<typeof FilterSchema>;

export type BondCard = {
  id: string;
  companyName: string;
  sector: string;
  rateBps: number;
  termMonths: number;
  amountCents: number;
  fundedCents: number;
  fundedPct: number;
  payoutFrequency: PayoutFrequency;
  listedAt: Date;
  curator: { id: string; displayName: string; score: number | null };
};

const COMPARE: Record<Sort, (a: BondCard, b: BondCard) => number> = {
  newest: (a, b) => b.listedAt.getTime() - a.listedAt.getTime(),
  yield: (a, b) => b.rateBps - a.rateBps,
  term: (a, b) => a.termMonths - b.termMonths,
  funded: (a, b) => b.fundedPct - a.fundedPct,
};

export function parseFilters(params: Record<string, string | string[] | undefined>): BondFilters {
  const parsed = FilterSchema.parse(params);
  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined)) as BondFilters;
}

const toBps = (pct: number | undefined) => (pct === undefined ? undefined : pctToBps(pct));

export async function listBonds(filters: BondFilters): Promise<BondCard[]> {
  const bonds = await db.bond.findMany({
    where: {
      status: 'LISTED',
      rateBps: { gte: toBps(filters.minRate), lte: toBps(filters.maxRate) },
      termMonths: { gte: filters.minTerm, lte: filters.maxTerm },
      curatorId: filters.curator,
      payoutFrequency: filters.frequency,
    },
    include: {
      company: { select: { name: true, sector: true } },
      curator: { select: { id: true, displayName: true } },
    },
  });
  const ranks = await getCuratorRanks([...new Set(bonds.flatMap((bond) => bond.curatorId ?? []))]);

  const cards = bonds.map((bond): BondCard => {
    assert(bond.curator && bond.listedAt, `listed bond ${bond.id} must have a curator and listedAt`);
    return {
      id: bond.id,
      companyName: bond.company.name,
      sector: bond.company.sector,
      rateBps: bond.rateBps,
      termMonths: bond.termMonths,
      amountCents: bond.amountCents,
      fundedCents: bond.fundedCents,
      fundedPct: fundedPct(bond.fundedCents, bond.amountCents),
      payoutFrequency: parseEnum(PAYOUT_FREQUENCIES, bond.payoutFrequency),
      listedAt: bond.listedAt,
      curator: { ...bond.curator, score: ranks.get(bond.curator.id)?.score ?? null },
    };
  });
  return cards.sort(COMPARE[filters.sort]);
}

export async function listCuratorOptions() {
  return db.curator.findMany({ select: { id: true, displayName: true }, orderBy: { displayName: 'asc' } });
}
