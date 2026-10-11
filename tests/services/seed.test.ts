import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { BOND_STATUSES } from '@/lib/domain/types';
import { signIn } from '@/lib/services/accounts';
import { DEMO_PASSWORD, seed } from '@/prisma/seed';

describe('the demo seed covers every role and bond status', () => {
  beforeAll(async () => {
    await seed();
  }, 60_000);

  describe('when the seed has run', () => {
    it('creates 3 companies, 2 curators and 3 investors', async () => {
      expect(await db.company.count()).toBe(3);
      expect(await db.curator.count()).toBe(2);
      expect(await db.user.count({ where: { role: 'INVESTOR' } })).toBe(3);
    });

    it('has at least one bond in every BondStatus', async () => {
      const groups = await db.bond.groupBy({ by: ['status'] });
      expect(groups.map((g) => g.status).sort()).toEqual([...BOND_STATUSES].sort());
    });

    it('lets every demo account sign in with the shared demo password', async () => {
      const result = await signIn({ email: 'investor1@rebond.demo', password: DEMO_PASSWORD });
      expect(result).toMatchObject({ ok: true, value: { role: 'INVESTOR' } });
    });
  });
});
