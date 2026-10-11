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
