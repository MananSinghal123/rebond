# Session Token and Route Guard Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** An edge-safe signed session token (HS256 JWT in an httpOnly cookie) and data-driven role rules enforced in `middleware.ts`.

**Architecture:** REQUIREMENTS.md FR-7 (role protection in middleware) and the §6 route table. Owner: `lib/auth/edge.ts`. It is imported by middleware, which runs on the edge runtime, so it must not import Prisma or `node:*`. `routeAccess` is a pure decision function, `{ kind: 'allow' } | { kind: 'redirect', to }`, so it can be unit-tested without Next. Server actions re-check the role through `requireActor` (plan 12, NFR-4). Middleware is only the first gate.

**Tech Stack:** jose, Next.js 15 middleware, Vitest.

---

**Files:**
- Create: `lib/auth/edge.ts`
- Create: `middleware.ts`
- Test: `tests/auth/edge.test.ts`

### Task 1: Token and route rules

- [ ] **Step 1: Write the failing test `tests/auth/edge.test.ts`**

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/auth/edge.test.ts`
Expected: FAIL with `Failed to resolve import "@/lib/auth/edge"`

- [ ] **Step 3: Create `lib/auth/edge.ts`**

```ts
import { jwtVerify, SignJWT } from 'jose';
import { assert, parseEnum, ROLES, type Role } from '@/lib/domain/types';

export const SESSION_COOKIE = 'rebond_session';

export type Session = { userId: string; role: Role | null };
export type Access = { kind: 'allow' } | { kind: 'redirect'; to: string };

export const ROLE_HOME: Record<Role, string> = {
  INVESTOR: '/portfolio',
  COMPANY: '/company',
  CURATOR: '/curator',
};

const PROTECTED: readonly { prefix: string; role: Role | 'ANY' }[] = [
  { prefix: '/portfolio', role: 'INVESTOR' },
  { prefix: '/company', role: 'COMPANY' },
  { prefix: '/curator', role: 'CURATOR' },
  { prefix: '/onboarding', role: 'ANY' },
];

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function routeAccess(pathname: string, session: Session | null): Access {
  const rule = PROTECTED.find((r) => isUnder(pathname, r.prefix));
  if (!rule) return { kind: 'allow' };
  if (!session) return { kind: 'redirect', to: `/login?next=${encodeURIComponent(pathname)}` };
  if (rule.role === 'ANY') return { kind: 'allow' };
  if (session.role === null) return { kind: 'redirect', to: '/onboarding' };
  if (session.role !== rule.role) return { kind: 'redirect', to: ROLE_HOME[session.role] };
  return { kind: 'allow' };
}

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  assert(secret && secret.length >= 32, 'SESSION_SECRET must be at least 32 characters');
  return new TextEncoder().encode(secret);
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<Session | null> {
  const verified = await jwtVerify(token, secretKey()).catch(() => null);
  if (!verified?.payload.sub) return null;
  const { sub, role } = verified.payload;
  return { userId: sub, role: typeof role === 'string' ? parseEnum(ROLES, role) : null };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/auth/edge.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Soundness check**

In `isUnder`, change it to `pathname.startsWith(prefix)`.
Run the same command. Expected: FAIL in `allows it even though the path starts with /curator`. The public profile gets redirected to login.
Restore and re-run. Expected: PASS.

### Task 2: Middleware

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { routeAccess, SESSION_COOKIE, verifySession } from '@/lib/auth/edge';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const access = routeAccess(request.nextUrl.pathname, session);
  if (access.kind === 'allow') return NextResponse.next();
  return NextResponse.redirect(new URL(access.to, request.url));
}

export const config = {
  matcher: ['/portfolio/:path*', '/company/:path*', '/curator/:path*', '/onboarding'],
};
```

- [ ] **Step 2: Verify in the running app**

Run: `pnpm dev`, then in another shell `curl -sI http://localhost:3000/portfolio | grep -i location`
Expected: `location: http://localhost:3000/login?next=%2Fportfolio`. The page itself returns 404 until later plans; the redirect is what we check.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/edge.ts middleware.ts tests/auth/edge.test.ts
git commit -m "feat(auth): signed session token and role route guard"
```
