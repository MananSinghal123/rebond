# Session and Login Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** Server-side session helpers (`getSession`, `startSession`, `endSession`, `requireSession`, `requireActor`) and a single `/login` page that both signs in and creates accounts.

**Architecture:** REQUIREMENTS.md FR-4 (email sign-up and sign-in), NFR-4 (role checks in every server action) and the §6 route `/login`. Owner: `lib/auth/session.ts`, the only module that touches cookies. `getSession` is wrapped in React `cache()`, so the layout and the page share one token verification per request. Every server action starts with `requireActor(role)`. The login form posts to a server action. On failure it redirects back with `?error=` (the app-wide error convention from 00-overview), so the page needs no client JS. Route group `(app)` keeps the URL `/login`; its layout arrives in plan 13.

**Tech Stack:** Next.js 15 server actions, `next/headers` cookies, jose (via `lib/auth/edge.ts`).

---

**Files:**
- Create: `lib/auth/session.ts`
- Create: `app/(app)/login/page.tsx`
- Create: `app/(app)/login/actions.ts`

### Task 1: Session helpers

- [ ] **Step 1: Create `lib/auth/session.ts`**

```ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SESSION_COOKIE, signSession, verifySession, type Session } from './edge';
import type { Actor, Role } from '@/lib/domain/types';

const WEEK_SECONDS = 60 * 60 * 24 * 7;

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
});

export async function startSession(session: Session) {
  (await cookies()).set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: WEEK_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireActor(role: Role): Promise<Actor> {
  const session = await requireSession();
  if (session.role !== role) redirect('/');
  return { userId: session.userId, role };
}
```

### Task 2: Login action

- [ ] **Step 1: Create `app/(app)/login/actions.ts`**

The two submit buttons share one form. Pressing Enter triggers the first button, which is "Sign in".

```ts
'use server';

import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@/lib/auth/edge';
import { startSession } from '@/lib/auth/session';
import { signIn, signUp } from '@/lib/services/accounts';

const isSafeNext = (next: string) => next.startsWith('/') && !next.startsWith('//');

export async function authenticate(formData: FormData) {
  const credentials = { email: formData.get('email'), password: formData.get('password') };
  const result = formData.get('intent') === 'signup' ? await signUp(credentials) : await signIn(credentials);
  if (!result.ok) redirect(`/login?error=${encodeURIComponent(result.error)}`);

  const { id, role } = result.value;
  await startSession({ userId: id, role });
  if (role === null) redirect('/onboarding');

  const next = String(formData.get('next') ?? '');
  redirect(isSafeNext(next) ? next : ROLE_HOME[role]);
}
```

### Task 3: Login page

- [ ] **Step 1: Create `app/(app)/login/page.tsx`**

```tsx
import { Button, Field, Notice, PageHeader, Panel, inputClass } from '@/components/ui';
import { authenticate } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = '' } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign in to ReBond" description="Use your email. New here? Enter an email and password and choose Create account." />
      <Panel>
        <form action={authenticate} className="grid gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <input name="password" type="password" autoComplete="current-password" minLength={8} required className={inputClass} />
          </Field>
          {error && <Notice>{error}</Notice>}
          <div className="flex flex-wrap gap-3">
            <Button name="intent" value="signin">Sign in</Button>
            <Button name="intent" value="signup" variant="secondary">Create account</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
```

### Task 4: Verify and commit

The underlying `signUp` and `signIn` are integration-tested in plan 09. This page and action are covered end to end by plan 28 (`signs up as a company…`).

- [ ] **Step 1: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 2: Manual check**

Run: `pnpm dev`. Open `http://localhost:3000/login`.
- Enter `a@b.test` / `password1` and choose **Create account**. Expected: redirect to `/onboarding` (it 404s until plan 13). DevTools → Application → Cookies shows `rebond_session` as HttpOnly.
- Go back and enter the same email with the wrong password, then **Sign in**. Expected: `Email or password is incorrect.` in a red notice.
- Press Tab through the form. Expected: every control shows the green focus ring.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/session.ts "app/(app)/login/page.tsx" "app/(app)/login/actions.ts"
git commit -m "feat(auth): session cookie helpers and login page"
```
