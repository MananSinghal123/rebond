import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { usdToCents } from '@/lib/domain/money';
import { fundBond } from '@/lib/services/funding';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActor, makeListedBond, makeSubmittedBond } from '../helpers/actors';

describe('investors fund listed bonds', () => {
  let bondId: string;
  let investor: Actor;

  beforeEach(async () => {
    await clearDatabase();
    ({ bondId } = await makeListedBond());
    investor = await makeActor('INVESTOR');
  });

  describe('when a ticket covers part of the raise', () => {
    it('opens a position with a mock tx hash and keeps the bond LISTED', async () => {
      const funded = unwrap(await fundBond(investor, bondId, usdToCents(100_000)));
      const position = await db.position.findUniqueOrThrow({ where: { id: funded.positionId } });
      const bond = await db.bond.findUniqueOrThrow({
        where: { id: bondId },
        include: { chainEvents: { orderBy: { id: 'asc' } } },
      });

      expect(funded.status).toBe('LISTED');
      expect(position).toMatchObject({ investorId: investor.userId, amountCents: 10_000_000, txHash: funded.txHash });
      expect(bond).toMatchObject({ status: 'LISTED', fundedCents: 10_000_000 });
      expect(bond.chainEvents.map((e) => e.type)).toEqual(['BOND_LISTED', 'POSITION_OPENED']);
    });
  });

  describe('when two investors fill the $250k raise', () => {
    it('activates the bond with 4 quarterly distributions and a BOND_FUNDED event', async () => {
      const second = await makeActor('INVESTOR');
      const now = new Date('2026-10-10T00:00:00Z');
      unwrap(await fundBond(investor, bondId, usdToCents(150_000), now));
      const last = unwrap(await fundBond(second, bondId, usdToCents(100_000), now));

      const bond = await db.bond.findUniqueOrThrow({
        where: { id: bondId },
        include: { distributions: { orderBy: { seq: 'asc' } }, chainEvents: true },
      });
      expect(last.status).toBe('ACTIVE');
      expect(bond).toMatchObject({ status: 'ACTIVE', fundedAt: now, maturityDate: new Date('2027-10-10T00:00:00Z') });
      expect(bond.distributions.map((d) => d.amountCents)).toEqual([687_500, 687_500, 687_500, 25_687_500]);
      expect(bond.chainEvents.map((e) => e.type)).toContain('BOND_FUNDED');
    });
  });

  describe('when the ticket is below $100', () => {
    it('rejects the ticket and opens no position', async () => {
      expect(await fundBond(investor, bondId, 9_999)).toEqual({ ok: false, error: 'Minimum investment is $100.' });
      expect(await db.position.count()).toBe(0);
    });
  });

  describe('when the ticket is more than what is left to raise', () => {
    it('rejects the ticket and states the remaining amount', async () => {
      unwrap(await fundBond(investor, bondId, usdToCents(200_000)));
      expect(await fundBond(investor, bondId, usdToCents(60_000))).toEqual({ ok: false, error: 'Only $50,000 is left to raise.' });
      expect((await db.bond.findUniqueOrThrow({ where: { id: bondId } })).fundedCents).toBe(20_000_000);
    });
  });

  describe('when the investor has not attested verification', () => {
    it('refuses to fund', async () => {
      const unverified = await makeActor('INVESTOR', { verified: false });
      expect(await fundBond(unverified, bondId, 100_000)).toEqual({
        ok: false,
        error: 'Confirm you are a verified investor before funding.',
      });
    });
  });

  describe('when the bond is still in review', () => {
    it('refuses to fund a bond that is not LISTED', async () => {
      const unlisted = await makeSubmittedBond(await makeActor('COMPANY'));
      expect(await fundBond(investor, unlisted, 100_000)).toEqual({ ok: false, error: 'This bond is not open for funding.' });
    });
  });
});
