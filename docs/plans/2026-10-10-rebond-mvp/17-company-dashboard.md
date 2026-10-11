# Company Dashboard and Bond Panels Implementation Plan

> **For implementers:** Execute this plan task-by-task using the repository’s supported workflow. Steps use checkbox (`- [ ]`) syntax for tracking. Companion execution skills are optional and must be available before use.

**Goal:** The company dashboard (`/company`), the company bond view and edit page (`/company/bonds/[id]`), and the shared bond panels (terms, funding bar, schedule table, chain record) that the investor pages reuse.

**Architecture:** REQUIREMENTS.md FR-11 (dashboard: status, curator notes, % funded, upcoming schedule), FR-18 panels (schedule table and on-chain record), FR-28 (explorer-styled link, simulated) and §6. Owner: `components/bond-panels.tsx`. Panels are presentational, take plain typed props and are server-safe. `toScheduleRows` and `toChainRows` parse the stored status and type strings at the page boundary, so the panels never see raw strings. Pages query Prisma directly and stay read-only. Mutations go through actions only. The edit view reuses `ApplicationForm` while the bond is in `EDITABLE_STATUSES`. Load impeccable `reference/craft-floor.md` before editing.

**Tech Stack:** Next.js 15 server components, Prisma 6.

---

**Files:**
- Create: `components/bond-panels.tsx`
- Create: `app/(app)/company/page.tsx`
- Create: `app/(app)/company/bonds/[id]/page.tsx`

### Task 1: Bond panels

- [ ] **Step 1: Create `components/bond-panels.tsx`**

```tsx
import { formatDate, FREQUENCY_LABEL, ProgressBar, shortHash, tableClass, tableWrapClass, tdClass, thClass } from '@/components/ui';
import { formatRate, formatUsd, fundedPct } from '@/lib/domain/money';
import {
  CHAIN_EVENT_TYPES,
  DISTRIBUTION_STATUSES,
  parseEnum,
  type ChainEventType,
  type DistributionStatus,
  type PayoutFrequency,
} from '@/lib/domain/types';

const EVENT_LABEL: Record<ChainEventType, string> = {
  BOND_LISTED: 'Listed',
  POSITION_OPENED: 'Position opened',
  BOND_FUNDED: 'Fully funded',
  DISTRIBUTION_PAID: 'Distribution paid',
  BOND_MATURED: 'Matured',
};

const DISTRIBUTION_LABEL: Record<DistributionStatus, string> = { SCHEDULED: 'Scheduled', PAID: 'Paid', LATE: 'Paid late' };

export type BondTermsProps = {
  amountCents: number;
  rateBps: number;
  termMonths: number;
  payoutFrequency: PayoutFrequency;
  curatorFeeBps: number | null;
  maturityDate: Date | null;
};

export function BondTerms(props: BondTermsProps) {
  const rows = [
    ['Fixed annual rate', formatRate(props.rateBps)],
    ['Raise', formatUsd(props.amountCents)],
    ['Term', `${props.termMonths} months`],
    ['Payouts', FREQUENCY_LABEL[props.payoutFrequency]],
    ['Curator fee', props.curatorFeeBps === null ? 'Not set' : formatRate(props.curatorFeeBps)],
    ['Maturity', props.maturityDate ? formatDate(props.maturityDate) : 'Set when fully funded'],
  ];
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-0.5 font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FundingProgress({ fundedCents, amountCents }: { fundedCents: number; amountCents: number }) {
  const pct = fundedPct(fundedCents, amountCents);
  return (
    <div className="grid gap-2">
      <p className="text-sm">
        <span className="font-medium">{formatUsd(fundedCents)}</span>
        <span className="text-muted"> of {formatUsd(amountCents)} raised · {pct}%</span>
      </p>
      <ProgressBar pct={pct} label="Funding progress" />
    </div>
  );
}

export type ScheduleRow = {
  id: string;
  seq: number;
  dueDate: Date;
  amountCents: number;
  isPrincipal: boolean;
  status: DistributionStatus;
  paidAt: Date | null;
};

export function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No distributions scheduled yet.</p>;
  }
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <caption className="sr-only">Distribution schedule</caption>
        <thead>
          <tr>
            <th className={thClass}>#</th>
            <th className={thClass}>Due</th>
            <th className={thClass}>Amount</th>
            <th className={thClass}>Includes</th>
            <th className={thClass}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={tdClass}>{row.seq}</td>
              <td className={tdClass}>{formatDate(row.dueDate)}</td>
              <td className={tdClass}>{formatUsd(row.amountCents)}</td>
              <td className={tdClass}>{row.isPrincipal ? 'Interest + principal' : 'Interest'}</td>
              <td className={`${tdClass} ${row.status === 'SCHEDULED' ? 'text-muted' : ''}`}>
                {DISTRIBUTION_LABEL[row.status]}
                {row.paidAt && <span className="text-muted"> · {formatDate(row.paidAt)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type ChainRow = { id: number; type: ChainEventType; txHash: string; createdAt: Date };

export const toScheduleRows = (rows: (Omit<ScheduleRow, 'status'> & { status: string })[]): ScheduleRow[] =>
  rows.map((row) => ({ ...row, status: parseEnum(DISTRIBUTION_STATUSES, row.status) }));

export const toChainRows = (rows: (Omit<ChainRow, 'type'> & { type: string })[]): ChainRow[] =>
  rows.map((row) => ({ ...row, type: parseEnum(CHAIN_EVENT_TYPES, row.type) }));

export function ChainRecord({ events }: { events: ChainRow[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">No on-chain events yet.</p>;
  return (
    <ol className="grid gap-3">
      {events.map((event) => (
        <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3 last:border-b-0">
          <span className="text-sm font-medium">{EVENT_LABEL[event.type]}</span>
          <span className="text-xs text-muted">{formatDate(event.createdAt)}</span>
          <span className="w-full font-mono text-xs text-muted" title={event.txHash}>tx {shortHash(event.txHash)}</span>
          <span
            aria-disabled="true"
            title="Simulated record: not on a real network"
            className="text-xs text-accent underline decoration-dotted underline-offset-2"
          >
            View on explorer (simulated)
          </span>
        </li>
      ))}
    </ol>
  );
}
```

