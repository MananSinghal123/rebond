# Design Tokens and UI Kit Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** The "Quiet ledger" tokens and the small set of primitives every screen uses, so later UI plans only compose them.

**Architecture:** 00-overview "Design brief" (confirmed 2026-10-10), NFR-1 (360px responsive) and NFR-2 (keyboard access, WCAG AA contrast). Owner: `app/globals.css` (Tailwind v4 `@theme` tokens) and `components/ui.tsx`. `ui.tsx` has no `'use client'` and no server-only imports, so both server and client components can use it. This replaces shadcn/ui on purpose (see the deviations table). Before editing, load impeccable `reference/craft-floor.md`.

**Tech Stack:** Tailwind CSS v4, React 19, next/link.

---

**Files:**
- Modify: `app/globals.css` (replace entirely)
- Create: `components/ui.tsx`

### Task 1: Tokens

- [ ] **Step 1: Replace `app/globals.css`**

`muted` (L 0.50) on `paper` (L 0.985) is about 5.3:1, and `accent-ink` on `accent` is about 7:1. Both pass AA for body text.

```css
@import "tailwindcss";

@theme {
  --color-paper: oklch(0.985 0.004 95);
  --color-surface: oklch(1 0 0);
  --color-ink: oklch(0.22 0.01 95);
  --color-muted: oklch(0.5 0.01 95);
  --color-line: oklch(0.9 0.006 95);
  --color-accent: oklch(0.45 0.09 165);
  --color-accent-ink: oklch(0.985 0.01 165);
  --color-warn: oklch(0.52 0.12 70);
  --color-bad: oklch(0.52 0.17 28);

  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

@layer base {
  html {
    color-scheme: light;
  }

  body {
    background: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}
```

### Task 2: Primitives

- [ ] **Step 1: Create `components/ui.tsx`**

```tsx
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import type { BondStatus, PayoutFrequency } from '@/lib/domain/types';

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:bg-accent/90',
  secondary: 'border border-line bg-surface text-ink hover:bg-paper',
  danger: 'border border-bad/40 bg-surface text-bad hover:bg-bad/5',
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;

const BUTTON_BASE =
  'inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

export const inputClass =
  'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted';
export const textareaClass =
  'min-h-28 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="max-w-prose text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 ${className}`}>
      {title && <h2 className="mb-4 text-sm font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export function Notice({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  const styles = tone === 'error' ? 'border-bad/30 text-bad' : 'border-accent/30 text-accent';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border bg-surface px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export const FREQUENCY_LABEL: Record<PayoutFrequency, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  AT_MATURITY: 'At maturity',
};

const STATUS_TONE: Record<BondStatus, string> = {
  DRAFT: 'border-line text-muted',
  SUBMITTED: 'border-line text-ink',
  IN_REVIEW: 'border-warn/40 text-warn',
  CHANGES_REQUESTED: 'border-warn/40 text-warn',
  REJECTED: 'border-bad/40 text-bad',
  LISTED: 'border-accent/40 text-accent',
  FUNDED: 'border-accent/40 text-accent',
  ACTIVE: 'border-accent/40 text-accent',
  MATURED: 'border-line text-muted',
};

export function StatusBadge({ status }: { status: BondStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_TONE[status]}`}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}

export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-2 overflow-hidden rounded-full bg-line"
    >
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-line p-8">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}

export const tableWrapClass = 'overflow-x-auto rounded-lg border border-line bg-surface';
export const tableClass = 'w-full min-w-[36rem] text-left text-sm';
export const thClass = 'border-b border-line px-4 py-2 text-xs font-medium text-muted';
export const tdClass = 'border-b border-line px-4 py-3 last:border-b-0';

export const shortHash = (value: string) => `${value.slice(0, 10)}…${value.slice(-6)}`;

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
```

### Task 3: Verify and commit

There is no unit test: these are presentational primitives with no logic beyond lookup tables. Plan 28's e2e test drives them, and the impeccable screenshot pass after plan 14 checks them visually.

- [ ] **Step 1: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 2: Commit**

```bash
git add app/globals.css components/ui.tsx
git commit -m "feat(ui): quiet-ledger tokens and UI primitives"
```
