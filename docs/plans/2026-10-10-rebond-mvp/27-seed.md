# Seed Script Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** `pnpm db:seed` builds a demo world: 3 companies, 2 curators, 3 investors, and bonds in every status, with a known password for every account.

**Architecture:** REQUIREMENTS.md NFR-6 (seed: 3 companies, 2 curators, 3 investors, bonds in every status) and §2 ("admin back-office beyond a seed script" is out of scope). Owner: `prisma/seed.ts`. It builds state **through the public services** (`signUp` → `chooseRole` → `saveApplication` → `claimApplication` / `decideApplication` → `fundBond` → `payNextDistribution`), so seeded data always obeys the same invariants as real data. The one exception is `FUNDED`: it is transient in the product (plan 20), so the seed funds that bond fully through `fundBond` (positions, `fundedCents` and chain events stay consistent) and then rolls only its status back to `FUNDED`, removing the generated schedule. `DEMO_PASSWORD` reads `SEED_PASSWORD` when set, so a shared deploy does not use the published password. The seed exports `seed()` so a test can run it, and runs itself only when invoked as a script.

**Tech Stack:** tsx, Prisma 6, Vitest.

---

**Files:**
- Create: `prisma/seed.ts`
- Test: `tests/services/seed.test.ts`
- Modify: `package.json`

### Task 1: Seed

- [ ] **Step 1: Write the failing test `tests/services/seed.test.ts`**

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { BOND_STATUSES } from '@/lib/domain/types';
import { signIn } from '@/lib/services/accounts';
import { DEMO_PASSWORD, seed } from '@/prisma/seed';

