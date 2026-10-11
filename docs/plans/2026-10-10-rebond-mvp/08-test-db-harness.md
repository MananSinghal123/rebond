# Test Database Harness Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Service integration tests run against a real, freshly pushed SQLite database (`prisma/test.db`), wiped between tests with `clearDatabase()`.

**Architecture:** REQUIREMENTS.md §7 (Vitest). Service tests (plans 09 onward) call `lib/services/*` with the real Prisma client. No mocks inside our boundary. `globalSetup` force-resets the schema once per run. `clearDatabase()` from `lib/db.ts` (plan 07) runs in each suite's `beforeEach`; `tests/helpers/global-setup.ts` holds only the global setup. Test files run serially because they share one SQLite file.

**Tech Stack:** Vitest, Prisma 6, SQLite.

---

**Files:**
- Modify: `vitest.config.ts`
- Create: `tests/helpers/global-setup.ts`
- Test: `tests/services/harness.test.ts`

### Task 1: Harness

- [ ] **Step 1: Write the failing test `tests/services/harness.test.ts`**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/harness.test.ts`
Expected: 1 failed, 1 passed — FAIL `expected 'file:./dev.db' to be 'file:./test.db'` (Prisma loads `.env`, and Vitest has no test env yet). This red run empties `prisma/dev.db`, which is harmless because it holds no data yet.

- [ ] **Step 3: Create `tests/helpers/global-setup.ts`**

```ts
import { execSync } from 'node:child_process';

export default function setup() {
  execSync('pnpm prisma db push --force-reset --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
```

- [ ] **Step 4: Replace `vitest.config.ts`**

```ts
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': dirname(fileURLToPath(import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/helpers/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      DATABASE_URL: 'file:./test.db',
      SESSION_SECRET: 'test-session-secret-at-least-32-characters',
      BCRYPT_ROUNDS: '4',
    },
  },
});
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/harness.test.ts`
Expected: `The SQLite database "test.db" … was reset`, then PASS (2 tests).

- [ ] **Step 6: Soundness check**

In `vitest.config.ts`, change `DATABASE_URL: 'file:./test.db'` to `'file:./dev.db'`.
Run the same command. Expected: FAIL `expected 'file:./dev.db' to be 'file:./test.db'`.
Restore and re-run. Expected: PASS.

- [ ] **Step 7: Run the whole suite**

Run: `pnpm test`
Expected: all domain tests and the harness tests PASS.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts tests/helpers/global-setup.ts tests/services/harness.test.ts
git commit -m "test: isolated SQLite harness for service integration tests"
```
