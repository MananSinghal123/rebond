# Portfolio Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** `/portfolio` shows summary tiles, a positions table, and per-position distribution history with tx hashes.

**Architecture:** REQUIREMENTS.md FR-21 (tiles: total invested, expected total return, received to date, next payout date), FR-22 (positions table), FR-23 (per-position history with mock tx hashes) and §10 step 4. Owner: `lib/services/portfolio.ts`. It returns plain view objects. "Expected total return" is interest only: Σ `expectedReturnCents` per position. "Received to date" counts everything paid, including returned principal. History uses `<details>`, so it needs no JS. Load impeccable `reference/craft-floor.md` before editing the page. After this plan, run the second (final) batched desktop and mobile screenshot pass and `impeccable detect` described in 00-overview.

**Tech Stack:** Prisma 6, Next.js 15 server components, Vitest.

---

**Files:**
- Create: `lib/services/portfolio.ts`
- Test: `tests/services/portfolio.test.ts`
- Create: `app/(app)/portfolio/page.tsx`

### Task 1: Portfolio view model

- [ ] **Step 1: Write the failing test `tests/services/portfolio.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase } from '@/lib/db';
import { getPortfolio } from '@/lib/services/portfolio';
import { payNextDistribution } from '@/lib/services/settlement';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActiveBond, makeActor } from '../helpers/actors';

describe('investors track their positions to maturity', () => {
  let bondId: string;
  let holder: Actor;

  beforeEach(async () => {
    await clearDatabase();
    const active = await makeActiveBond(new Date('2026-10-10T00:00:00Z'));
    bondId = active.bondId;
    holder = active.investors[0];
  });

  describe('when the bond has just activated', () => {
    it('shows $150k invested, $16,500 expected, nothing received and the first due date', async () => {
      const { summary, positions } = await getPortfolio(holder.userId);
      expect(summary).toEqual({
        investedCents: 15_000_000,
        expectedReturnCents: 1_650_000,
        receivedCents: 0,
        nextPayoutDate: new Date('2027-01-10T00:00:00Z'),
      });
      expect(positions[0]).toMatchObject({ companyName: 'Northwind Health', rateBps: 1100, bondStatus: 'ACTIVE', payouts: [] });
    });
  });

  describe('when the first distribution is paid', () => {
    it('lists the payout with its tx hash in the position history', async () => {
      unwrap(await payNextDistribution(bondId));
      const { summary, positions } = await getPortfolio(holder.userId);
      expect(summary.receivedCents).toBe(412_500);
      expect(positions[0].payouts).toEqual([
        expect.objectContaining({ seq: 1, amountCents: 412_500, late: false, txHash: expect.stringMatching(/^[0-9a-f]{64}$/) }),
      ]);
    });
  });

  describe('when the bond has matured', () => {
    it('shows principal plus interest received and no next payout', async () => {
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));
      const { summary, positions } = await getPortfolio(holder.userId);
      expect(summary).toMatchObject({ receivedCents: 16_650_000, nextPayoutDate: null });
      expect(positions[0].bondStatus).toBe('MATURED');
    });
  });

  describe('when the investor has no positions', () => {
    it('returns zero totals and an empty list', async () => {
      const newcomer = await makeActor('INVESTOR');
      expect(await getPortfolio(newcomer.userId)).toEqual({
        summary: { investedCents: 0, expectedReturnCents: 0, receivedCents: 0, nextPayoutDate: null },
        positions: [],
      });
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/portfolio.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/portfolio"`

- [ ] **Step 3: Create `lib/services/portfolio.ts`**

