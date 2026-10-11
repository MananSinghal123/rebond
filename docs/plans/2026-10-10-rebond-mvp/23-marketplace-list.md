# Marketplace List Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** `/bonds` lists `LISTED` bonds as cards, with filters (yield range, term range, curator, payout frequency) and sorting (yield, term, % funded, newest) driven by the URL.

**Architecture:** REQUIREMENTS.md FR-16 (card contents), FR-17 (filters and sort) and §6 (`/bonds` is public, server-rendered). Owner: `lib/services/marketplace.ts`. `parseFilters` turns untrusted `searchParams` into typed filters and silently drops bad values. Rate, term, curator and frequency filter in SQL. Sorting happens in memory through a comparator table, because % funded is a derived ratio and the listed set is small. The filter form is a GET form, so it works without JS and every view is a shareable URL. Load impeccable `reference/craft-floor.md` before editing the page.

**Tech Stack:** Prisma 6, Zod, Next.js 15 server components, Vitest.

---

**Files:**
- Create: `lib/services/marketplace.ts`
- Test: `tests/services/marketplace.test.ts`
- Create: `app/(app)/bonds/page.tsx`

### Task 1: Listing query

- [ ] **Step 1: Write the failing test `tests/services/marketplace.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase } from '@/lib/db';
import { listBonds, parseFilters } from '@/lib/services/marketplace';
import { fundBond } from '@/lib/services/funding';
import { unwrap } from '@/lib/domain/types';
import { makeActiveBond, makeActor, makeListedBond } from '../helpers/actors';

describe('investors browse listed bonds', () => {
  let ninePct: string;
  let elevenPct: string;

  beforeEach(async () => {
    await clearDatabase();
    ({ bondId: ninePct } = await makeListedBond({ ratePct: 9, termMonths: 24, payoutFrequency: 'MONTHLY' }, new Date('2026-10-01')));
    ({ bondId: elevenPct } = await makeListedBond({ ratePct: 11, termMonths: 12 }, new Date('2026-10-05')));
    await makeActiveBond();
  });

  describe('when no filters are set', () => {
    it('shows only LISTED bonds, newest first', async () => {
      const bonds = await listBonds(parseFilters({}));
      expect(bonds.map((b) => b.id)).toEqual([elevenPct, ninePct]);
    });
  });

  describe('when the minimum yield is 10%', () => {
    it('hides bonds paying less than 10%', async () => {
      const bonds = await listBonds(parseFilters({ minRate: '10' }));
      expect(bonds.map((b) => b.id)).toEqual([elevenPct]);
    });
  });

  describe('when filtering by monthly payouts and a term of at least 18 months', () => {
    it('returns only bonds matching both', async () => {
      const bonds = await listBonds(parseFilters({ frequency: 'MONTHLY', minTerm: '18' }));
      expect(bonds.map((b) => b.id)).toEqual([ninePct]);
    });
  });

  describe('when sorted by % funded', () => {
    it('puts the most-funded bond first', async () => {
      unwrap(await fundBond(await makeActor('INVESTOR'), ninePct, 10_000_000));
      const bonds = await listBonds(parseFilters({ sort: 'funded' }));
      expect(bonds.map((b) => [b.id, b.fundedPct])).toEqual([
        [ninePct, 40],
        [elevenPct, 0],
      ]);
    });
  });

  describe('when the card needs curator details', () => {
    it('includes the curator name and an unrated score for a new curator', async () => {
      const [card] = await listBonds(parseFilters({}));
      expect(card.curator).toMatchObject({ displayName: expect.any(String), score: null });
      expect(card.companyName).toBe('Northwind Health');
    });
  });

  describe('when the URL carries junk values', () => {
    it('ignores them and falls back to defaults', () => {
      expect(parseFilters({ minRate: 'abc', maxTerm: '', sort: 'random', frequency: 'WEEKLY' })).toEqual({ sort: 'newest' });
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/marketplace.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/marketplace"`

- [ ] **Step 3: Create `lib/services/marketplace.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/marketplace.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Soundness check**

In `optionalNumber`, remove the `z.preprocess(...)` wrapper, leaving `z.coerce.number().nonnegative().optional().catch(undefined)`.
Run the same command. Expected: FAIL in `ignores them and falls back to defaults`, because `maxTerm: ''` coerces to `0`.
Restore and re-run. Expected: PASS.

### Task 2: Marketplace page

- [ ] **Step 1: Create `app/(app)/bonds/page.tsx`**

```tsx
import Link from 'next/link';
import { Button, EmptyState, Field, FREQUENCY_LABEL, inputClass, PageHeader, ProgressBar } from '@/components/ui';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { listBonds, listCuratorOptions, parseFilters, type BondCard } from '@/lib/services/marketplace';

