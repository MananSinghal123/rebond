import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';

describe('service tests run against an isolated SQLite database', () => {
  beforeEach(clearDatabase);

  describe('when the suite starts', () => {
    it('connects to prisma/test.db, never the dev database', () => {
      expect(process.env.DATABASE_URL).toBe('file:./test.db');
    });
  });

  describe('when a previous test left rows behind', () => {
    it('starts every test with no users', async () => {
      await db.user.create({ data: { email: 'left@behind.test', passwordHash: 'x' } });
      await clearDatabase();
      expect(await db.user.count()).toBe(0);
    });
  });
});