```ts
import { db } from '@/lib/db';
import { expectedReturnCents } from '@/lib/domain/money';
import { assert, BOND_STATUSES, parseEnum, type BondStatus } from '@/lib/domain/types';

export type PayoutView = { id: string; seq: number; amountCents: number; paidAt: Date; late: boolean; txHash: string };

export type PositionView = {
  positionId: string;
  bondId: string;
  companyName: string;
  amountCents: number;
  rateBps: number;
  maturityDate: Date | null;
  bondStatus: BondStatus;
  expectedReturnCents: number;
  receivedCents: number;
  txHash: string;
  payouts: PayoutView[];
};

export type PortfolioSummary = {
  investedCents: number;
  expectedReturnCents: number;
  receivedCents: number;
  nextPayoutDate: Date | null;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export async function getPortfolio(investorId: string): Promise<{ summary: PortfolioSummary; positions: PositionView[] }> {
  const [rows, next] = await Promise.all([
    db.position.findMany({
      where: { investorId },
      orderBy: { createdAt: 'desc' },
      include: {
        bond: { include: { company: { select: { name: true } } } },
        payouts: { include: { distribution: true }, orderBy: { distribution: { seq: 'asc' } } },
      },
    }),
    db.distribution.findFirst({
      where: { status: 'SCHEDULED', bond: { positions: { some: { investorId } } } },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const positions = rows.map((row): PositionView => {
    const payouts = row.payouts.map((payout) => {
      const { distribution } = payout;
      assert(distribution.paidAt && distribution.txHash, `payout ${payout.id} belongs to an unpaid distribution`);
      return {
        id: payout.id,
        seq: distribution.seq,
        amountCents: payout.amountCents,
        paidAt: distribution.paidAt,
        late: distribution.status === 'LATE',
        txHash: distribution.txHash,
      };
    });
    return {
      positionId: row.id,
      bondId: row.bondId,
      companyName: row.bond.company.name,
      amountCents: row.amountCents,
      rateBps: row.bond.rateBps,
      maturityDate: row.bond.maturityDate,
      bondStatus: parseEnum(BOND_STATUSES, row.bond.status),
      expectedReturnCents: expectedReturnCents(row.amountCents, row.bond.rateBps, row.bond.termMonths),
      receivedCents: sum(payouts.map((p) => p.amountCents)),
      txHash: row.txHash,
      payouts,
    };
  });

  return {
    summary: {
      investedCents: sum(positions.map((p) => p.amountCents)),
      expectedReturnCents: sum(positions.map((p) => p.expectedReturnCents)),
      receivedCents: sum(positions.map((p) => p.receivedCents)),
      nextPayoutDate: next?.dueDate ?? null,
    },
    positions,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/portfolio.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Soundness check**

In the `db.distribution.findFirst` query, remove `status: 'SCHEDULED',`.
Run the same command. Expected: FAIL in `shows principal plus interest received and no next payout` (a date is returned instead of `null`).
Restore and re-run. Expected: PASS.

### Task 2: Portfolio page

- [ ] **Step 1: Create `app/(app)/portfolio/page.tsx`**

```tsx
import Link from 'next/link';
import {
  ButtonLink,
  EmptyState,
  formatDate,
  PageHeader,
  shortHash,
  Stat,
  StatusBadge,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { getPortfolio } from '@/lib/services/portfolio';

export default async function PortfolioPage() {
  const actor = await requireActor('INVESTOR');
  const { summary, positions } = await getPortfolio(actor.userId);

  return (
    <div className="grid gap-8">
      <PageHeader title="Portfolio" description="Your positions, what they have paid, and what comes next." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total invested" value={formatUsd(summary.investedCents)} />
        <Stat label="Expected total return" value={formatUsd(summary.expectedReturnCents)} />
        <Stat label="Received to date" value={formatUsd(summary.receivedCents)} />
        <Stat label="Next payout" value={summary.nextPayoutDate ? formatDate(summary.nextPayoutDate) : '—'} />
      </div>

      {positions.length === 0 ? (
        <EmptyState title="No positions yet">
          <p className="text-sm text-muted">Fund a listed bond and it appears here with its payout schedule.</p>
          <ButtonLink href="/bonds">Browse bonds</ButtonLink>
        </EmptyState>
      ) : (
        <>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <caption className="sr-only">Positions</caption>
              <thead>
                <tr>
                  <th className={thClass}>Bond</th>
                  <th className={thClass}>Amount</th>
                  <th className={thClass}>Rate</th>
                  <th className={thClass}>Maturity</th>
                  <th className={thClass}>Received</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.positionId}>
                    <td className={tdClass}><Link href={`/bonds/${p.bondId}`} className="underline underline-offset-2">{p.companyName}</Link></td>
                    <td className={tdClass}>{formatUsd(p.amountCents)}</td>
                    <td className={tdClass}>{formatRate(p.rateBps)}</td>
                    <td className={tdClass}>{p.maturityDate ? formatDate(p.maturityDate) : 'Set at activation'}</td>
                    <td className={tdClass}>{formatUsd(p.receivedCents)}</td>
                    <td className={tdClass}><StatusBadge status={p.bondStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="grid gap-3">
            <h2 className="text-sm font-semibold">Distribution history</h2>
            {positions.map((p) => (
              <details key={p.positionId} className="rounded-lg border border-line bg-surface p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {p.companyName} · {formatUsd(p.amountCents)} · {p.payouts.length} payouts received
                </summary>
                <p className="mt-3 font-mono text-xs text-muted">Position tx {shortHash(p.txHash)}</p>
                <ul className="mt-3 grid gap-2 text-sm">
                  {p.payouts.map((payout) => (
                    <li key={payout.id} className="flex flex-wrap justify-between gap-x-4">
                      <span>#{payout.seq} · {formatDate(payout.paidAt)}{payout.late && <span className="text-warn"> · late</span>}</span>
                      <span>{formatUsd(payout.amountCents)}</span>
                      <span className="w-full font-mono text-xs text-muted">tx {shortHash(payout.txHash)}</span>
                    </li>
                  ))}
                  {p.payouts.length === 0 && <li className="text-muted">No payouts yet.</li>}
                </ul>
              </details>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 3: Impeccable visual pass (second and final batched round)**

Take screenshots of `/bonds`, `/bonds/<active id>`, `/portfolio`, `/company`, `/curator` and `/curators/<id>` at 1280px and 360px in one round. Run `.claude/skills/impeccable/scripts/impeccable detect --json app components` once. Fix every finding in one batch, confirm with at most one more screenshot round, then stop.

- [ ] **Step 4: Commit**

```bash
git add lib/services/portfolio.ts tests/services/portfolio.test.ts "app/(app)/portfolio/page.tsx"
git commit -m "feat(investor): portfolio summary, positions and payout history"
```
