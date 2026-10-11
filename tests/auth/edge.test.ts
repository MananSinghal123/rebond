import { describe, expect, it } from 'vitest';
import { entryPath, routeAccess, signSession, verifySession } from '@/lib/auth/edge';

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

  describe('when an investor opens a curator profile under /curators', () => {
    it('allows it even though the path starts with /curator', () => {
      expect(routeAccess('/curators/c1', investor)).toEqual({ kind: 'allow' });
    });
  });

  describe('when an investor opens the portfolio', () => {
    it('allows it', () => {
      expect(routeAccess('/portfolio', investor)).toEqual({ kind: 'allow' });
    });
  });
});

describe('the marketplace and curator pages are for signed-in members only', () => {
  describe('when a visitor without a session opens the marketplace or a curator profile', () => {
    it('redirects to login and remembers the page', () => {
      expect(routeAccess('/bonds', null)).toEqual({ kind: 'redirect', to: '/login?next=%2Fbonds' });
      expect(routeAccess('/bonds/b1', null)).toEqual({ kind: 'redirect', to: '/login?next=%2Fbonds%2Fb1' });
      expect(routeAccess('/curators/c1', null)).toEqual({ kind: 'redirect', to: '/login?next=%2Fcurators%2Fc1' });
    });
  });

  describe('when a signed-in user has not picked a role yet', () => {
    it('sends them to onboarding before the marketplace', () => {
      expect(routeAccess('/bonds', { userId: 'u1', role: null })).toEqual({ kind: 'redirect', to: '/onboarding' });
    });
  });

  describe('when any member with a role opens the marketplace', () => {
    it('allows curators, companies and investors alike', () => {
      for (const role of ['CURATOR', 'COMPANY', 'INVESTOR'] as const) {
        expect(routeAccess('/bonds', { userId: 'u1', role })).toEqual({ kind: 'allow' });
      }
    });
  });
});

describe('"Open the app" takes each person to the right first screen', () => {
  it('sends visitors to login', () => {
    expect(entryPath(null)).toBe('/login');
  });

  it('sends role-less members to onboarding', () => {
    expect(entryPath({ userId: 'u1', role: null })).toBe('/onboarding');
  });

  it("sends members to their role's home", () => {
    expect(entryPath({ userId: 'u1', role: 'COMPANY' })).toBe('/company');
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
