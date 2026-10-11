# Funding Service Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Verified investors fund `LISTED` bonds. Each ticket opens a `Position` with a mock tx hash. The ticket that fills the raise moves the bond through `FUNDED` to `ACTIVE` and generates its distribution schedule.

**Architecture:** REQUIREMENTS.md FR-19 (min $100, ≤ remaining, Position plus mock tx), FR-20 (fully funded → `FUNDED` → `ACTIVE`, schedule generated), FR-27 (chain events), §3 (only verified investors fund) and §10 step 3. Owner: `lib/services/funding.ts`. The service takes **cents**; the action converts dollars at the edge. The first write reserves capacity atomically: `updateMany({ where: { status: 'LISTED', OR: [fills exactly, leaves ≥ $100] }, data: { fundedCents: { increment: ticket } } })`. The `where` re-checks, against the persisted total, both FR-19 limits that `checkFundAmount` pre-checked on a possibly stale read, so two concurrent tickets can neither overfill the raise nor leave an unfillable remainder under $100. If `count === 0`, nothing is written. On Postgres (the deploy target) two concurrent tickets therefore cannot overfill the raise, and exactly one ticket observes `fundedCents === amountCents` and activates the bond. `FUNDED` is a transition the code asserts, but it is never persisted on its own (see 00-overview deviations). `tests/helpers/actors.ts` gains `makeActiveBond` for plans 21–26.

**Tech Stack:** Prisma 6 interactive transactions, Vitest.

---

**Files:**
- Create: `lib/services/funding.ts`
- Test: `tests/services/funding.test.ts`
- Modify: `tests/helpers/actors.ts`

### Task 1: Fund a bond

- [ ] **Step 1: Write the failing test `tests/services/funding.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { usdToCents } from '@/lib/domain/money';
import { fundBond } from '@/lib/services/funding';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActor, makeListedBond, makeSubmittedBond } from '../helpers/actors';

describe('investors fund listed bonds', () => {
  let bondId: string;
  let investor: Actor;

  beforeEach(async () => {
    await clearDatabase();
    ({ bondId } = await makeListedBond());
    investor = await makeActor('INVESTOR');
  });

  describe('when a ticket covers part of the raise', () => {
    it('opens a position with a mock tx hash and keeps the bond LISTED', async () => {
      const funded = unwrap(await fundBond(investor, bondId, usdToCents(100_000)));
      const position = await db.position.findUniqueOrThrow({ where: { id: funded.positionId } });
      const bond = await db.bond.findUniqueOrThrow({
        where: { id: bondId },
        include: { chainEvents: { orderBy: { id: 'asc' } } },
      });

      expect(funded.status).toBe('LISTED');
      expect(position).toMatchObject({ investorId: investor.userId, amountCents: 10_000_000, txHash: funded.txHash });
      expect(bond).toMatchObject({ status: 'LISTED', fundedCents: 10_000_000 });
      expect(bond.chainEvents.map((e) => e.type)).toEqual(['BOND_LISTED', 'POSITION_OPENED']);
    });
  });

  describe('when two investors fill the $250k raise', () => {
    it('activates the bond with 4 quarterly distributions and a BOND_FUNDED event', async () => {
      const second = await makeActor('INVESTOR');
      const now = new Date('2026-10-10T00:00:00Z');
      unwrap(await fundBond(investor, bondId, usdToCents(150_000), now));
      const last = unwrap(await fundBond(second, bondId, usdToCents(100_000), now));

      const bond = await db.bond.findUniqueOrThrow({
        where: { id: bondId },
        include: { distributions: { orderBy: { seq: 'asc' } }, chainEvents: true },
      });
      expect(last.status).toBe('ACTIVE');
      expect(bond).toMatchObject({ status: 'ACTIVE', fundedAt: now, maturityDate: new Date('2027-10-10T00:00:00Z') });
      expect(bond.distributions.map((d) => d.amountCents)).toEqual([687_500, 687_500, 687_500, 25_687_500]);
      expect(bond.chainEvents.map((e) => e.type)).toContain('BOND_FUNDED');
    });
  });

  describe('when the ticket is below $100', () => {
    it('rejects the ticket and opens no position', async () => {
      expect(await fundBond(investor, bondId, 9_999)).toEqual({ ok: false, error: 'Minimum investment is $100.' });
      expect(await db.position.count()).toBe(0);
    });
  });

  describe('when the ticket is more than what is left to raise', () => {
    it('rejects the ticket and states the remaining amount', async () => {
      unwrap(await fundBond(investor, bondId, usdToCents(200_000)));
      expect(await fundBond(investor, bondId, usdToCents(60_000))).toEqual({ ok: false, error: 'Only $50,000 is left to raise.' });
      expect((await db.bond.findUniqueOrThrow({ where: { id: bondId } })).fundedCents).toBe(20_000_000);
    });
  });

  describe('when the investor has not attested verification', () => {
    it('refuses to fund', async () => {
      const unverified = await makeActor('INVESTOR', { verified: false });
      expect(await fundBond(unverified, bondId, 100_000)).toEqual({
        ok: false,
        error: 'Confirm you are a verified investor before funding.',
      });
    });
  });

  describe('when the bond is still in review', () => {
    it('refuses to fund a bond that is not LISTED', async () => {
      const unlisted = await makeSubmittedBond(await makeActor('COMPANY'));
      expect(await fundBond(investor, unlisted, 100_000)).toEqual({ ok: false, error: 'This bond is not open for funding.' });
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/funding.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/funding"`