### Task 2: Company dashboard

- [ ] **Step 1: Create `app/(app)/company/page.tsx`**

```tsx
import Link from 'next/link';
import { FundingProgress } from '@/components/bond-panels';
import { ButtonLink, EmptyState, formatDate, PageHeader, Panel, StatusBadge } from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { PUBLIC_STATUSES } from '@/lib/domain/lifecycle';
import { BOND_STATUSES, parseEnum } from '@/lib/domain/types';

export default async function CompanyDashboard() {
  const actor = await requireActor('COMPANY');
  const company = await db.company.findUniqueOrThrow({
    where: { ownerId: actor.userId },
    include: {
      bonds: {
        orderBy: { createdAt: 'desc' },
        include: {
          distributions: { where: { status: 'SCHEDULED' }, orderBy: { seq: 'asc' }, take: 1 },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title={company.name}
        description="Your bond applications, their review status and funding."
        action={<ButtonLink href="/company/apply">New application</ButtonLink>}
      />
      {company.bonds.length === 0 && (
        <EmptyState title="No applications yet">
          <p className="text-sm text-muted">Apply with your raise amount, rate and term. A curator reviews it before investors see it.</p>
          <ButtonLink href="/company/apply">Apply to raise a bond</ButtonLink>
        </EmptyState>
      )}
      <ul className="grid gap-4">
        {company.bonds.map((bond) => {
          const status = parseEnum(BOND_STATUSES, bond.status);
          const nextDistribution = bond.distributions[0];
          return (
            <li key={bond.id}>
              <Panel>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/company/bonds/${bond.id}`} className="font-medium hover:underline">
                    {formatUsd(bond.amountCents)} · {formatRate(bond.rateBps)} · {bond.termMonths} months
                  </Link>
                  <StatusBadge status={status} />
                </div>
                {bond.reviewNote && (
                  <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm">
                    <span className="text-muted">Curator note: </span>
                    {bond.reviewNote}
                  </p>
                )}
                {PUBLIC_STATUSES.includes(status) && (
                  <div className="mt-4">
                    <FundingProgress fundedCents={bond.fundedCents} amountCents={bond.amountCents} />
                  </div>
                )}
                {nextDistribution && (
                  <p className="mt-3 text-sm text-muted">
                    Next distribution {formatUsd(nextDistribution.amountCents)} due {formatDate(nextDistribution.dueDate)}
                  </p>
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
    </>
  );
}
```

### Task 3: Company bond page

- [ ] **Step 1: Create `app/(app)/company/bonds/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation';
import { ApplicationForm } from '@/components/application-form';
import { BondTerms, ChainRecord, FundingProgress, ScheduleTable, toChainRows, toScheduleRows } from '@/components/bond-panels';
import { PageHeader, Panel, StatusBadge } from '@/components/ui';
import { requireActor } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { EDITABLE_STATUSES } from '@/lib/domain/lifecycle';
import { bpsToPct, centsToUsd } from '@/lib/domain/money';
import { BOND_STATUSES, parseEnum, PAYOUT_FREQUENCIES } from '@/lib/domain/types';
import { saveApplicationAction } from '../../actions';

