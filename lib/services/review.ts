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
