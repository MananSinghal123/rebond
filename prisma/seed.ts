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