export default async function CompanyBondPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor('COMPANY');
  const { id } = await params;
  const bond = await db.bond.findFirst({
    where: { id, company: { ownerId: actor.userId } },
    include: {
      company: true,
      curator: true,
      documents: { select: { id: true, name: true, sizeBytes: true } },
      distributions: { orderBy: { seq: 'asc' } },
      chainEvents: { orderBy: { id: 'asc' } },
    },
  });
  if (!bond) notFound();

  const status = parseEnum(BOND_STATUSES, bond.status);
  const payoutFrequency = parseEnum(PAYOUT_FREQUENCIES, bond.payoutFrequency);

  return (
    <div className="grid gap-6">
      <PageHeader title={bond.company.name} action={<StatusBadge status={status} />} />

      {bond.reviewNote && (
        <Panel title={`Note from ${bond.curator?.displayName ?? 'curator'}`}>
          <p className="text-sm">{bond.reviewNote}</p>
        </Panel>
      )}

      {EDITABLE_STATUSES.includes(status) ? (
        <Panel title={status === 'DRAFT' ? 'Draft application' : 'Update and resubmit'}>
          <ApplicationForm
            action={saveApplicationAction}
            defaults={{
              bondId: bond.id,
              companyName: bond.company.name,
              description: bond.company.description,
              amountUsd: centsToUsd(bond.amountCents),
              ratePct: bpsToPct(bond.rateBps),
              termMonths: bond.termMonths,
              payoutFrequency,
              contractSummary: bond.contractSummary,
              annualRevenueUsd: centsToUsd(bond.annualRevenueCents),
            }}
          />
        </Panel>
      ) : (
        <>
          <Panel title="Terms">
            <BondTerms {...bond} payoutFrequency={payoutFrequency} />
          </Panel>
          <Panel title="Funding">
            <FundingProgress fundedCents={bond.fundedCents} amountCents={bond.amountCents} />
          </Panel>
          <Panel title="Distribution schedule">
            <ScheduleTable rows={toScheduleRows(bond.distributions)} />
          </Panel>
          <Panel title="On-chain record">
            <ChainRecord events={toChainRows(bond.chainEvents)} />
          </Panel>
        </>
      )}

      {bond.documents.length > 0 && (
        <Panel title="Supporting documents">
          <ul className="grid gap-1 text-sm">
            {bond.documents.map((doc) => (
              <li key={doc.id}>
                {doc.name} <span className="text-muted">· {Math.ceil(doc.sizeBytes / 1024)} KB</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
```

### Task 4: Verify and commit

The data shown here comes from services tested in plans 15, 20 and 21. Plan 28 asserts the schedule and the chain record end to end.

- [ ] **Step 1: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 2: Manual check**

Run: `pnpm dev`. As the company from plan 16:
- `/company` lists the submitted bond as `$250,000 · 11% · 12 months` with a "submitted" badge. Once a draft exists, it shows a "draft" badge and a link.
- With no applications (a fresh company), the empty state shows **Apply to raise a bond**.
- Opening a draft shows the prefilled form. Opening a submitted bond shows Terms, Funding at 0%, "No distributions scheduled yet." and "No on-chain events yet."
- Opening another company's bond id returns 404.

- [ ] **Step 3: Commit**

```bash
git add components/bond-panels.tsx "app/(app)/company/page.tsx" "app/(app)/company/bonds/[id]/page.tsx"
git commit -m "feat(company): dashboard, bond view/edit and shared bond panels"
```
