# Accounts Service Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Email and password sign-up and sign-in, one-time role selection (which creates the Company or Curator profile and records investor attestation), a later `attestInvestor` for investors who skipped the checkbox, and mock wallet connect.

**Architecture:** REQUIREMENTS.md FR-4 (email auth), FR-5 (fake wallet), FR-6 (pick a role once; investors attest "verified") and §3 (one role per account). Owner: `lib/services/accounts.ts`. This is the first service, so it sets the pattern: validate with Zod, then return `Result` for errors the user can fix and throw via `assert` for broken invariants. It uses `credentials` and not Auth.js (see 00-overview deviations). `tests/helpers/actors.ts` builds test users through these same public functions, and later plans extend it.

**Tech Stack:** Prisma 6, Zod, bcryptjs, Vitest.

---

**Files:**
- Create: `lib/services/accounts.ts`
- Test: `tests/services/accounts.test.ts`
- Create: `tests/helpers/actors.ts`

### Task 1: Sign up, sign in, choose role, connect wallet

- [ ] **Step 1: Write the failing test `tests/services/accounts.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import { attestInvestor, chooseRole, connectWallet, signIn, signUp } from '@/lib/services/accounts';
import { unwrap } from '@/lib/domain/types';

const credentials = { email: 'Ana@Clinic.test', password: 'correct horse battery' };

describe('people sign up with email and pick one role', () => {
  beforeEach(clearDatabase);

  describe('when a new email signs up', () => {
    it('creates an account with no role yet and lets the same credentials sign in', async () => {
      const created = unwrap(await signUp(credentials));
      const signedIn = unwrap(await signIn({ email: 'ana@clinic.test', password: credentials.password }));
      expect(created.role).toBeNull();
      expect(signedIn).toEqual({ id: created.id, role: null });
    });
  });

  describe('when the email is already registered', () => {
    it('rejects the second sign-up', async () => {
      await signUp(credentials);
      expect(await signUp(credentials)).toEqual({ ok: false, error: 'An account with this email already exists.' });
    });
  });

  describe('when the password is wrong', () => {
    it('rejects sign-in without revealing which field was wrong', async () => {
      await signUp(credentials);
      expect(await signIn({ ...credentials, password: 'wrong password' })).toEqual({
        ok: false,
        error: 'Email or password is incorrect.',
      });
    });
  });

  describe('when the password is shorter than 8 characters', () => {
    it('rejects the sign-up', async () => {
      expect(await signUp({ ...credentials, password: 'short' })).toEqual({
        ok: false,
        error: 'Password must be at least 8 characters.',
      });
    });
  });

  describe('when a new user picks COMPANY', () => {
    it('creates the company profile under the given name', async () => {
      const user = unwrap(await signUp(credentials));
      unwrap(await chooseRole(user.id, { role: 'COMPANY', displayName: 'Northwind Health', verified: false }));
      const company = await db.company.findUnique({ where: { ownerId: user.id } });
      expect(company?.name).toBe('Northwind Health');
    });
  });

  describe('when a new user picks INVESTOR and ticks the attestation', () => {
    it('marks the investor as verified', async () => {
      const user = unwrap(await signUp(credentials));
      unwrap(await chooseRole(user.id, { role: 'INVESTOR', displayName: '', verified: true }));
      const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored).toMatchObject({ role: 'INVESTOR', verified: true });
    });
  });

  describe('when a user already has a role', () => {
    it('refuses to change it', async () => {
      const user = unwrap(await signUp(credentials));
      unwrap(await chooseRole(user.id, { role: 'INVESTOR', displayName: '', verified: true }));
      expect(await chooseRole(user.id, { role: 'CURATOR', displayName: 'Atlas', verified: false })).toEqual({
        ok: false,
        error: 'Your role is already set.',
      });
    });
  });

  describe('when a curator picks a name shorter than 2 characters', () => {
    it('rejects the role choice', async () => {
      const user = unwrap(await signUp(credentials));
      expect((await chooseRole(user.id, { role: 'CURATOR', displayName: 'A', verified: false })).ok).toBe(false);
    });
  });

  describe('when an investor skipped the attestation during onboarding', () => {
    it('can attest later and becomes verified', async () => {
      const user = unwrap(await signUp(credentials));
      unwrap(await chooseRole(user.id, { role: 'INVESTOR', displayName: '', verified: false }));
      await attestInvestor({ userId: user.id, role: 'INVESTOR' });
      expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).verified).toBe(true);
    });
  });

  describe('when the user connects a wallet', () => {
    it('stores a fake addr1 address on the profile', async () => {
      const user = unwrap(await signUp(credentials));
      const address = await connectWallet(user.id);
      const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(address).toMatch(/^addr1q/);
      expect(stored.walletAddress).toBe(address);
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/services/accounts.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/services/accounts"`

