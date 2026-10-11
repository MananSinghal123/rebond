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
