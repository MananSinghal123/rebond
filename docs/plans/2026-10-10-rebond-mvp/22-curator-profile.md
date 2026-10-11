# Curator Stats and Public Profile Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** A public `/curators/[id]` page showing bonds curated, total volume, late count and rank score, plus `getCuratorRanks(ids)` used by marketplace cards and the bond page (it loads only the curators asked for).

**Architecture:** REQUIREMENTS.md FR-15 (public profile: bonds curated, total volume, default/late count, rank score), FR-26 (each payout updates the rank) and §10 step 5. Owner: `lib/services/curators.ts`, which loads rows and delegates the maths to the pure `curatorRank` (plan 05). The rank is computed on read from distribution statuses, never stored, so every payout updates it automatically. "Curated" = `PUBLIC_STATUSES`. "Volume" = the raise amount of bonds in `RAISED_STATUSES`. Both groups come from `lib/domain/lifecycle.ts`. Load impeccable `reference/craft-floor.md` before editing the page.

**Tech Stack:** Prisma 6, Next.js 15 server components, Vitest.

---

**Files:**
- Create: `lib/services/curators.ts`
- Test: `tests/services/curators.test.ts`
- Create: `app/(app)/curators/[id]/page.tsx`

### Task 1: Curator stats

- [ ] **Step 1: Write the failing test `tests/services/curators.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { getCuratorProfile, getCuratorRanks } from '@/lib/services/curators';
import { payNextDistribution } from '@/lib/services/settlement';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActiveBond, makeActor, makeListedBond } from '../helpers/actors';

describe('curator profiles show how their bonds perform', () => {
  beforeEach(clearDatabase);

  describe('when the curated bond paid all 4 distributions on time', () => {
    it('shows 1 bond, $250k volume, 100% on time and a score of 100', async () => {
      const { bondId, curator } = await makeActiveBond();
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));
      const profile = await getCuratorProfile(await curatorIdOf(curator));
      expect(profile).toMatchObject({
        bondsCurated: 1,
        totalVolumeCents: 25_000_000,
        rank: { onTimePct: 100, score: 100, lateCount: 0 },
      });
      expect(profile?.bonds[0]).toMatchObject({ companyName: 'Northwind Health', status: 'MATURED' });
    });
  });

  describe('when one of 4 distributions was paid late', () => {
    it('drops on-time to 75% and counts 1 late payment', async () => {
      const { bondId, curator } = await makeActiveBond();
      unwrap(await payNextDistribution(bondId, { late: true }));
      for (let i = 0; i < 3; i += 1) unwrap(await payNextDistribution(bondId));

      const curatorId = await curatorIdOf(curator);
      const ranks = await getCuratorRanks([curatorId]);
      expect(ranks.get(curatorId)).toEqual({ onTimePct: 75, score: 75, lateCount: 1 });
    });
  });

  describe('when the curator has only listed, unfunded bonds', () => {
    it('counts the bond as curated but reports no volume and no score', async () => {
      const { curator } = await makeListedBond();
      const profile = await getCuratorProfile(await curatorIdOf(curator));
      expect(profile).toMatchObject({ bondsCurated: 1, totalVolumeCents: 0, rank: { score: null } });
    });
  });

  describe('when the curator id does not exist', () => {
    it('returns null', async () => {
      await makeActor('CURATOR');
      expect(await getCuratorProfile('missing')).toBeNull();
    });
  });
});

async function curatorIdOf(actor: Actor): Promise<string> {
  return (await db.curator.findUniqueOrThrow({ where: { userId: actor.userId } })).id;
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/curators.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/curators"`

- [ ] **Step 3: Create `lib/services/curators.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/curators.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Soundness check**

In `rankOf`, change `paidLate: …filter((d) => d.status === 'LATE')…` to `paidLate: 0`.
Run the same command. Expected: FAIL in `drops on-time to 75%…` (`onTimePct: 100` vs `75`).
Restore and re-run. Expected: PASS.

### Task 2: Public profile page

- [ ] **Step 1: Create `app/(app)/curators/[id]/page.tsx`**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, Panel, Stat, StatusBadge } from '@/components/ui';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { getCuratorProfile } from '@/lib/services/curators';

export default async function CuratorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCuratorProfile(id);
  if (!profile) notFound();
  const { rank } = profile;

  return (
    <div className="grid gap-8">
      <PageHeader
        title={profile.displayName}
        description={profile.bio || 'Curator. Vets applications and puts their name on the bonds below.'}
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Rank score" value={rank.score === null ? 'Unrated' : rank.score} />
        <Stat label="On-time distributions" value={rank.onTimePct === null ? '—' : `${rank.onTimePct}%`} />
        <Stat label="Bonds curated" value={profile.bondsCurated} />
        <Stat label="Total volume" value={formatUsd(profile.totalVolumeCents)} />
      </div>
      <p className="text-sm text-muted">
        Late distributions: {rank.lateCount}. The score is the share of distributions paid on time, weighted by bond size.
      </p>
      <Panel title="Curated bonds">
        {profile.bonds.length === 0 ? (
          <p className="text-sm text-muted">No bonds listed yet.</p>
        ) : (
          <ul className="grid gap-2">
            {profile.bonds.map((bond) => (
              <li key={bond.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link href={`/bonds/${bond.id}`} className="hover:underline">
                  {bond.companyName} · {formatUsd(bond.amountCents)} · {formatRate(bond.rateBps)} · {bond.termMonths} mo
                </Link>
                <StatusBadge status={bond.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/services/curators.ts tests/services/curators.test.ts "app/(app)/curators/[id]/page.tsx"
git commit -m "feat(curator): public profile with volume-weighted rank"
```
