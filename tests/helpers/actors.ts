import { saveApplication } from '@/lib/services/applications';
import { claimApplication, decideApplication } from '@/lib/services/review';
import { chooseRole, signUp } from '@/lib/services/accounts';
import { unwrap, type Actor, type Role } from '@/lib/domain/types';

let sequence = 0;

export async function makeActor(role: Role, options: { name?: string; verified?: boolean } = {}): Promise<Actor> {
  sequence += 1;
  const user = unwrap(await signUp({ email: `${role.toLowerCase()}${sequence}@example.test`, password: 'correct horse battery' }));
  unwrap(
    await chooseRole(user.id, {
      role,
      displayName: options.name ?? `${role} ${sequence}`,
      verified: options.verified ?? true,
    }),
  );
  return { userId: user.id, role };
}

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
