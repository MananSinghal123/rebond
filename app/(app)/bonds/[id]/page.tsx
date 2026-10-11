import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { BondTerms, ChainRecord, FundingProgress, ScheduleTable, toChainRows, toScheduleRows } from '@/components/bond-panels';
import { FundForm } from '@/components/fund-form';
import { Button, Notice, PageHeader, Panel, shortHash, StatusBadge } from '@/components/ui';
import type { Session } from '@/lib/auth/edge';
import { requireRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PUBLIC_STATUSES } from '@/lib/domain/lifecycle';
import { formatRate } from '@/lib/domain/money';
import { BOND_STATUSES, parseEnum, PAYOUT_FREQUENCIES } from '@/lib/domain/types';
import { getCuratorRanks } from '@/lib/services/curators';
import { devToolsEnabled } from '@/lib/auth/dev-tools';
import { advanceTimeAction, attestAction, fundAction } from './actions';

type FundingGate = 'not-investor' | 'unverified' | 'can-fund';

async function fundingGate(session: Session): Promise<FundingGate> {
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
        <label className="flex min-h-11 items-center gap-2.5 sm:min-h-0">
          <input type="checkbox" name="late" className="size-4 accent-[var(--color-accent)]" />
          Mark this payout as late
        </label>
      </form>
      <p className="mt-3 text-[13px] text-muted">Pays the next scheduled distribution pro-rata to every position.</p>
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
  const [{ id }, { error, funded }, session] = await Promise.all([params, searchParams, requireRole()]);
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
    'not-investor': <p className="text-muted">Only investor accounts can fund bonds.</p>,
    unverified: (
      <form action={attestAction} className="grid gap-3">
        <input type="hidden" name="bondId" value={bond.id} />
        <label className="flex gap-3">
          <input type="checkbox" name="verified" required className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]" />
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
    <div className="grid gap-4 sm:gap-6">
      <PageHeader title={bond.company.name} description={bond.company.description} action={<StatusBadge status={status} />} />
      {error && <Notice>{error}</Notice>}
      {funded && <Notice tone="success">Investment recorded · tx {shortHash(funded)}</Notice>}

      {/* Phones read rate → funding → backing → curator; from tablet up, funding sits in a sticky right column. */}
      <div className="grid items-start gap-4 sm:gap-6 md:grid-cols-[minmax(0,1fr)_17.5rem] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <p>
              <span className="label block">Fixed annual rate</span>
              <span className="mt-2 block text-[56px] leading-none font-medium tracking-[-0.035em] md:text-[64px]">
                {formatRate(bond.rateBps)}
              </span>
            </p>
            <p className="text-[13px] text-muted md:text-right">
              Curated by
              <span className="block text-[15px] font-medium text-ink">{curator.displayName}</span>
            </p>
          </div>
          <BondTerms {...bond} showRate={false} payoutFrequency={parseEnum(PAYOUT_FREQUENCIES, bond.payoutFrequency)} />
        </Panel>
        <div className="md:col-start-2 md:row-span-3 md:row-start-1 md:self-stretch">
          <div className="md:sticky md:top-20">
            <Panel title="Funding">
              <FundingProgress fundedCents={bond.fundedCents} amountCents={bond.amountCents} />
              {status === 'LISTED' && <div className="mt-5 border-t border-line pt-5">{fundingPanel[gate]}</div>}
            </Panel>
          </div>
        </div>
        <Panel title="Backing contracts">
          <p className="whitespace-pre-line">{bond.contractSummary}</p>
        </Panel>
        <Panel title="Curator">
          <p>
            <Link href={`/curators/${curator.id}`} className="font-medium text-accent hover:underline">{curator.displayName}</Link>
            <span className="text-muted"> · {score === null ? 'Unrated' : `Rank ${score}`}</span>
          </p>
          {bond.reviewNote && <p className="mt-3 border-l border-line-strong pl-4 text-ink-2">“{bond.reviewNote}”</p>}
        </Panel>
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
