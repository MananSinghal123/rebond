# Landing and Privacy Pages Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** A static, fast, single-column landing page (a condensed rebond.site) and a privacy page, plus root layout metadata.

**Architecture:** REQUIREMENTS.md FR-1 (hero and CTAs), FR-2 (sections), FR-3 (SSG, responsive), NFR-1 (Lighthouse 90+) and FR-29 / §6 `/privacy`. Owner: `app/page.tsx` and `app/privacy/page.tsx`. They sit outside `(app)`, read no cookies and stay static. Impeccable mode: **Persuade**, kept quiet: type and whitespace carry it, with no images and no client JS. Load impeccable `reference/craft-floor.md` before editing. **Copy is drafted from REQUIREMENTS.md §1. Check it against rebond.site before any public deploy** (00-overview prerequisites). It contains no numeric claims.

**Tech Stack:** Next.js 15 static rendering, Tailwind v4, Geist via `next/font`.

---

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx` (replace entirely)
- Create: `app/privacy/page.tsx`

### Task 1: Root layout

- [ ] **Step 1: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ReBond: Real yield from real contracts',
  description:
    'Fixed-return bonds backed by contracted revenue. Companies raise, curators vet, investors fund. Every deal recorded on Cardano.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
```

### Task 2: Landing page

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';

const PROBLEMS = [
  {
    title: 'Contracted revenue sits idle',
    body: 'Companies with signed, recurring contracts still wait on credit priced as if that revenue were uncertain.',
  },
  {
    title: 'Yield without a source',
    body: 'Investors are offered returns with little view of what actually pays them.',
  },
  {
    title: 'No one owns the vetting',
    body: 'When a deal goes wrong there is rarely a named party whose track record shows it.',
  },
];

const STEPS = [
  { name: 'Apply', body: 'A company with contracted revenue proposes a bond: amount, fixed rate, term and payout schedule.' },
  { name: 'Curate', body: 'An independent curator reviews the contracts, puts their name on the bond and sets their fee.' },
  { name: 'Fund', body: 'Investors compare listed bonds by yield, term and curator rating, and fund the ones they choose.' },
  { name: 'Settle', body: 'Distributions are paid on schedule and principal returns at maturity, each recorded on Cardano.' },
];

const AUDIENCES = [
  { name: 'Companies', body: 'Raise at a fixed rate and term against revenue you have already contracted.' },
  { name: 'Curators', body: 'Vet applications, earn a fee, and build a public ranking from how your bonds perform.' },
  { name: 'Investors', body: 'Fund fixed-return bonds and track every position and payout to maturity.' },
];

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="border-t border-line py-16">
      <h2 className="mb-8 text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <header className="flex items-center justify-between py-6">
        <span className="font-semibold tracking-tight">ReBond</span>
        <Link href="/login" className="text-sm text-muted hover:text-ink">Sign in</Link>
      </header>

      <section className="grid gap-6 py-20 md:py-28">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Real yield from real contracts.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Fixed-return bonds backed by contracted revenue. Curated by people with their name on the line, and recorded on Cardano.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/bonds">Open the app</ButtonLink>
          <ButtonLink href="#how-it-works" variant="secondary">See how it works</ButtonLink>
        </div>
      </section>

      <Section title="The problem">
        <div className="grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <div key={problem.title} className="rounded-lg border border-line bg-surface p-5">
              <h3 className="font-medium">{problem.title}</h3>
              <p className="mt-2 text-sm text-muted">{problem.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="how-it-works" title="How it works">
        <ol className="grid gap-6 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.name} className="grid content-start gap-2">
              <span className="font-mono text-xs text-muted">0{index + 1}</span>
              <h3 className="text-lg font-semibold">{step.name}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Who it's for">
        <dl className="grid gap-6 md:grid-cols-3">
          {AUDIENCES.map((role) => (
            <div key={role.name}>
              <dt className="font-medium">{role.name}</dt>
              <dd className="mt-1 text-sm text-muted">{role.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Markets">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-accent/40 bg-surface p-5">
            <p className="text-xs font-medium text-accent">Live first</p>
            <h3 className="mt-1 text-lg font-semibold">Healthcare</h3>
            <p className="mt-2 text-sm text-muted">Bonds backed by contracted health-plan premiums.</p>
          </div>
          <div className="rounded-lg border border-dashed border-line p-5">
            <p className="text-xs font-medium text-muted">Next</p>
            <h3 className="mt-1 text-lg font-semibold text-muted">More contract-backed markets</h3>
            <p className="mt-2 text-sm text-muted">Coming after Healthcare.</p>
          </div>
        </div>
      </Section>

      <footer className="flex flex-wrap gap-6 border-t border-line py-8 text-sm text-muted">
        <span>© ReBond</span>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <a href="https://rebond.site" className="hover:text-ink">Contact</a>
      </footer>
    </div>
  );
}
```

### Task 3: Privacy page

- [ ] **Step 1: Create `app/privacy/page.tsx`**

```tsx
import Link from 'next/link';

export const metadata = { title: 'Privacy · ReBond' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto grid max-w-prose gap-4 px-4 py-16 text-sm leading-relaxed">
      <Link href="/" className="text-muted hover:text-ink">← ReBond</Link>
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <p>
        This is a demo. It stores your email, a hashed password, your chosen role and any application details you enter. No real funds move.
      </p>
      <p>
        On-chain records are simulated. They contain only bond identifiers, amounts and hashes. No personal information is ever written to a chain record.
      </p>
      <p>Documents you upload are stored only so curators can review them, and are never published.</p>
    </article>
  );
}
```

### Task 4: Verify and commit

- [ ] **Step 1: Confirm both pages are static**

Run: `pnpm next build`
Expected: the route table shows `○ /` and `○ /privacy` (○ = static).

- [ ] **Step 2: Lighthouse (NFR-1)**

Run: `pnpm start`, then `npx lighthouse http://localhost:3000 --only-categories=performance,accessibility --quiet --chrome-flags="--headless" --output=json | node -e "const r=JSON.parse(require('fs').readFileSync(0));console.log(Object.values(r.categories).map(c=>c.id+': '+c.score*100).join('\n'))"`
Expected: `performance` ≥ 90 and `accessibility` ≥ 90.

- [ ] **Step 3: Impeccable visual pass (first batched round)**

Take screenshots of `/`, `/login` and `/onboarding` at 1280px and 360px in one round. Check: no horizontal scroll at 360px, the hero headline wraps cleanly, only one green element above the fold (the primary CTA), and focus rings are visible. Then run `.claude/skills/impeccable/scripts/impeccable detect --json app components` once and fix all findings in one batch.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx app/privacy/page.tsx
git commit -m "feat(site): static landing and privacy pages"
```
