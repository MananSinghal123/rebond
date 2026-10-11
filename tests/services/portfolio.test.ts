import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase } from '@/lib/db';
import { getPortfolio } from '@/lib/services/portfolio';
import { payNextDistribution } from '@/lib/services/settlement';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActiveBond, makeActor } from '../helpers/actors';

describe('investors track their positions to maturity', () => {
  let bondId: string;
  let holder: Actor;

  beforeEach(async () => {
    await clearDatabase();
    const active = await makeActiveBond(new Date('2026-10-10T00:00:00Z'));
    bondId = active.bondId;
    holder = active.investors[0];
  });

  describe('when the bond has just activated', () => {
    it('shows $150k invested, $16,500 expected, nothing received and the first due date', async () => {
      const { summary, positions } = await getPortfolio(holder.userId);
      expect(summary).toEqual({
        investedCents: 15_000_000,
        expectedReturnCents: 1_650_000,
        receivedCents: 0,
        nextPayoutDate: new Date('2027-01-10T00:00:00Z'),
      });
      expect(positions[0]).toMatchObject({ companyName: 'Northwind Health', rateBps: 1100, bondStatus: 'ACTIVE', payouts: [] });
    });
  });

  describe('when the first distribution is paid', () => {
    it('lists the payout with its tx hash in the position history', async () => {
      unwrap(await payNextDistribution(bondId));
      const { summary, positions } = await getPortfolio(holder.userId);
      expect(summary.receivedCents).toBe(412_500);
      expect(positions[0].payouts).toEqual([
        expect.objectContaining({ seq: 1, amountCents: 412_500, late: false, txHash: expect.stringMatching(/^[0-9a-f]{64}$/) }),
      ]);
    });
  });

  describe('when the bond has matured', () => {
    it('shows principal plus interest received and no next payout', async () => {
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));
      const { summary, positions } = await getPortfolio(holder.userId);
      expect(summary).toMatchObject({ receivedCents: 16_650_000, nextPayoutDate: null });
      expect(positions[0].bondStatus).toBe('MATURED');
    });
  });

  describe('when the investor has no positions', () => {
    it('returns zero totals and an empty list', async () => {
      const newcomer = await makeActor('INVESTOR');
      expect(await getPortfolio(newcomer.userId)).toEqual({
        summary: { investedCents: 0, expectedReturnCents: 0, receivedCents: 0, nextPayoutDate: null },
        positions: [],
      });
    });
  });
});
