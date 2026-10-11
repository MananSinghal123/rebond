# Bond Detail and Fund Flow Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** `/bonds/[id]`: terms, company and curator, funding bar, distribution schedule and on-chain record, plus the investor fund flow (amount → confirm dialog with expected return → position and tx hash).

**Architecture:** REQUIREMENTS.md FR-18 (detail contents), FR-19 (fund flow: min $100, ≤ remaining, confirm modal with principal × rate × term/12, Position plus mock tx), FR-28 (explorer-styled link) and §6 (public page; funding requires an investor). Owner: `app/(app)/bonds/[id]/`. `components/fund-form.tsx` is the app's only modal. It is a native `<dialog>` opened with `showModal()`, which gives focus trapping and Esc-to-close (NFR-2). It shows the expected return from the same pure `expectedReturnCents` the server uses. The server action re-checks everything through `fundBond` (plan 20). Load impeccable `reference/craft-floor.md` before editing.

**Tech Stack:** React 19 client component, Next.js 15 server actions, native `<dialog>`.

---

**Files:**
- Create: `components/fund-form.tsx`
- Create: `app/(app)/bonds/[id]/actions.ts`
- Create: `app/(app)/bonds/[id]/page.tsx`

### Task 1: Fund action

- [ ] **Step 1: Create `app/(app)/bonds/[id]/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { usdToCents } from '@/lib/domain/money';
import { attestInvestor } from '@/lib/services/accounts';
import { fundBond } from '@/lib/services/funding';

export async function fundAction(formData: FormData) {
  const actor = await requireActor('INVESTOR');
  const bondId = String(formData.get('bondId'));
  const result = await fundBond(actor, bondId, usdToCents(Number(formData.get('amountUsd'))));
  if (!result.ok) redirect(`/bonds/${bondId}?error=${encodeURIComponent(result.error)}`);

  revalidatePath('/bonds');
  revalidatePath('/portfolio');
  redirect(`/bonds/${bondId}?funded=${result.value.txHash}`);
}

export async function attestAction(formData: FormData) {
  const actor = await requireActor('INVESTOR');
  await attestInvestor(actor);
  redirect(`/bonds/${String(formData.get('bondId'))}`);
}
```

### Task 2: Fund form with confirm dialog

- [ ] **Step 1: Create `components/fund-form.tsx`**

```tsx
'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button, Field, inputClass } from '@/components/ui';
import {
  centsToUsd,
  checkFundAmount,
  expectedReturnCents,
  formatRate,
  formatUsd,
  MIN_TICKET_CENTS,
  usdToCents,
} from '@/lib/domain/money';

type Props = {
  action: (formData: FormData) => Promise<void>;
  bondId: string;
  rateBps: number;
  termMonths: number;
  remainingCents: number;
};

export function FundForm({ action, bondId, rateBps, termMonths, remainingCents }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [amountUsd, setAmountUsd] = useState('');
  const principal = usdToCents(Number(amountUsd));
  const problem = checkFundAmount(principal, remainingCents);
  const interest = problem ? 0 : expectedReturnCents(principal, rateBps, termMonths);

  function confirmFirst(event: FormEvent<HTMLFormElement>) {
    if (dialog.current?.open) return;
    event.preventDefault();
    if (problem === null) dialog.current?.showModal();
  }

  return (
    <form action={action} onSubmit={confirmFirst} className="grid gap-3">
      <input type="hidden" name="bondId" value={bondId} />
      <Field label="Amount (USD)" hint={`Minimum ${formatUsd(MIN_TICKET_CENTS)} · ${formatUsd(remainingCents)} left to raise`}>
        <input
          name="amountUsd"
          type="number"
          inputMode="decimal"
          min={centsToUsd(MIN_TICKET_CENTS)}
          max={centsToUsd(remainingCents)}
          step="0.01"
          required
          value={amountUsd}
          onChange={(event) => setAmountUsd(event.target.value)}
          className={inputClass}
        />
      </Field>
      {amountUsd !== '' && problem && <p className="text-xs text-bad">{problem}</p>}
      <Button type="button" disabled={problem !== null} onClick={() => dialog.current?.showModal()}>
        Review investment
      </Button>

      <dialog
        ref={dialog}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-lg border border-line bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">Confirm investment</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">Principal</dt>
          <dd className="text-right">{formatUsd(principal || 0)}</dd>
          <dt className="text-muted">Fixed rate · term</dt>
          <dd className="text-right">{formatRate(rateBps)} · {termMonths} months</dd>
          <dt className="text-muted">Expected return</dt>
          <dd className="text-right font-medium">{formatUsd(interest)}</dd>
          <dt className="text-muted">Total at maturity</dt>
          <dd className="text-right font-medium">{formatUsd((principal || 0) + interest)}</dd>
        </dl>
        <p className="mt-3 text-xs text-muted">Expected return = principal × rate × term ÷ 12. Demo only: no real funds move.</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit">Confirm and fund</Button>
        </div>
      </dialog>
    </form>
  );
}
```

### Task 3: Detail page

- [ ] **Step 1: Create `app/(app)/bonds/[id]/page.tsx`**

The funding panel shows exactly one of four states, chosen by `fundingGate`: no session, wrong role, unverified investor, or the fund form.

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { BondTerms, ChainRecord, FundingProgress, ScheduleTable, toChainRows, toScheduleRows } from '@/components/bond-panels';
import { FundForm } from '@/components/fund-form';
import { Button, ButtonLink, Notice, PageHeader, Panel, shortHash, StatusBadge } from '@/components/ui';
import type { Session } from '@/lib/auth/edge';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PUBLIC_STATUSES } from '@/lib/domain/lifecycle';
import { BOND_STATUSES, parseEnum, PAYOUT_FREQUENCIES } from '@/lib/domain/types';
import { getCuratorRanks } from '@/lib/services/curators';
import { attestAction, fundAction } from './actions';

