# App Shell and Onboarding Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** The shared app layout (demo banner, role navigation, wallet connect, sign out) and the first-login role picker.

**Architecture:** REQUIREMENTS.md NFR-5 (a banner on every app page), FR-5 (Connect wallet stores a fake `addr1…`) and FR-6 (pick a role on first login; investors tick the attestation). Owner: `app/(app)/layout.tsx`, which wraps every app route. Landing and privacy stay outside the group, so they remain static (FR-3). Sign out and connect wallet are inline server actions in the layout, so no extra file is needed. Onboarding re-issues the session cookie with the new role, so middleware (plan 10) sees it straight away.

**Tech Stack:** Next.js 15 server components and server actions.

---

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/onboarding/page.tsx`
- Create: `app/(app)/onboarding/actions.ts`

### Task 1: App layout

- [ ] **Step 1: Create `app/(app)/layout.tsx`**

```tsx
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button, ButtonLink, shortHash } from '@/components/ui';
import { endSession, getSession, requireSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import type { Role } from '@/lib/domain/types';
import { connectWallet } from '@/lib/services/accounts';

const NAV: Record<Role | 'VISITOR', { href: string; label: string }[]> = {
  VISITOR: [{ href: '/bonds', label: 'Bonds' }],
  INVESTOR: [
    { href: '/bonds', label: 'Bonds' },
    { href: '/portfolio', label: 'Portfolio' },
  ],
  COMPANY: [
    { href: '/company', label: 'My bonds' },
    { href: '/company/apply', label: 'Apply' },
  ],
  CURATOR: [
    { href: '/curator', label: 'Review queue' },
    { href: '/bonds', label: 'Bonds' },
  ],
};

async function signOut() {
  'use server';
  await endSession();
  redirect('/');
}

async function connect() {
  'use server';
  const session = await requireSession();
  await connectWallet(session.userId);
  revalidatePath('/', 'layout');
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const user = session
    ? await db.user.findUnique({ where: { id: session.userId }, select: { walletAddress: true } })
    : null;
  const links = NAV[session?.role ?? 'VISITOR'];

  return (
    <>
      <p className="bg-ink px-4 py-2 text-center text-xs text-paper">Demo: no real funds, simulated on-chain records.</p>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">ReBond</Link>
          <nav aria-label="Main" className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted transition-colors duration-150 hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {user?.walletAddress && (
              <span className="font-mono text-xs text-muted" title={user.walletAddress}>
                {shortHash(user.walletAddress)}
              </span>
            )}
            {user && !user.walletAddress && (
              <form action={connect}>
                <Button variant="secondary">Connect wallet</Button>
              </form>
            )}
            {user ? (
              <form action={signOut}>
                <Button variant="secondary">Sign out</Button>
              </form>
            ) : (
              <ButtonLink href="/login">Sign in</ButtonLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
```

### Task 2: Onboarding

- [ ] **Step 1: Create `app/(app)/onboarding/actions.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import { ROLE_HOME } from '@/lib/auth/edge';
import { requireSession, startSession } from '@/lib/auth/session';
import { chooseRole } from '@/lib/services/accounts';

export async function chooseRoleAction(formData: FormData) {
  const session = await requireSession();

  const result = await chooseRole(session.userId, {
    role: formData.get('role'),
    displayName: String(formData.get('displayName') ?? ''),
    verified: formData.get('verified') === 'on',
  });
  if (!result.ok) redirect(`/onboarding?error=${encodeURIComponent(result.error)}`);

  await startSession({ userId: session.userId, role: result.value.role });
  redirect(ROLE_HOME[result.value.role]);
}
```

- [ ] **Step 2: Create `app/(app)/onboarding/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { Button, Field, Notice, PageHeader, Panel, inputClass } from '@/components/ui';
import { ROLE_HOME } from '@/lib/auth/edge';
import { requireSession } from '@/lib/auth/session';
import { chooseRoleAction } from './actions';

const ROLE_OPTIONS = [
  { value: 'INVESTOR', title: 'Investor', body: 'Compare bonds by yield, term and curator, fund them and track payouts.' },
  { value: 'COMPANY', title: 'Company', body: 'Raise capital at a fixed rate, backed by your contracted revenue.' },
  { value: 'CURATOR', title: 'Curator', body: 'Vet applications, put your name on bonds and earn a fee.' },
] as const;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireSession();
  if (session.role) redirect(ROLE_HOME[session.role]);
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="How will you use ReBond?" description="Each account has one role. You can't change it later in this demo." />
      <Panel>
        <form action={chooseRoleAction} className="grid gap-6">
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">Role</legend>
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-[:checked]:border-accent"
              >
                <input type="radio" name="role" value={option.value} required className="mt-1 accent-[var(--color-accent)]" />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">{option.title}</span>
                  <span className="text-sm text-muted">{option.body}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Field label="Company or display name" hint="Required for companies and curators. Shown publicly on bonds.">
            <input name="displayName" maxLength={120} className={inputClass} />
          </Field>
          <label className="flex gap-3 text-sm">
            <input type="checkbox" name="verified" className="mt-0.5 accent-[var(--color-accent)]" />
            <span>
              Investors: I confirm I am a verified investor. <span className="text-muted">(Self-attested for this demo. Required to fund.)</span>
            </span>
          </label>
          {error && <Notice>{error}</Notice>}
          <Button className="justify-self-start">Continue</Button>
        </form>
      </Panel>
    </div>
  );
}
```

### Task 3: Verify and commit

`chooseRole` and `connectWallet` are integration-tested in plan 09. The full flow runs in plan 28.

- [ ] **Step 1: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 2: Manual check at 1280px and 360px**

Run: `pnpm dev`. Create an account at `/login`.
- Expected: you land on `/onboarding`. The black demo banner is on top. The nav shows "Bonds".
- Choose **Curator** with an empty name. Expected: red notice `Enter a name of at least 2 characters.`
- Choose **Curator** with the name `Atlas Credit Review`. Expected: redirect to `/curator` (it 404s until plan 19). The nav now shows "Review queue".
- Choose **Connect wallet**. Expected: the button is replaced by `addr1q…` in mono text.
- At 360px width: the header wraps without horizontal scroll.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/layout.tsx" "app/(app)/onboarding/page.tsx" "app/(app)/onboarding/actions.ts"
git commit -m "feat(app): app shell with demo banner, wallet connect, role onboarding"
```