- [ ] **Step 3: Create `lib/services/accounts.ts`**

```ts
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { fakeWalletAddress } from '@/lib/domain/chain';
import { assert, fail, ok, parseEnum, ROLES, type Actor, type Result, type Role } from '@/lib/domain/types';

export type SessionUser = { id: string; role: Role | null };

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

const Credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const RoleChoice = z.object({
  role: z.enum(ROLES, { message: 'Choose a role.' }),
  displayName: z.string().trim().max(120),
  verified: z.boolean(),
});

export async function signUp(input: unknown): Promise<Result<SessionUser>> {
  const parsed = Credentials.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return fail('An account with this email already exists.');

  const user = await db.user.create({ data: { email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } });
  return ok({ id: user.id, role: null });
}

export async function signIn(input: unknown): Promise<Result<SessionUser>> {
  const parsed = Credentials.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return fail('Email or password is incorrect.');

  return ok({ id: user.id, role: user.role === null ? null : parseEnum(ROLES, user.role) });
}

export async function chooseRole(userId: string, input: unknown): Promise<Result<{ id: string; role: Role }>> {
  const parsed = RoleChoice.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { role, displayName, verified } = parsed.data;
  if (role !== 'INVESTOR' && displayName.length < 2) return fail('Enter a name of at least 2 characters.');

  const chosen = await db.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: userId, role: null },
      data: { role, verified: role === 'INVESTOR' && verified },
    });
    if (claimed.count === 0) return false;
    if (role === 'COMPANY') await tx.company.create({ data: { ownerId: userId, name: displayName } });
    if (role === 'CURATOR') await tx.curator.create({ data: { userId, displayName } });
    return true;
  });
  if (!chosen) return fail('Your role is already set.');
  return ok({ id: userId, role });
}

export async function attestInvestor(actor: Actor): Promise<void> {
  assert(actor.role === 'INVESTOR', 'only investors attest verification');
  await db.user.update({ where: { id: actor.userId }, data: { verified: true } });
}

export async function connectWallet(userId: string): Promise<string> {
  const walletAddress = fakeWalletAddress(userId);
  await db.user.update({ where: { id: userId }, data: { walletAddress } });
  return walletAddress;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/services/accounts.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Soundness check**

In `chooseRole`, change `where: { id: userId, role: null }` to `where: { id: userId }`.
Run the same command. Expected: FAIL in `refuses to change it`, because the result is `{ ok: true, … }`. The guarded `updateMany` is also what stops two concurrent submits from attaching both a Company and a Curator profile.
Restore and re-run. Expected: PASS.

### Task 2: Test actor helper

- [ ] **Step 1: Create `tests/helpers/actors.ts`**

Later plans append bond builders to this file. Every helper goes through public services so test state is always reachable in the product.

```ts
import { chooseRole, signUp } from '@/lib/services/accounts';
import { unwrap, type Actor, type Role } from '@/lib/domain/types';

let sequence = 0;

export async function makeActor(role: Role, options: { name?: string; verified?: boolean } = {}): Promise<Actor> {
  sequence += 1;
  const user = unwrap(await signUp({ email: `${role.toLowerCase()}${sequence}@example.test`, password: 'correct horse battery' }));
  unwrap(
    await chooseRole(user.id, {
      role,
      displayName: options.name ?? `${role} ${sequence}`,
      verified: options.verified ?? true,
    }),
  );
  return { userId: user.id, role };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/services/accounts.ts tests/services/accounts.test.ts tests/helpers/actors.ts
git commit -m "feat(accounts): email sign-up/in, one-time role choice, mock wallet"
```
