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
import { formatRate } from '@/lib/domain/money';
import { BOND_STATUSES, parseEnum, PAYOUT_FREQUENCIES } from '@/lib/domain/types';
import { getCuratorRanks } from '@/lib/services/curators';
import { devToolsEnabled } from '@/lib/auth/dev-tools';
import { advanceTimeAction, attestAction, fundAction } from './actions';

type FundingGate = 'sign-in' | 'not-investor' | 'unverified' | 'can-fund';

async function fundingGate(session: Session | null): Promise<FundingGate> {
  if (!session) return 'sign-in';
  if (session.role !== 'INVESTOR') return 'not-investor';
  const investor = await db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { verified: true } });
  return investor.verified ? 'can-fund' : 'unverified';
}

function AdvanceTime({ bondId }: { bondId: string }) {
  return (
    <Panel title="Demo control: advance time">
      <form action={advanceTimeAction} className="flex flex-wrap items-center gap-4">
        <input type="hidden" name="bondId" value={bondId} />
        <Button variant="secondary">Advance time</Button>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="late" className="accent-[var(--color-accent)]" />
          Mark this payout as late
        </label>
      </form>
      <p className="mt-2 text-[13px] text-muted">Pays the next scheduled distribution pro-rata to every position.</p>
    </Panel>
  );
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
  const showAdvanceTime = status === 'ACTIVE' && session !== null && devToolsEnabled();

  const fundingPanel: Record<FundingGate, ReactNode> = {
    'sign-in': <ButtonLink href={`/login?next=/bonds/${bond.id}`}>Sign in to invest</ButtonLink>,
    'not-investor': <p className="text-muted">Only investor accounts can fund bonds.</p>,
    unverified: (
      <form action={attestAction} className="grid gap-3">
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
          <Panel>
            <p className="font-[family-name:var(--font-display)] text-[72px] leading-none font-semibold tracking-[-0.045em]">
              {formatRate(bond.rateBps)}
            </p>
            <p className="mt-2 mb-7 text-[15px] text-muted">fixed annual rate, curated by {curator.displayName}</p>
            <BondTerms {...bond} showRate={false} payoutFrequency={parseEnum(PAYOUT_FREQUENCIES, bond.payoutFrequency)} />
          </Panel>
          <Panel title="Backing contracts">
            <p className="whitespace-pre-line">{bond.contractSummary}</p>
          </Panel>
          <Panel title="Curator">
            <p>
              <Link href={`/curators/${curator.id}`} className="font-medium underline underline-offset-2">{curator.displayName}</Link>
              <span className="text-muted"> · {score === null ? 'Unrated' : `Rank ${score}`}</span>
            </p>
            {bond.reviewNote && <p className="mt-2 text-muted">“{bond.reviewNote}”</p>}
          </Panel>
        </div>

        <div className="grid content-start gap-6 lg:sticky lg:top-24 lg:self-start">
          <Panel title="Funding">
            <FundingProgress fundedCents={bond.fundedCents} amountCents={bond.amountCents} />
            {status === 'LISTED' && <div className="mt-5 border-t border-line pt-5">{fundingPanel[gate]}</div>}
          </Panel>
        </div>
      </div>

      {showAdvanceTime && <AdvanceTime bondId={bond.id} />}
      <Panel title="Distribution schedule">
        <ScheduleTable rows={toScheduleRows(bond.distributions)} />
      </Panel>
      <Panel title="On-chain record">
        <ChainRecord events={toChainRows(bond.chainEvents)} />
      </Panel>
    </div>
  );
}
