# Review Service Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Curators claim `SUBMITTED` applications and then approve and list (with a 0.5–2% fee), request changes, or reject (notes required). Listing writes a `BOND_LISTED` chain event.

**Architecture:** REQUIREMENTS.md FR-12 (claim moves to `IN_REVIEW`), FR-13 (three decisions; a note is required for changes or reject), FR-14 (fee; `LISTED` with the curator attached) and FR-27 (chain event on listing). Owner: `lib/services/review.ts`. Both writes are conditional `updateMany` calls that check the persisted status (claim: `status = SUBMITTED`; decide: `status = IN_REVIEW AND curatorId = me`) and fail when `count === 0`. So two curators racing to claim, or a double-submitted decision, cannot both win, and a `BOND_LISTED` chain event is written only by the decision that actually listed the bond. `Decision` is a tagged union, and a `NEXT_STATUS` table maps each kind to its status, so there is no branching per decision beyond the approve-only fields. `tests/helpers/actors.ts` gains `makeSubmittedBond` and `makeListedBond`, which later plans use.

**Tech Stack:** Prisma 6, Vitest.

---

**Files:**
- Create: `lib/services/review.ts`
- Test: `tests/services/review.test.ts`
- Modify: `tests/helpers/actors.ts`

### Task 1: Claim and decide

- [ ] **Step 1: Append bond builders to `tests/helpers/actors.ts`**

Add these imports at the top of the file:

```ts
import { saveApplication } from '@/lib/services/applications';
import { claimApplication, decideApplication } from '@/lib/services/review';
```

Append this at the end of the file:

```ts
export const DEMO_APPLICATION = {
  companyName: 'Northwind Health',
  description: 'Regional clinic network with contracted health-plan premiums.',
  amountUsd: 250_000,
  ratePct: 11,
  termMonths: 12,
  payoutFrequency: 'QUARTERLY',
  contractSummary: 'Three-year capitation contract with a regional health plan.',
  annualRevenueUsd: 1_800_000,
};

export async function makeSubmittedBond(company: Actor, fields: Partial<typeof DEMO_APPLICATION> = {}): Promise<string> {
  const saved = await saveApplication(company, { submit: true, fields: { ...DEMO_APPLICATION, ...fields }, documents: [] });
  return unwrap(saved).bondId;
}

export async function makeListedBond(fields: Partial<typeof DEMO_APPLICATION> = {}, now = new Date()) {
  const company = await makeActor('COMPANY');
  const curator = await makeActor('CURATOR');
  const bondId = await makeSubmittedBond(company, fields);
  unwrap(await claimApplication(curator, bondId));
  unwrap(await decideApplication(curator, bondId, { kind: 'APPROVE', feeBps: 100, note: '' }, now));
  return { bondId, company, curator };
}
```

- [ ] **Step 2: Write the failing test `tests/services/review.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { saveApplication } from '@/lib/services/applications';
import { claimApplication, decideApplication } from '@/lib/services/review';
import { unwrap, type Actor } from '@/lib/domain/types';
import { DEMO_APPLICATION, makeActor, makeSubmittedBond } from '../helpers/actors';

describe('curators review applications before they are listed', () => {
  let company: Actor;
  let curator: Actor;
  let bondId: string;

  beforeEach(async () => {
    await clearDatabase();
    company = await makeActor('COMPANY');
    curator = await makeActor('CURATOR', { name: 'Atlas Credit Review' });
    bondId = await makeSubmittedBond(company);
  });

  describe('when a curator claims a SUBMITTED application', () => {
    it('moves it to IN_REVIEW under that curator', async () => {
      unwrap(await claimApplication(curator, bondId));
      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { curator: true } });
      expect(bond.status).toBe('IN_REVIEW');
      expect(bond.curator?.displayName).toBe('Atlas Credit Review');
    });
  });

  describe('when a second curator tries to claim the same application', () => {
    it('refuses because it has left the queue', async () => {
      unwrap(await claimApplication(curator, bondId));
      const rival = await makeActor('CURATOR');
      expect(await claimApplication(rival, bondId)).toEqual({
        ok: false,
        error: 'This application is no longer waiting in the queue.',
      });
    });
  });

  describe('when the curator approves at a 1% fee', () => {
    it('lists the bond with the fee and records a BOND_LISTED chain event', async () => {
      const at = new Date('2026-10-10T09:00:00Z');
      unwrap(await claimApplication(curator, bondId));
      unwrap(await decideApplication(curator, bondId, { kind: 'APPROVE', feeBps: 100, note: 'Strong payer mix.' }, at));

      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { chainEvents: true } });
      expect(bond).toMatchObject({ status: 'LISTED', curatorFeeBps: 100, listedAt: at, reviewNote: 'Strong payer mix.' });
      expect(bond.chainEvents.map((e) => e.type)).toEqual(['BOND_LISTED']);
      expect(bond.chainEvents[0].txHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('when the curator fee is outside 0.5% to 2%', () => {
    it('refuses to list the bond', async () => {
      unwrap(await claimApplication(curator, bondId));
      const result = await decideApplication(curator, bondId, { kind: 'APPROVE', feeBps: 300, note: '' });
      expect(result).toEqual({ ok: false, error: 'Curator fee must be between 0.5% and 2%.' });
      expect((await db.bond.findUniqueOrThrow({ where: { id: bondId } })).status).toBe('IN_REVIEW');
    });
  });

  describe('when the curator rejects without a note', () => {
    it('requires a note', async () => {
      unwrap(await claimApplication(curator, bondId));
      const result = await decideApplication(curator, bondId, { kind: 'REJECT', note: '   ' });
      expect(result).toEqual({ ok: false, error: 'A note is required when requesting changes or rejecting.' });
    });
  });

  describe('when the curator requests changes and the company resubmits', () => {
    it('returns the application to the queue with the curator note visible', async () => {
      unwrap(await claimApplication(curator, bondId));
      unwrap(await decideApplication(curator, bondId, { kind: 'REQUEST_CHANGES', note: 'Attach the payer contract.' }));
      unwrap(await saveApplication(company, { bondId, submit: true, fields: DEMO_APPLICATION, documents: [] }));

      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId } });
      expect(bond).toMatchObject({ status: 'SUBMITTED', reviewNote: 'Attach the payer contract.', curatorId: null });
    });
  });

  describe('when a curator decides on an application they have not claimed', () => {
    it('refuses the decision', async () => {
      const result = await decideApplication(curator, bondId, { kind: 'APPROVE', feeBps: 100, note: '' });
      expect(result).toEqual({ ok: false, error: 'Claim this application before deciding on it.' });
    });
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run tests/services/review.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/review"`