- [ ] **Step 3: Create `lib/services/funding.ts`**

```ts
import type { Bond, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { buildChainEvent } from '@/lib/domain/chain';
import { assertTransition } from '@/lib/domain/lifecycle';
import { checkFundAmount, MIN_TICKET_CENTS } from '@/lib/domain/money';
import { addMonthsUtc, buildSchedule } from '@/lib/domain/schedule';
import {
  assert,
  fail,
  ok,
  parseEnum,
  PAYOUT_FREQUENCIES,
  type Actor,
  type BondStatus,
  type Cents,
  type Result,
} from '@/lib/domain/types';

export type Funded = { positionId: string; txHash: string; status: BondStatus };

async function activateBond(tx: Prisma.TransactionClient, bond: Bond, now: Date) {
  assertTransition('LISTED', 'FUNDED');
  assertTransition('FUNDED', 'ACTIVE');
  const schedule = buildSchedule({
    amountCents: bond.amountCents,
    rateBps: bond.rateBps,
    termMonths: bond.termMonths,
    frequency: parseEnum(PAYOUT_FREQUENCIES, bond.payoutFrequency),
    start: now,
  });

  const funded = await tx.bond.updateMany({ where: { id: bond.id, status: 'LISTED' }, data: { status: 'FUNDED', fundedAt: now } });
  assert(funded.count === 1, `bond ${bond.id} filled twice`);
  const activated = await tx.bond.updateMany({
    where: { id: bond.id, status: 'FUNDED' },
    data: { status: 'ACTIVE', maturityDate: addMonthsUtc(now, bond.termMonths) },
  });
  assert(activated.count === 1, `bond ${bond.id} activated twice`);
  await tx.distribution.createMany({ data: schedule.map((row) => ({ ...row, bondId: bond.id })) });
  const payload = { amountCents: bond.amountCents, distributions: schedule.length };
  await tx.chainEvent.create({ data: buildChainEvent(bond.id, 'BOND_FUNDED', payload, now) });
}

export async function fundBond(actor: Actor, bondId: string, amountCents: Cents, now = new Date()): Promise<Result<Funded>> {
  assert(actor.role === 'INVESTOR', 'only investors fund bonds');
  const [investor, bond] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: actor.userId }, select: { verified: true } }),
    db.bond.findUnique({ where: { id: bondId } }),
  ]);
  if (!investor.verified) return fail('Confirm you are a verified investor before funding.');
  if (!bond || bond.status !== 'LISTED') return fail('This bond is not open for funding.');
  const problem = checkFundAmount(amountCents, bond.amountCents - bond.fundedCents);
  if (problem) return fail(problem);

  return db.$transaction(async (tx): Promise<Result<Funded>> => {
    const fillsExactly = { fundedCents: bond.amountCents - amountCents };
    const leavesAMinimumTicket = { fundedCents: { lte: bond.amountCents - amountCents - MIN_TICKET_CENTS } };
    const reserved = await tx.bond.updateMany({
      where: { id: bondId, status: 'LISTED', OR: [fillsExactly, leavesAMinimumTicket] },
      data: { fundedCents: { increment: amountCents } },
    });
    if (reserved.count === 0) return fail('The amount left to raise just changed. Review it and try again.');
    const { fundedCents } = await tx.bond.findUniqueOrThrow({ where: { id: bondId }, select: { fundedCents: true } });

    const opened = buildChainEvent(bondId, 'POSITION_OPENED', { amountCents, fundedCentsAfter: fundedCents }, now);
    const position = await tx.position.create({
      data: { bondId, investorId: actor.userId, amountCents, txHash: opened.txHash },
    });
    await tx.chainEvent.create({ data: opened });

    if (fundedCents < bond.amountCents) return ok({ positionId: position.id, txHash: opened.txHash, status: 'LISTED' });
    await activateBond(tx, bond, now);
    return ok({ positionId: position.id, txHash: opened.txHash, status: 'ACTIVE' });
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/funding.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Soundness check**

Change `if (fundedCents < bond.amountCents)` to `if (true)`.
Run the same command. Expected: FAIL in `activates the bond with 4 quarterly distributions…` (`expected 'LISTED' to be 'ACTIVE'`).
Restore and re-run. Expected: PASS.

### Task 2: Active-bond helper for later plans

- [ ] **Step 1: Append to `tests/helpers/actors.ts`**

Add this import at the top:

```ts
import { fundBond } from '@/lib/services/funding';
```

Append this at the end:

```ts
export async function makeActiveBond(fundedAt = new Date('2026-10-10T00:00:00Z')) {
  const listed = await makeListedBond({}, fundedAt);
  const first = await makeActor('INVESTOR');
  const second = await makeActor('INVESTOR');
  unwrap(await fundBond(first, listed.bondId, 15_000_000, fundedAt));
  unwrap(await fundBond(second, listed.bondId, 10_000_000, fundedAt));
  return { ...listed, investors: [first, second] as const };
}
```

- [ ] **Step 2: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/services/funding.ts tests/services/funding.test.ts tests/helpers/actors.ts
git commit -m "feat(investor): fund listed bonds, activate and schedule when full"
```
