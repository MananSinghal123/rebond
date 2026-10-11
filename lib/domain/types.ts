export const ROLES = ['INVESTOR', 'CURATOR', 'COMPANY'] as const;
export type Role = (typeof ROLES)[number];

export const BOND_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'REJECTED',
  'LISTED',
  'FUNDED',
  'ACTIVE',
  'MATURED',
] as const;
export type BondStatus = (typeof BOND_STATUSES)[number];

export const PAYOUT_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'AT_MATURITY'] as const;
export type PayoutFrequency = (typeof PAYOUT_FREQUENCIES)[number];

export const DISTRIBUTION_STATUSES = ['SCHEDULED', 'PAID', 'LATE'] as const;
export type DistributionStatus = (typeof DISTRIBUTION_STATUSES)[number];

export const CHAIN_EVENT_TYPES = [
  'BOND_LISTED',
  'POSITION_OPENED',
  'BOND_FUNDED',
  'DISTRIBUTION_PAID',
  'BOND_MATURED',
] as const;
export type ChainEventType = (typeof CHAIN_EVENT_TYPES)[number];

export const WALLET_KINDS = ['EXTERNAL', 'EMBEDDED_DEMO'] as const;
export type WalletKind = (typeof WALLET_KINDS)[number];

export type Cents = number;
export type Bps = number;

export type Actor = { userId: string; role: Role };

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (error: string): Result<never> => ({ ok: false, error });

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant: ${message}`);
}

export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Invariant: expected ok result, got "${result.error}"`);
  return result.value;
}

export function parseEnum<T extends string>(values: readonly T[], raw: string): T {
  const match = values.find((value) => value === raw);
  assert(match !== undefined, `unknown enum value "${raw}"`);
  return match;
}