- [ ] **Step 4: Create `lib/services/review.ts`**

```ts
import { db } from '@/lib/db';
import { buildChainEvent } from '@/lib/domain/chain';
import { assertTransition } from '@/lib/domain/lifecycle';
import { MAX_FEE_BPS, MIN_FEE_BPS } from '@/lib/domain/money';
import { assert, fail, ok, type Actor, type BondStatus, type Result } from '@/lib/domain/types';


export type Decision =
  | { kind: 'APPROVE'; feeBps: number; note: string }
  | { kind: 'REQUEST_CHANGES'; note: string }
  | { kind: 'REJECT'; note: string };

const NEXT_STATUS = {
  APPROVE: 'LISTED',
  REQUEST_CHANGES: 'CHANGES_REQUESTED',
  REJECT: 'REJECTED',
} as const satisfies Record<Decision['kind'], BondStatus>;

async function curatorFor(actor: Actor) {
  assert(actor.role === 'CURATOR', 'only curators review applications');
  return db.curator.findUniqueOrThrow({ where: { userId: actor.userId } });
}

export async function claimApplication(actor: Actor, bondId: string): Promise<Result<null>> {
  const curator = await curatorFor(actor);
  assertTransition('SUBMITTED', 'IN_REVIEW');
  const claimed = await db.bond.updateMany({
    where: { id: bondId, status: 'SUBMITTED' },
    data: { status: 'IN_REVIEW', curatorId: curator.id },
  });
  if (claimed.count === 0) return fail('This application is no longer waiting in the queue.');
  return ok(null);
}

export async function decideApplication(
  actor: Actor,
  bondId: string,
  decision: Decision,
  now = new Date(),
): Promise<Result<{ status: BondStatus }>> {
  const curator = await curatorFor(actor);
  const note = decision.note.trim();
  if (decision.kind !== 'APPROVE' && note.length === 0) {
    return fail('A note is required when requesting changes or rejecting.');
  }
  if (decision.kind === 'APPROVE' && !(decision.feeBps >= MIN_FEE_BPS && decision.feeBps <= MAX_FEE_BPS)) {
    return fail('Curator fee must be between 0.5% and 2%.');
  }

  const status = NEXT_STATUS[decision.kind];
  assertTransition('IN_REVIEW', status);
  const listing = decision.kind === 'APPROVE' ? { curatorFeeBps: decision.feeBps, listedAt: now } : {};

  return db.$transaction(async (tx): Promise<Result<{ status: BondStatus }>> => {
    const decided = await tx.bond.updateMany({
      where: { id: bondId, status: 'IN_REVIEW', curatorId: curator.id },
      data: { status, reviewNote: note || null, ...listing },
    });
    if (decided.count === 0) return fail('Claim this application before deciding on it.');
    if (status !== 'LISTED') return ok({ status });

    const bond = await tx.bond.findUniqueOrThrow({ where: { id: bondId } });
    const payload = {
      curatorId: curator.id,
      amountCents: bond.amountCents,
      rateBps: bond.rateBps,
      termMonths: bond.termMonths,
    };
    await tx.chainEvent.create({ data: buildChainEvent(bondId, 'BOND_LISTED', payload, now) });
    return ok({ status });
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/review.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Soundness check**

In `claimApplication`, change `where: { id: bondId, status: 'SUBMITTED' }` to `where: { id: bondId }`.
Run the same command. Expected: FAIL in `refuses because it has left the queue`, because the rival's claim succeeds.
Restore and re-run. Expected: PASS.

- [ ] **Step 7: Run the full suite (helpers changed)**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/services/review.ts tests/services/review.test.ts tests/helpers/actors.ts
git commit -m "feat(curator): claim, approve/list, request changes, reject"
```
