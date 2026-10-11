import { assert, type BondStatus, type DistributionStatus } from './types';

const TRANSITIONS: Record<BondStatus, readonly BondStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['IN_REVIEW'],
  IN_REVIEW: ['CHANGES_REQUESTED', 'REJECTED', 'LISTED'],
  CHANGES_REQUESTED: ['SUBMITTED'],
  REJECTED: [],
  LISTED: ['FUNDED'],
  FUNDED: ['ACTIVE'],
  ACTIVE: ['MATURED'],
  MATURED: [],
};

export const EDITABLE_STATUSES: readonly BondStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];
export const PUBLIC_STATUSES: readonly BondStatus[] = ['LISTED', 'FUNDED', 'ACTIVE', 'MATURED'];
export const RAISED_STATUSES: readonly BondStatus[] = ['FUNDED', 'ACTIVE', 'MATURED'];
export const ISSUER_LOCKED_STATUSES: readonly BondStatus[] = ['SUBMITTED', 'IN_REVIEW', ...PUBLIC_STATUSES];
export const SETTLED_DISTRIBUTION_STATUSES = ['PAID', 'LATE'] as const satisfies readonly DistributionStatus[];
export type SettledStatus = (typeof SETTLED_DISTRIBUTION_STATUSES)[number];

export function curatorCanView(status: BondStatus, claimedByMe: boolean): boolean {
  return status === 'SUBMITTED' || claimedByMe;
}

export function curatorCanDecide(status: BondStatus, claimedByMe: boolean): boolean {
  return status === 'IN_REVIEW' && claimedByMe;
}

export function canTransition(from: BondStatus, to: BondStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BondStatus, to: BondStatus): void {
  assert(canTransition(from, to), `illegal bond transition ${from} → ${to}`);
}
