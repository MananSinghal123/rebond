import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { getCuratorProfile, getCuratorRanks } from '@/lib/services/curators';
import { payNextDistribution } from '@/lib/services/settlement';
import { unwrap, type Actor } from '@/lib/domain/types';
import { makeActiveBond, makeActor, makeListedBond } from '../helpers/actors';

describe('curator profiles show how their bonds perform', () => {
  beforeEach(clearDatabase);

  describe('when the curated bond paid all 4 distributions on time', () => {
    it('shows 1 bond, $250k volume, 100% on time and a score of 100', async () => {
      const { bondId, curator } = await makeActiveBond();
      for (let i = 0; i < 4; i += 1) unwrap(await payNextDistribution(bondId));
      const profile = await getCuratorProfile(await curatorIdOf(curator));
      expect(profile).toMatchObject({
        bondsCurated: 1,
        totalVolumeCents: 25_000_000,
        rank: { onTimePct: 100, score: 100, lateCount: 0 },
      });
      expect(profile?.bonds[0]).toMatchObject({ companyName: 'Northwind Health', status: 'MATURED' });
    });
  });

  describe('when one of 4 distributions was paid late', () => {
    it('drops on-time to 75% and counts 1 late payment', async () => {
      const { bondId, curator } = await makeActiveBond();
      unwrap(await payNextDistribution(bondId, { late: true }));
      for (let i = 0; i < 3; i += 1) unwrap(await payNextDistribution(bondId));

      const curatorId = await curatorIdOf(curator);
      const ranks = await getCuratorRanks([curatorId]);
      expect(ranks.get(curatorId)).toEqual({ onTimePct: 75, score: 75, lateCount: 1 });
    });
  });

  describe('when the curator has only listed, unfunded bonds', () => {
    it('counts the bond as curated but reports no volume and no score', async () => {
      const { curator } = await makeListedBond();
      const profile = await getCuratorProfile(await curatorIdOf(curator));
      expect(profile).toMatchObject({ bondsCurated: 1, totalVolumeCents: 0, rank: { score: null } });
    });
  });

  describe('when the curator id does not exist', () => {
    it('returns null', async () => {
      await makeActor('CURATOR');
      expect(await getCuratorProfile('missing')).toBeNull();
    });
  });
});

async function curatorIdOf(actor: Actor): Promise<string> {
  return (await db.curator.findUniqueOrThrow({ where: { userId: actor.userId } })).id;
}
