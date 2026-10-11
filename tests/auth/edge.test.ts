import { describe, expect, it } from 'vitest';
import { routeAccess, signSession, verifySession } from '@/lib/auth/edge';

const investor = { userId: 'u1', role: 'INVESTOR' as const };

describe('role-protected routes redirect the wrong visitors', () => {
  describe('when a visitor without a session opens the portfolio', () => {
    it('redirects to login and remembers where they were going', () => {
      expect(routeAccess('/portfolio', null)).toEqual({ kind: 'redirect', to: '/login?next=%2Fportfolio' });
    });
  });

  describe('when a signed-in user has not picked a role', () => {
    it('redirects every role-protected route to onboarding', () => {
      expect(routeAccess('/company/apply', { userId: 'u1', role: null })).toEqual({ kind: 'redirect', to: '/onboarding' });
    });

    it('lets them open onboarding itself', () => {
      expect(routeAccess('/onboarding', { userId: 'u1', role: null })).toEqual({ kind: 'allow' });
    });
  });

  describe('when an investor opens the curator review queue', () => {
    it('redirects them to their own home, the portfolio', () => {
      expect(routeAccess('/curator/review/b1', investor)).toEqual({ kind: 'redirect', to: '/portfolio' });
    });
  });

  describe('when anyone opens a public curator profile under /curators', () => {
    it('allows it even though the path starts with /curator', () => {
      expect(routeAccess('/curators/c1', null)).toEqual({ kind: 'allow' });
    });
  });

  describe('when an investor opens the portfolio', () => {
    it('allows it', () => {
      expect(routeAccess('/portfolio', investor)).toEqual({ kind: 'allow' });
    });
  });
});

describe('session tokens are signed and tamper-evident', () => {
  describe('when a token is signed and read back', () => {
    it('returns the same user and role', async () => {
      expect(await verifySession(await signSession(investor))).toEqual(investor);
    });
  });

  describe('when the token payload was edited', () => {
    it('rejects the token', async () => {
      const [header, , signature] = (await signSession(investor)).split('.');
      const forged = Buffer.from(JSON.stringify({ sub: 'u1', role: 'CURATOR' })).toString('base64url');
      expect(await verifySession(`${header}.${forged}.${signature}`)).toBeNull();
    });
  });
});