type FundingGate = 'sign-in' | 'not-investor' | 'unverified' | 'can-fund';

async function fundingGate(session: Session | null): Promise<FundingGate> {
  if (!session) return 'sign-in';
  if (session.role !== 'INVESTOR') return 'not-investor';
  const investor = await db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { verified: true } });
  return investor.verified ? 'can-fund' : 'unverified';
}

export default async function BondPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; funded?: string }>;
}) {
  const [{ id }, { error, funded }, session] = await Promise.all([params, searchParams, getSession()]);
  const bond = await db.bond.findUnique({
    where: { id },
    include: {
      company: true,
      curator: true,
      distributions: { orderBy: { seq: 'asc' } },
      chainEvents: { orderBy: { id: 'asc' } },
    },
  });
  const status = bond ? parseEnum(BOND_STATUSES, bond.status) : null;
  if (!bond?.curator || !status || !PUBLIC_STATUSES.includes(status)) notFound();

  const curator = bond.curator;
  const [gate, ranks] = await Promise.all([fundingGate(session), getCuratorRanks([curator.id])]);
  const score = ranks.get(curator.id)?.score ?? null;
  const remainingCents = bond.amountCents - bond.fundedCents;

  const fundingPanel: Record<FundingGate, ReactNode> = {
    'sign-in': <ButtonLink href={`/login?next=/bonds/${bond.id}`}>Sign in to invest</ButtonLink>,
    'not-investor': <p className="text-sm text-muted">Only investor accounts can fund bonds.</p>,
    unverified: (
      <form action={attestAction} className="grid gap-3 text-sm">
        <input type="hidden" name="bondId" value={bond.id} />
        <label className="flex gap-3">
          <input type="checkbox" name="verified" required className="mt-0.5 accent-[var(--color-accent)]" />
          <span>I confirm I am a verified investor. <span className="text-muted">(Self-attested for this demo.)</span></span>
        </label>
        <Button variant="secondary" className="justify-self-start">Confirm and continue</Button>
      </form>
    ),
    'can-fund': (
      <FundForm
        action={fundAction}
        bondId={bond.id}
        rateBps={bond.rateBps}
        termMonths={bond.termMonths}
        remainingCents={remainingCents}
      />
    ),
  };

  return (
    <div className="grid gap-6">
      <PageHeader title={bond.company.name} description={bond.company.description} action={<StatusBadge status={status} />} />
      {error && <Notice>{error}</Notice>}
      {funded && <Notice tone="success">Investment recorded · tx {shortHash(funded)}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-6">
          <Panel title="Terms">
            <BondTerms {...bond} payoutFrequency={parseEnum(PAYOUT_FREQUENCIES, bond.payoutFrequency)} />
          </Panel>
          <Panel title="Backing contracts">
            <p className="whitespace-pre-line text-sm">{bond.contractSummary}</p>
          </Panel>
          <Panel title="Curator">
            <p className="text-sm">
              <Link href={`/curators/${curator.id}`} className="font-medium underline underline-offset-2">{curator.displayName}</Link>
              <span className="text-muted"> · {score === null ? 'Unrated' : `Rank ${score}`}</span>
            </p>
            {bond.reviewNote && <p className="mt-2 text-sm text-muted">“{bond.reviewNote}”</p>}
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Funding">
            <FundingProgress fundedCents={bond.fundedCents} amountCents={bond.amountCents} />
            {status === 'LISTED' && <div className="mt-5 border-t border-line pt-5">{fundingPanel[gate]}</div>}
          </Panel>
        </div>
      </div>

      <Panel title="Distribution schedule">
        <ScheduleTable rows={toScheduleRows(bond.distributions)} />
      </Panel>
      <Panel title="On-chain record">
        <ChainRecord events={toChainRows(bond.chainEvents)} />
      </Panel>
    </div>
  );
}
```

### Task 4: Verify and commit

`fundBond` is integration-tested in plan 20. Plan 28 drives this page, the dialog and the action end to end.

- [ ] **Step 1: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 2: Manual check (keyboard only)**

Run: `pnpm dev`. Open the listed bond from plan 19 as a verified investor.
- Type `50`. Expected: `Minimum investment is $100.` and **Review investment** is disabled.
- Type `150000` and press Enter inside the amount field. Expected: the confirm dialog opens and the investment is **not** submitted. Esc closes it.
- Tab to **Review investment**, press Enter. Expected: the dialog opens with focus inside it. It shows Expected return `$16,500` and Total `$166,500`. Esc closes it.
- Reopen it and choose **Confirm and fund**. Expected: a green `Investment recorded · tx …` notice, Funding shows 60%, and the on-chain record shows "Position opened".
- As an investor who skipped the attestation: the panel shows the checkbox and **Confirm and continue**; after confirming, the fund form appears.
- Signed out, the panel shows **Sign in to invest**. As a curator: `Only investor accounts can fund bonds.`
- A `SUBMITTED` bond id returns 404.

- [ ] **Step 3: Commit**

```bash
git add components/fund-form.tsx "app/(app)/bonds/[id]/actions.ts" "app/(app)/bonds/[id]/page.tsx"
git commit -m "feat(investor): bond detail page with confirm-to-fund dialog"
```
