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
