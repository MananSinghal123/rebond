import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { payNextDistribution } from '@/lib/services/settlement';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActiveBond } from '../helpers/actors';

const receivedBy = async (investor: Actor) => {
  const payouts = await db.payout.findMany({ where: { position: { investorId: investor.userId } } });
  return payouts.reduce((sum, p) => sum + p.amountCents, 0);
};

describe('advancing time settles distributions to investors', () => {
  let bondId: string;
  let investors: readonly [Actor, Actor];

  beforeEach(async () => {
    await clearDatabase();
    ({ bondId, investors } = await makeActiveBond());
  });

  describe('when the first quarterly distribution is paid', () => {
    it('splits $6,875 pro-rata to the $150k and $100k positions', async () => {
      const paid = unwrap(await payNextDistribution(bondId));
      expect(paid).toMatchObject({ seq: 1, status: 'PAID', matured: false });
      expect(await receivedBy(investors[0])).toBe(412_500);
      expect(await receivedBy(investors[1])).toBe(275_000);
      const distribution = await db.distribution.findUniqueOrThrow({ where: { id: paid.distributionId } });
      expect(distribution.txHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('when all 4 distributions are paid', () => {
    it('matures the bond and returns principal plus interest to each investor', async () => {
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));

      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { chainEvents: true } });
      expect(bond.status).toBe('MATURED');
      expect(bond.chainEvents.filter((e) => e.type === 'DISTRIBUTION_PAID')).toHaveLength(4);
      expect(bond.chainEvents.map((e) => e.type)).toContain('BOND_MATURED');
      expect(await receivedBy(investors[0])).toBe(15_000_000 + 1_650_000);
      expect(await receivedBy(investors[1])).toBe(10_000_000 + 1_100_000);
    });
  });

  describe('when the distribution is marked late', () => {
    it('records it as LATE and still pays investors', async () => {
      const paid = unwrap(await payNextDistribution(bondId, { late: true }));
      expect(paid.status).toBe('LATE');
      expect(await receivedBy(investors[0])).toBe(412_500);
    });
  });

  describe('when the bond has matured', () => {
    it('refuses to pay anything further', async () => {
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));
      expect(await payNextDistribution(bondId)).toEqual({ ok: false, error: 'Only active bonds have distributions to pay.' });
    });
  });
});
