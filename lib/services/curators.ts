import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { PUBLIC_STATUSES, RAISED_STATUSES, SETTLED_DISTRIBUTION_STATUSES } from '@/lib/domain/lifecycle';
import { curatorRank, type CuratorRank } from '@/lib/domain/rank';
import { BOND_STATUSES, parseEnum, type BondStatus } from '@/lib/domain/types';

export type CuratedBond = {
  id: string;
  companyName: string;
  status: BondStatus;
  amountCents: number;
  rateBps: number;
  termMonths: number;
};

export type CuratorProfile = {
  id: string;
  displayName: string;
  bio: string;
  bondsCurated: number;
  totalVolumeCents: number;
  rank: CuratorRank;
  bonds: CuratedBond[];
};

async function loadCurators(where: Prisma.CuratorWhereInput) {
  return db.curator.findMany({
    where,
    include: {
      bonds: {
        where: { status: { in: [...PUBLIC_STATUSES] } },
        orderBy: { listedAt: 'desc' },
        select: {
          id: true,
          status: true,
          amountCents: true,
          rateBps: true,
          termMonths: true,
          company: { select: { name: true } },
          distributions: { where: { status: { in: [...SETTLED_DISTRIBUTION_STATUSES] } }, select: { status: true } },
        },
      },
    },
  });
}

type LoadedCurator = Awaited<ReturnType<typeof loadCurators>>[number];

function rankOf(curator: LoadedCurator): CuratorRank {
  return curatorRank(
    curator.bonds.map((bond) => ({
      volumeCents: bond.amountCents,
      paidOnTime: bond.distributions.filter((d) => d.status === 'PAID').length,
      paidLate: bond.distributions.filter((d) => d.status === 'LATE').length,
    })),
  );
}

export async function getCuratorProfile(curatorId: string): Promise<CuratorProfile | null> {
  const [curator] = await loadCurators({ id: curatorId });
  if (!curator) return null;

  const bonds = curator.bonds.map((bond) => ({
    id: bond.id,
    companyName: bond.company.name,
    status: parseEnum(BOND_STATUSES, bond.status),
    amountCents: bond.amountCents,
    rateBps: bond.rateBps,
    termMonths: bond.termMonths,
  }));
  return {
    id: curator.id,
    displayName: curator.displayName,
    bio: curator.bio,
    bondsCurated: bonds.length,
    totalVolumeCents: bonds.filter((b) => RAISED_STATUSES.includes(b.status)).reduce((sum, b) => sum + b.amountCents, 0),
    rank: rankOf(curator),
    bonds,
  };
}

export async function getCuratorRanks(curatorIds: string[]): Promise<Map<string, CuratorRank>> {
  const curators = await loadCurators({ id: { in: curatorIds } });
  return new Map(curators.map((curator) => [curator.id, rankOf(curator)]));
}
