import { db } from '@/lib/db';
import { expectedReturnCents } from '@/lib/domain/money';
import { assert, BOND_STATUSES, parseEnum, type BondStatus } from '@/lib/domain/types';

export type PayoutView = { id: string; seq: number; amountCents: number; paidAt: Date; late: boolean; txHash: string };

export type PositionView = {
  positionId: string;
  bondId: string;
  companyName: string;
  amountCents: number;
  rateBps: number;
  maturityDate: Date | null;
  bondStatus: BondStatus;
  expectedReturnCents: number;
  receivedCents: number;
  txHash: string;
  payouts: PayoutView[];
};

export type PortfolioSummary = {
  investedCents: number;
  expectedReturnCents: number;
  receivedCents: number;
  nextPayoutDate: Date | null;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export async function getPortfolio(investorId: string): Promise<{ summary: PortfolioSummary; positions: PositionView[] }> {
  const [rows, next] = await Promise.all([
    db.position.findMany({
      where: { investorId },
      orderBy: { createdAt: 'desc' },
      include: {
        bond: { include: { company: { select: { name: true } } } },
        payouts: { include: { distribution: true }, orderBy: { distribution: { seq: 'asc' } } },
      },
    }),
    db.distribution.findFirst({
      where: { status: 'SCHEDULED', bond: { positions: { some: { investorId } } } },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const positions = rows.map((row): PositionView => {
    const payouts = row.payouts.map((payout) => {
      const { distribution } = payout;
      assert(distribution.paidAt && distribution.txHash, `payout ${payout.id} belongs to an unpaid distribution`);
      return {
        id: payout.id,
        seq: distribution.seq,
        amountCents: payout.amountCents,
        paidAt: distribution.paidAt,
        late: distribution.status === 'LATE',
        txHash: distribution.txHash,
      };
    });
    return {
      positionId: row.id,
      bondId: row.bondId,
      companyName: row.bond.company.name,
      amountCents: row.amountCents,
      rateBps: row.bond.rateBps,
      maturityDate: row.bond.maturityDate,
      bondStatus: parseEnum(BOND_STATUSES, row.bond.status),
      expectedReturnCents: expectedReturnCents(row.amountCents, row.bond.rateBps, row.bond.termMonths),
      receivedCents: sum(payouts.map((p) => p.amountCents)),
      txHash: row.txHash,
      payouts,
    };
  });

  return {
    summary: {
      investedCents: sum(positions.map((p) => p.amountCents)),
      expectedReturnCents: sum(positions.map((p) => p.expectedReturnCents)),
      receivedCents: sum(positions.map((p) => p.receivedCents)),
      nextPayoutDate: next?.dueDate ?? null,
    },
    positions,
  };
}
