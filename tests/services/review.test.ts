import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { saveApplication } from '@/lib/services/applications';
import { claimApplication, decideApplication } from '@/lib/services/review';
import { unwrap, type Actor } from '@/lib/domain/types';
import { DEMO_APPLICATION, makeActor, makeSubmittedBond } from '../helpers/actors';

describe('curators review applications before they are listed', () => {
  let company: Actor;
  let curator: Actor;
  let bondId: string;

  beforeEach(async () => {
    await clearDatabase();
    company = await makeActor('COMPANY');
    curator = await makeActor('CURATOR', { name: 'Atlas Credit Review' });
    bondId = await makeSubmittedBond(company);
  });

  describe('when a curator claims a SUBMITTED application', () => {
    it('moves it to IN_REVIEW under that curator', async () => {
      unwrap(await claimApplication(curator, bondId));
      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { curator: true } });
      expect(bond.status).toBe('IN_REVIEW');
      expect(bond.curator?.displayName).toBe('Atlas Credit Review');
    });
  });

  describe('when a second curator tries to claim the same application', () => {
    it('refuses because it has left the queue', async () => {
      unwrap(await claimApplication(curator, bondId));
      const rival = await makeActor('CURATOR');
      expect(await claimApplication(rival, bondId)).toEqual({
        ok: false,
        error: 'This application is no longer waiting in the queue.',
      });
    });
  });

  describe('when the curator approves at a 1% fee', () => {
    it('lists the bond with the fee and records a BOND_LISTED chain event', async () => {
      const at = new Date('2026-10-10T09:00:00Z');
      unwrap(await claimApplication(curator, bondId));
      unwrap(await decideApplication(curator, bondId, { kind: 'APPROVE', feeBps: 100, note: 'Strong payer mix.' }, at));

      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId }, include: { chainEvents: true } });
      expect(bond).toMatchObject({ status: 'LISTED', curatorFeeBps: 100, listedAt: at, reviewNote: 'Strong payer mix.' });
      expect(bond.chainEvents.map((e) => e.type)).toEqual(['BOND_LISTED']);
      expect(bond.chainEvents[0].txHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('when the curator fee is outside 0.5% to 2%', () => {
    it('refuses to list the bond', async () => {
      unwrap(await claimApplication(curator, bondId));
      const result = await decideApplication(curator, bondId, { kind: 'APPROVE', feeBps: 300, note: '' });
      expect(result).toEqual({ ok: false, error: 'Curator fee must be between 0.5% and 2%.' });
      expect((await db.bond.findUniqueOrThrow({ where: { id: bondId } })).status).toBe('IN_REVIEW');
    });
  });

  describe('when the curator rejects without a note', () => {
    it('requires a note', async () => {
      unwrap(await claimApplication(curator, bondId));
      const result = await decideApplication(curator, bondId, { kind: 'REJECT', note: '   ' });
      expect(result).toEqual({ ok: false, error: 'A note is required when requesting changes or rejecting.' });
    });
  });

  describe('when the curator requests changes and the company resubmits', () => {
    it('returns the application to the queue with the curator note visible', async () => {
      unwrap(await claimApplication(curator, bondId));
      unwrap(await decideApplication(curator, bondId, { kind: 'REQUEST_CHANGES', note: 'Attach the payer contract.' }));
      unwrap(await saveApplication(company, { bondId, submit: true, fields: DEMO_APPLICATION, documents: [] }));

      const bond = await db.bond.findUniqueOrThrow({ where: { id: bondId } });
      expect(bond).toMatchObject({ status: 'SUBMITTED', reviewNote: 'Attach the payer contract.', curatorId: null });
    });
  });

  describe('when a curator decides on an application they have not claimed', () => {
    it('refuses the decision', async () => {
      const result = await decideApplication(curator, bondId, { kind: 'APPROVE', feeBps: 100, note: '' });
      expect(result).toEqual({ ok: false, error: 'Claim this application before deciding on it.' });
    });
  });
});
