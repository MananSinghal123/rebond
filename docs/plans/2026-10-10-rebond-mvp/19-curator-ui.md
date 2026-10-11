# Curator UI Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** `/curator` (queue, my bonds, fees earned) and `/curator/review/[id]` (the full application and three decision forms).

**Architecture:** REQUIREMENTS.md FR-12 (queue and claim), FR-13 (review page and actions), FR-14 (fee input), §3 ("see fees and ranking") and §6. Owner: `app/(app)/curator/`. The forms are plain server-action forms that use the `?error=` redirect convention, so there is no client JS. Fees accrued = `feesAccruedCents(bonds)` from `lib/domain/money.ts` (plan 03). It is labelled "simulated" because the MVP does not deduct the fee from anyone (fee model is open question §11). The review page is visible only for applications waiting in the queue or claimed by this curator, so drafts and other curators' reviews stay private. Status groups come from `lib/domain/lifecycle.ts`, never local arrays. Ranking lives on the public profile (plan 22) and is linked from here. Load impeccable `reference/craft-floor.md` before editing.

**Tech Stack:** Next.js 15 server components and server actions, Prisma 6.

---

**Files:**
- Create: `app/(app)/curator/actions.ts`
- Create: `app/(app)/curator/page.tsx`
- Create: `app/(app)/curator/review/[id]/page.tsx`

### Task 1: Actions

- [ ] **Step 1: Create `app/(app)/curator/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { pctToBps } from '@/lib/domain/money';
import { claimApplication, decideApplication, type Decision } from '@/lib/services/review';

const withError = (path: string, error: string) => `${path}?error=${encodeURIComponent(error)}`;

export async function claimAction(formData: FormData) {
  const actor = await requireActor('CURATOR');
  const bondId = String(formData.get('bondId'));
  const result = await claimApplication(actor, bondId);
  if (!result.ok) redirect(withError('/curator', result.error));
  revalidatePath('/curator');
  redirect(`/curator/review/${bondId}`);
}

function readDecision(formData: FormData): Decision {
  const note = String(formData.get('note') ?? '');
  const kind = formData.get('kind');
  if (kind === 'APPROVE') return { kind, feeBps: pctToBps(Number(formData.get('feePct'))), note };
  if (kind === 'REQUEST_CHANGES' || kind === 'REJECT') return { kind, note };
  throw new Error(`Invariant: unknown decision kind "${String(kind)}"`);
}

export async function decideAction(formData: FormData) {
  const actor = await requireActor('CURATOR');
  const bondId = String(formData.get('bondId'));
  const result = await decideApplication(actor, bondId, readDecision(formData));
  if (!result.ok) redirect(withError(`/curator/review/${bondId}`, result.error));
  revalidatePath('/curator');
  revalidatePath('/bonds');
  redirect(result.value.status === 'LISTED' ? `/bonds/${bondId}` : '/curator');
}
```

### Task 2: Queue page

- [ ] **Step 1: Create `app/(app)/curator/page.tsx`**

```tsx
import Link from 'next/link';
import {
  Button,
  ButtonLink,
  EmptyState,
  formatDate,
  Notice,
  PageHeader,
  Panel,
  Stat,
  StatusBadge,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
} from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PUBLIC_STATUSES } from '@/lib/domain/lifecycle';
import { feesAccruedCents, formatRate, formatUsd } from '@/lib/domain/money';
import { BOND_STATUSES, parseEnum } from '@/lib/domain/types';
import { claimAction } from './actions';

export default async function CuratorHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const actor = await requireActor('CURATOR');
  const { error } = await searchParams;
  const [curator, queue, rows] = await Promise.all([
    db.curator.findUniqueOrThrow({ where: { userId: actor.userId } }),
    db.bond.findMany({ where: { status: 'SUBMITTED' }, orderBy: { updatedAt: 'asc' }, include: { company: true } }),
    db.bond.findMany({
      where: { curator: { userId: actor.userId } },
      orderBy: { updatedAt: 'desc' },
      include: { company: true },
    }),
  ]);
  const mine = rows.map((bond) => ({ ...bond, status: parseEnum(BOND_STATUSES, bond.status) }));
  const listedByMe = mine.filter((bond) => PUBLIC_STATUSES.includes(bond.status));
  const feesCents = feesAccruedCents(mine);

  return (
    <div className="grid gap-8">
      <PageHeader
        title={curator.displayName}
        description="Claim an application to review it. Approving lists it for investors with your name attached."
        action={<ButtonLink href={`/curators/${curator.id}`} variant="secondary">Public profile and rank</ButtonLink>}
      />
      {error && <Notice>{error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Waiting in queue" value={queue.length} />
        <Stat label="Bonds you listed" value={listedByMe.length} />
        <Stat label="Fees accrued (simulated)" value={formatUsd(feesCents)} />
      </div>

      <Panel title="Queue">
        {queue.length === 0 ? (
          <EmptyState title="The queue is empty">
            <p className="text-sm text-muted">New applications appear here as soon as a company submits them.</p>
          </EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <caption className="sr-only">Applications waiting for review</caption>
              <thead>
                <tr>
                  <th className={thClass}>Company</th>
                  <th className={thClass}>Raise</th>
                  <th className={thClass}>Rate</th>
                  <th className={thClass}>Term</th>
                  <th className={thClass}>Submitted</th>
                  <th className={thClass}><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {queue.map((bond) => (
                  <tr key={bond.id}>
                    <td className={tdClass}>{bond.company.name}</td>
                    <td className={tdClass}>{formatUsd(bond.amountCents)}</td>
                    <td className={tdClass}>{formatRate(bond.rateBps)}</td>
                    <td className={tdClass}>{bond.termMonths} mo</td>
                    <td className={tdClass}>{formatDate(bond.updatedAt)}</td>
                    <td className={`${tdClass} text-right`}>
                      <form action={claimAction}>
                        <input type="hidden" name="bondId" value={bond.id} />
                        <Button variant="secondary" aria-label={`Claim ${bond.company.name}`}>Claim</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Your bonds">
        {mine.length === 0 ? (
          <p className="text-sm text-muted">Bonds you claim or list appear here.</p>
        ) : (
          <ul className="grid gap-2">
            {mine.map((bond) => {
              const label = `${bond.company.name} · ${formatUsd(bond.amountCents)} · ${formatRate(bond.rateBps)}`;
              const href = PUBLIC_STATUSES.includes(bond.status) ? `/bonds/${bond.id}` : `/curator/review/${bond.id}`;
              return (
                <li key={bond.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <Link href={href} className="hover:underline">{label}</Link>
                  <StatusBadge status={bond.status} />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
```

