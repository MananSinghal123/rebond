import { beforeEach, describe, expect, it } from 'vitest';
import { clearDatabase, db } from '@/lib/db';
import {
  attestInvestor,
  chooseRole,
  linkWallet,
  signIn,
  signInWithGoogleDemo,
  signInWithWallet,
  signUp,
} from '@/lib/services/accounts';
import { unwrap } from '@/lib/domain/types';

const credentials = { email: 'Ana@Clinic.test', password: 'correct horse battery' };
const WALLET = 'addr1qxtu4w2rq2mdguw4fkms2ge4m070nq8cmlyjfhghwlh8sjscnp7pvysxn4qgpg8ty3uzpjuc0l4gr0w74t7ag8uev2qseuyw6u';

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

  describe('when an email user links a Cardano wallet', () => {
    it('stores the verified address as their external wallet', async () => {
      const user = unwrap(await signUp(credentials));
      unwrap(await linkWallet(user.id, WALLET));
      const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored).toMatchObject({ walletAddress: WALLET, walletKind: 'EXTERNAL' });
    });
  });

  describe('when the wallet already belongs to another account', () => {
    it('refuses to link it twice', async () => {
      unwrap(await signInWithWallet(WALLET));
      const user = unwrap(await signUp(credentials));
      expect(await linkWallet(user.id, WALLET)).toEqual({
        ok: false,
        error: 'This wallet is already linked to another account.',
      });
    });
  });
});

describe('people can start with a Cardano wallet or Google instead of a password', () => {
  beforeEach(clearDatabase);

  describe('when a wallet signs in for the first time and again later', () => {
    it('creates one account and returns it on every later sign-in', async () => {
      const first = unwrap(await signInWithWallet(WALLET));
      const again = unwrap(await signInWithWallet(WALLET));
      expect(first).toEqual({ id: again.id, role: null });
      expect(await db.user.count()).toBe(1);
    });
  });

  describe('when someone continues with Google (demo)', () => {
    it('creates the account with a demo embedded wallet and finds it again by email', async () => {
      const created = unwrap(await signInWithGoogleDemo({ email: 'Lee@Example.test', name: 'Lee' }));
      const again = unwrap(await signInWithGoogleDemo({ email: 'lee@example.test', name: 'Lee' }));
      const stored = await db.user.findUniqueOrThrow({ where: { id: created.id } });
      expect(again.id).toBe(created.id);
      expect(stored).toMatchObject({ email: 'lee@example.test', walletKind: 'EMBEDDED_DEMO', passwordHash: null });
      expect(stored.walletAddress).toMatch(/^addr1q/);
    });
  });

  describe('when a passwordless account tries the email form', () => {
    it('rejects the password sign-in', async () => {
      unwrap(await signInWithGoogleDemo({ email: 'lee@example.test', name: 'Lee' }));
      expect(await signIn({ email: 'lee@example.test', password: 'anything-goes' })).toEqual({
        ok: false,
        error: 'Email or password is incorrect.',
      });
    });
  });
});