const SORT_LABEL = { newest: 'Newest', yield: 'Highest yield', term: 'Shortest term', funded: 'Most funded' } as const;

function Card({ bond }: { bond: BondCard }) {
  return (
    <li className="relative grid gap-4 rounded-lg border border-line bg-surface p-5 transition-colors duration-150 hover:border-ink/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">
            <Link href={`/bonds/${bond.id}`} className="after:absolute after:inset-0">{bond.companyName}</Link>
          </h2>
          <p className="text-xs text-muted capitalize">{bond.sector.toLowerCase()}</p>
        </div>
        <p className="text-right">
          <span className="block text-2xl font-semibold">{formatRate(bond.rateBps)}</span>
          <span className="text-xs text-muted">fixed / year</span>
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-xs text-muted">Term</dt><dd>{bond.termMonths} mo</dd></div>
        <div><dt className="text-xs text-muted">Raise</dt><dd>{formatUsd(bond.amountCents)}</dd></div>
        <div><dt className="text-xs text-muted">Payouts</dt><dd>{FREQUENCY_LABEL[bond.payoutFrequency]}</dd></div>
      </dl>
      <div className="grid gap-1.5">
        <ProgressBar pct={bond.fundedPct} label={`${bond.companyName} funding progress`} />
        <p className="text-xs text-muted">{bond.fundedPct}% funded</p>
      </div>
      <p className="relative z-10 text-sm">
        <span className="text-muted">Curated by </span>
        <Link href={`/curators/${bond.curator.id}`} className="underline underline-offset-2">{bond.curator.displayName}</Link>
        <span className="text-muted"> · {bond.curator.score === null ? 'Unrated' : `Rank ${bond.curator.score}`}</span>
      </p>
    </li>
  );
}

export default async function BondsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const [bonds, curators] = await Promise.all([listBonds(filters), listCuratorOptions()]);

  return (
    <>
      <PageHeader title="Bonds" description="Fixed-return bonds backed by contracted revenue, vetted by a named curator." />
      <form method="get" className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7 lg:items-end">
        <Field label="Min yield %"><input name="minRate" type="number" step="0.1" min={0} defaultValue={filters.minRate} className={inputClass} /></Field>
        <Field label="Max yield %"><input name="maxRate" type="number" step="0.1" min={0} defaultValue={filters.maxRate} className={inputClass} /></Field>
        <Field label="Min term"><input name="minTerm" type="number" min={0} defaultValue={filters.minTerm} className={inputClass} /></Field>
        <Field label="Max term"><input name="maxTerm" type="number" min={0} defaultValue={filters.maxTerm} className={inputClass} /></Field>
        <Field label="Curator">
          <select name="curator" defaultValue={filters.curator ?? ''} className={inputClass}>
            <option value="">Any</option>
            {curators.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
          </select>
        </Field>
        <Field label="Payouts">
          <select name="frequency" defaultValue={filters.frequency ?? ''} className={inputClass}>
            <option value="">Any</option>
            {Object.entries(FREQUENCY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Sort">
          <select name="sort" defaultValue={filters.sort} className={inputClass}>
            {Object.entries(SORT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <div className="col-span-2 flex gap-3 md:col-span-4 lg:col-span-7">
          <Button variant="secondary">Apply filters</Button>
          <Link href="/bonds" className="self-center text-sm text-muted hover:text-ink">Clear</Link>
        </div>
      </form>
      {bonds.length === 0 ? (
        <EmptyState title="No bonds match these filters">
          <Link href="/bonds" className="text-sm underline underline-offset-2">Clear filters</Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {bonds.map((bond) => <Card key={bond.id} bond={bond} />)}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck, lint and look at it**

Run: `pnpm typecheck && pnpm lint`, then `pnpm dev` and open `/bonds?minRate=10&sort=yield`.
Expected: the inputs show the URL values. Cards show the rate as the largest figure. Clicking anywhere on a card opens the detail, but the curator link opens the profile. At 360px the filters form 2 columns and the cards form 1.

- [ ] **Step 3: Commit**

```bash
git add lib/services/marketplace.ts tests/services/marketplace.test.ts "app/(app)/bonds/page.tsx"
git commit -m "feat(investor): marketplace list with URL filters and sorting"
```