### Task 3: Review page

- [ ] **Step 1: Create `app/(app)/curator/review/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { BondTerms } from '@/components/bond-panels';
import { Button, Field, inputClass, Notice, PageHeader, Panel, StatusBadge, textareaClass } from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { curatorCanDecide, curatorCanView } from '@/lib/domain/lifecycle';
import { bpsToPct, formatRate, formatUsd, MAX_FEE_BPS, MIN_FEE_BPS } from '@/lib/domain/money';
import { BOND_STATUSES, parseEnum, PAYOUT_FREQUENCIES } from '@/lib/domain/types';
import { decideAction } from '../../actions';

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const actor = await requireActor('CURATOR');
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const bond = await db.bond.findUnique({
    where: { id },
    include: {
      company: true,
      curator: { select: { userId: true } },
      documents: { select: { id: true, name: true, sizeBytes: true } },
    },
  });
  if (!bond) notFound();
  const status = parseEnum(BOND_STATUSES, bond.status);
  const isMine = bond.curator?.userId === actor.userId;
  if (!curatorCanView(status, isMine)) notFound();
  const canDecide = curatorCanDecide(status, isMine);

  return (
    <div className="grid gap-6">
      <PageHeader title={bond.company.name} description={bond.company.description} action={<StatusBadge status={status} />} />
      {error && <Notice>{error}</Notice>}

      <Panel title="Proposed terms">
        <BondTerms {...bond} payoutFrequency={parseEnum(PAYOUT_FREQUENCIES, bond.payoutFrequency)} />
      </Panel>

      <Panel title="Backing contracts">
        <p className="whitespace-pre-line text-sm">{bond.contractSummary}</p>
        <p className="mt-3 text-sm text-muted">Annual contracted revenue: {formatUsd(bond.annualRevenueCents)}</p>
        <ul className="mt-3 grid gap-1 text-sm">
          {bond.documents.map((doc) => (
            <li key={doc.id}>{doc.name} <span className="text-muted">· {Math.ceil(doc.sizeBytes / 1024)} KB</span></li>
          ))}
          {bond.documents.length === 0 && <li className="text-muted">No documents uploaded.</li>}
        </ul>
      </Panel>

      {!canDecide && <p className="text-sm text-muted">Claim this application from the queue to decide on it.</p>}

      {canDecide && (
        <div className="grid gap-4 md:grid-cols-3">
          <Panel title="Approve and list">
            <form action={decideAction} className="grid gap-3">
              <input type="hidden" name="bondId" value={bond.id} />
              <input type="hidden" name="kind" value="APPROVE" />
              <Field label="Curator fee (%)" hint={`${formatRate(MIN_FEE_BPS)} to ${formatRate(MAX_FEE_BPS)}.`}>
                <input name="feePct" type="number" required min={bpsToPct(MIN_FEE_BPS)} max={bpsToPct(MAX_FEE_BPS)} step="0.1" defaultValue={1} className={inputClass} />
              </Field>
              <Field label="Note for investors (optional)">
                <textarea name="note" className={textareaClass} />
              </Field>
              <Button>Approve and list</Button>
            </form>
          </Panel>
          <Panel title="Request changes">
            <form action={decideAction} className="grid gap-3">
              <input type="hidden" name="bondId" value={bond.id} />
              <input type="hidden" name="kind" value="REQUEST_CHANGES" />
              <Field label="What needs to change">
                <textarea name="note" required className={textareaClass} />
              </Field>
              <Button variant="secondary">Request changes</Button>
            </form>
          </Panel>
          <Panel title="Reject">
            <form action={decideAction} className="grid gap-3">
              <input type="hidden" name="bondId" value={bond.id} />
              <input type="hidden" name="kind" value="REJECT" />
              <Field label="Reason">
                <textarea name="note" required className={textareaClass} />
              </Field>
              <Button variant="danger">Reject</Button>
            </form>
          </Panel>
        </div>
      )}
    </div>
  );
}
```

### Task 4: Verify and commit

The decision logic is integration-tested in plan 18. The claim and approve path runs end to end in plan 28.

- [ ] **Step 1: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 2: Manual check**

Run: `pnpm dev`. With the submitted bond from plan 16, sign in as a curator.
- `/curator` shows 1 in the queue with a **Claim** button. Claiming opens the review page with three panels.
- Submit **Reject** with an empty reason. Expected: the browser blocks it (`required`).
- Approve at fee `1`. Expected: redirect to `/bonds/<id>` (that page arrives in plan 24). Back on `/curator`, the queue is empty and "Your bonds" shows the bond as "listed".

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/curator/actions.ts" "app/(app)/curator/page.tsx" "app/(app)/curator/review/[id]/page.tsx"
git commit -m "feat(curator): review queue, decision forms and fees"
```
