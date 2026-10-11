# Settlement Service Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** "Advance time" pays a bond's next scheduled distribution, split pro-rata to its positions, and matures the bond on the final (principal) payout.

**Architecture:** REQUIREMENTS.md FR-24 (mark the next due distribution `PAID`, split pro-rata), FR-25 (final payout → `MATURED`, principal returned), FR-26 (feeds the curator rank) and FR-27 (`DISTRIBUTION_PAID` and `BOND_MATURED` events). Owner: `lib/services/settlement.ts`. There is no actor: this is a simulation tool. Plan 25's only caller requires a signed-in session and `DEMO_DEV_TOOLS=1`, which is never set on a public deploy. The first write claims the distribution with `updateMany({ where: { id, status: 'SCHEDULED' } })` and fails when `count === 0`, and `Payout @@unique([distributionId, positionId])` backs this up in the database. So a double-clicked "Advance time" can never pay a distribution twice. Maturity uses the same guarded-write pattern. `late: true` records the distribution as `LATE` (paid late), so the demo can move a curator's rank. The distribution's tx hash is stored on `Distribution.txHash` for portfolio history (FR-23).

**Tech Stack:** Prisma 6 interactive transactions, Vitest.

---

**Files:**
- Create: `lib/services/settlement.ts`
- Test: `tests/services/settlement.test.ts`

### Task 1: Pay distributions

- [ ] **Step 1: Write the failing test `tests/services/settlement.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { payNextDistribution } from '@/lib/services/settlement';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActiveBond } from '../helpers/actors';

const receivedBy = async (investor: Actor) => {
  const payouts = await db.payout.findMany({ where: { position: { investorId: investor.userId } } });
  return payouts.reduce((sum, p) => sum + p.amountCents, 0);
};

describe('advancing time settles distributions to investors', () => {
  let bondId: string;
  let investors: readonly [Actor, Actor];

  beforeEach(async () => {
    await clearDatabase();
    ({ bondId, investors } = await makeActiveBond());
  });

  describe('when the first quarterly distribution is paid', () => {
    it('splits $6,875 pro-rata to the $150k and $100k positions', async () => {
      const paid = unwrap(await payNextDistribution(bondId));
      expect(paid).toMatchObject({ seq: 1, status: 'PAID', matured: false });
      expect(await receivedBy(investors[0])).toBe(412_500);
      expect(await receivedBy(investors[1])).toBe(275_000);
      const distribution = await db.distribution.findUniqueOrThrow({ where: { id: paid.distributionId } });
      expect(distribution.txHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('when all 4 distributions are paid', () => {
    it('matures the bond and returns principal plus interest to each investor', async () => {
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));

      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { chainEvents: true } });
      expect(bond.status).toBe('MATURED');
      expect(bond.chainEvents.filter((e) => e.type === 'DISTRIBUTION_PAID')).toHaveLength(4);
      expect(bond.chainEvents.map((e) => e.type)).toContain('BOND_MATURED');
      expect(await receivedBy(investors[0])).toBe(15_000_000 + 1_650_000);
      expect(await receivedBy(investors[1])).toBe(10_000_000 + 1_100_000);
    });
  });

  describe('when the distribution is marked late', () => {
    it('records it as LATE and still pays investors', async () => {
      const paid = unwrap(await payNextDistribution(bondId, { late: true }));
      expect(paid.status).toBe('LATE');
      expect(await receivedBy(investors[0])).toBe(412_500);
    });
  });

  describe('when the bond has matured', () => {
    it('refuses to pay anything further', async () => {
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));
      expect(await payNextDistribution(bondId)).toEqual({ ok: false, error: 'Only active bonds have distributions to pay.' });
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/settlement.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/settlement"`

- [ ] **Step 3: Create `lib/services/settlement.ts`**

```ts
import { db } from '@/lib/db';
import { buildChainEvent } from '@/lib/domain/chain';
import { assertTransition, type SettledStatus } from '@/lib/domain/lifecycle';
import { splitProRata } from '@/lib/domain/payouts';
import { assert, fail, ok, type Result } from '@/lib/domain/types';

export type PaidDistribution = { distributionId: string; seq: number; status: SettledStatus; matured: boolean };
export type PayOptions = { late?: boolean; now?: Date };

export async function payNextDistribution(bondId: string, options: PayOptions = {}): Promise<Result<PaidDistribution>> {
  const now = options.now ?? new Date();
  const status: SettledStatus = options.late ? 'LATE' : 'PAID';

  return db.$transaction(async (tx): Promise<Result<PaidDistribution>> => {
    const bond = await tx.bond.findUnique({
      where: { id: bondId },
      include: { positions: { select: { id: true, amountCents: true } } },
    });
    if (!bond || bond.status !== 'ACTIVE') return fail('Only active bonds have distributions to pay.');

    const next = await tx.distribution.findFirst({
      where: { bondId, status: 'SCHEDULED', bond: { status: 'ACTIVE' } },
      orderBy: { seq: 'asc' },
    });
    if (!next) return fail('Only active bonds have distributions to pay.');

    const paidEvent = buildChainEvent(bondId, 'DISTRIBUTION_PAID', { seq: next.seq, amountCents: next.amountCents, status }, now);
    const claimed = await tx.distribution.updateMany({
      where: { id: next.id, status: 'SCHEDULED' },
      data: { status, paidAt: now, txHash: paidEvent.txHash },
    });
    if (claimed.count === 0) return fail('This distribution was just paid. Refresh to see it.');

    const allocations = splitProRata(
      next.amountCents,
      bond.positions.map((p) => ({ id: p.id, weight: p.amountCents })),
    );
    await tx.payout.createMany({
      data: allocations.map((a) => ({ distributionId: next.id, positionId: a.id, amountCents: a.amountCents })),
    });
    await tx.chainEvent.create({ data: paidEvent });

    const paid = { distributionId: next.id, seq: next.seq, status, matured: next.isPrincipal } as const;
    if (!next.isPrincipal) return ok(paid);

    assertTransition('ACTIVE', 'MATURED');
    const matured = await tx.bond.updateMany({ where: { id: bondId, status: 'ACTIVE' }, data: { status: 'MATURED' } });
    assert(matured.count === 1, `bond ${bondId} matured twice`);
    await tx.chainEvent.create({
      data: buildChainEvent(bondId, 'BOND_MATURED', { principalCents: bond.amountCents }, now),
    });
    return ok(paid);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/settlement.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Soundness check**

In `payNextDistribution`, replace the `splitProRata(...)` call with an equal split:
`const allocations = bond.positions.map((p) => ({ id: p.id, amountCents: Math.floor(next.amountCents / bond.positions.length) }));`
Run the same command. Expected: FAIL `expected 343750 to be 412500`.
Restore and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/services/settlement.ts tests/services/settlement.test.ts
git commit -m "feat(settlement): pay distributions pro-rata and mature bonds"
```