describe('the demo seed covers every role and bond status', () => {
  beforeAll(async () => {
    await seed();
  }, 60_000);

  describe('when the seed has run', () => {
    it('creates 3 companies, 2 curators and 3 investors', async () => {
      expect(await db.company.count()).toBe(3);
      expect(await db.curator.count()).toBe(2);
      expect(await db.user.count({ where: { role: 'INVESTOR' } })).toBe(3);
    });

    it('has at least one bond in every BondStatus', async () => {
      const groups = await db.bond.groupBy({ by: ['status'] });
      expect(groups.map((g) => g.status).sort()).toEqual([...BOND_STATUSES].sort());
    });

    it('lets every demo account sign in with the shared demo password', async () => {
      const result = await signIn({ email: 'investor1@rebond.demo', password: DEMO_PASSWORD });
      expect(result).toMatchObject({ ok: true, value: { role: 'INVESTOR' } });
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/seed.test.ts`
Expected: FAIL with `Failed to resolve import "@/prisma/seed"`

- [ ] **Step 3: Create `prisma/seed.ts`**

```ts
import { clearDatabase, db } from '@/lib/db';
import { usdToCents } from '@/lib/domain/money';
import { assert, unwrap, type Actor, type Role } from '@/lib/domain/types';
import { chooseRole, signUp } from '@/lib/services/accounts';
import { saveApplication } from '@/lib/services/applications';
import { fundBond } from '@/lib/services/funding';
import { claimApplication, decideApplication, type Decision } from '@/lib/services/review';
import { payNextDistribution } from '@/lib/services/settlement';

export const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'rebond-demo';

async function account(email: string, role: Role, displayName = ''): Promise<Actor> {
  const user = unwrap(await signUp({ email, password: DEMO_PASSWORD }));
  unwrap(await chooseRole(user.id, { role, displayName, verified: role === 'INVESTOR' }));
  return { userId: user.id, role };
}

const application = (companyName: string, overrides: Record<string, string | number> = {}) => ({
  companyName,
  description: `${companyName} earns contracted premiums from regional health plans.`,
  amountUsd: 250_000,
  ratePct: 11,
  termMonths: 12,
  payoutFrequency: 'QUARTERLY',
  contractSummary: 'Multi-year capitation agreements with two regional health plans, paid monthly.',
  annualRevenueUsd: 2_400_000,
  ...overrides,
});

async function apply(company: Actor, fields: ReturnType<typeof application>, submit = true) {
  return unwrap(await saveApplication(company, { submit, fields, documents: [] })).bondId;
}

async function review(curator: Actor, bondId: string, decision?: Decision) {
  unwrap(await claimApplication(curator, bondId));
  if (decision) unwrap(await decideApplication(curator, bondId, decision));
}

const approve: Decision = { kind: 'APPROVE', feeBps: 100, note: 'Payer contracts verified; strong collection history.' };

export async function seed() {
  await clearDatabase();

  const [northwind, harbor, meridian] = [
    await account('northwind@rebond.demo', 'COMPANY', 'Northwind Health'),
    await account('harbor@rebond.demo', 'COMPANY', 'Harbor Dialysis Partners'),
    await account('meridian@rebond.demo', 'COMPANY', 'Meridian Home Care'),
  ];
  const [atlas, juniper] = [
    await account('atlas@rebond.demo', 'CURATOR', 'Atlas Credit Review'),
    await account('juniper@rebond.demo', 'CURATOR', 'Juniper Diligence'),
  ];
  const [inv1, inv2, inv3] = [
    await account('investor1@rebond.demo', 'INVESTOR'),
    await account('investor2@rebond.demo', 'INVESTOR'),
    await account('investor3@rebond.demo', 'INVESTOR'),
  ];

  await apply(harbor, application('Harbor Dialysis Partners', { amountUsd: 400_000 }), false);
  await apply(meridian, application('Meridian Home Care', { ratePct: 10 }));
  await review(atlas, await apply(harbor, application('Harbor Dialysis Partners', { termMonths: 24 })));
  await review(juniper, await apply(meridian, application('Meridian Home Care', { ratePct: 14 })), {
    kind: 'REQUEST_CHANGES',
    note: 'Attach the signed payer contract and 12 months of remittances.',
  });
  await review(juniper, await apply(harbor, application('Harbor Dialysis Partners', { ratePct: 24 })), {
    kind: 'REJECT',
    note: 'Contracted revenue does not cover the proposed coupon.',
  });

  const listed = await apply(northwind, application('Northwind Health', { amountUsd: 500_000, ratePct: 9.5, termMonths: 24, payoutFrequency: 'MONTHLY' }));
  await review(atlas, listed, approve);
  unwrap(await fundBond(inv1, listed, usdToCents(200_000)));

  const transient = await apply(meridian, application('Meridian Home Care', { amountUsd: 150_000 }));
  await review(juniper, transient, approve);
  unwrap(await fundBond(inv3, transient, usdToCents(150_000)));
  await db.$transaction(async (tx) => {
    const rolledBack = await tx.bond.updateMany({
      where: { id: transient, status: 'ACTIVE' },
      data: { status: 'FUNDED', maturityDate: null },
    });
    assert(rolledBack.count === 1, 'seed-only FUNDED rollback must hit the active bond');
    await tx.distribution.deleteMany({ where: { bondId: transient } });
  });

  const active = await apply(northwind, application('Northwind Health'));
  await review(atlas, active, approve);
  unwrap(await fundBond(inv2, active, usdToCents(150_000)));
  unwrap(await fundBond(inv3, active, usdToCents(100_000)));
  unwrap(await payNextDistribution(active));
  unwrap(await payNextDistribution(active));

  const matured = await apply(harbor, application('Harbor Dialysis Partners', { amountUsd: 120_000, termMonths: 6, payoutFrequency: 'AT_MATURITY' }));
  await review(juniper, matured, approve);
  unwrap(await fundBond(inv1, matured, usdToCents(120_000)));
  unwrap(await payNextDistribution(matured, { late: true }));
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed()
    .then(() => console.log(`Seeded. Every account uses the password "${DEMO_PASSWORD}".`))
    .finally(() => db.$disconnect());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/seed.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Soundness check**

Comment out the `await db.$transaction(async (tx) => { … status: 'FUNDED' … })` statement.
Run the same command. Expected: FAIL in `has at least one bond in every BondStatus`, because `FUNDED` is missing.
Restore and re-run. Expected: PASS.

### Task 2: Wire `prisma db seed`

- [ ] **Step 1: Edit `package.json`**

Add a top-level `"prisma"` block (a sibling of `"scripts"`):

```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
```

- [ ] **Step 2: Seed the dev database**

Run: `pnpm prisma db push && pnpm db:seed`
Expected: `Seeded. Every account uses the password "rebond-demo".`

- [ ] **Step 3: Spot-check**

Run: `pnpm dev`. Sign in as `atlas@rebond.demo` / `rebond-demo`. Expected: `/curator` shows 1 in the queue (Meridian at 10%). `/bonds` lists Northwind at 9.5% with 40% funded. Atlas's public profile shows rank 100 after the 2 on-time payouts. Juniper's shows 0 (1 late payout).

- [ ] **Step 4: Run the full suite and commit**

Run: `pnpm test`
Expected: PASS.

```bash
git add prisma/seed.ts tests/services/seed.test.ts package.json
git commit -m "feat(seed): demo world with every role and bond status"
```
