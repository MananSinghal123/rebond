import Link from 'next/link';
import {
  Button,
  ButtonLink,
  EmptyState,
  formatDate,
  Notice,
  numClass,
  PageHeader,
  Panel,
  Stat,
  StatGrid,
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
    <div className="grid gap-6">
      <PageHeader
        title={curator.displayName}
        description="Claim an application to review it. Approving lists it for investors with your name attached."
        action={<ButtonLink href={`/curators/${curator.id}`} variant="secondary">Public profile and rank</ButtonLink>}
      />
      {error && <Notice>{error}</Notice>}

      <StatGrid className="grid-cols-2 sm:grid-cols-3">
        <Stat label="Waiting in queue" value={queue.length} />
        <Stat label="Bonds you listed" value={listedByMe.length} />
        <Stat label="Fees accrued (simulated)" value={formatUsd(feesCents)} className="col-span-2 sm:col-span-1" />
      </StatGrid>

      <Panel title="Queue">
        {queue.length === 0 ? (
          <EmptyState title="The queue is empty">
            <p className="text-muted">New applications appear here as soon as a company submits them.</p>
          </EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <caption className="sr-only">Applications waiting for review</caption>
              <thead>
                <tr>
                  <th className={thClass}>Company</th>
                  <th className={`${thClass} ${numClass}`}>Raise</th>
                  <th className={`${thClass} ${numClass}`}>Rate</th>
                  <th className={`${thClass} ${numClass}`}>Term</th>
                  <th className={thClass}>Submitted</th>
                  <th className={thClass}><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody data-reveal="stagger">
                {queue.map((bond) => (
                  <tr key={bond.id}>
                    <td data-primary className={`${tdClass} font-medium`}>{bond.company.name}</td>
                    <td data-figure className={`${tdClass} ${numClass}`}>{formatUsd(bond.amountCents)}</td>
                    <td data-label="Rate" className={`${tdClass} ${numClass}`}>{formatRate(bond.rateBps)}</td>
                    <td data-label="Term" className={`${tdClass} ${numClass}`}>{bond.termMonths} mo</td>
                    <td data-label="Submitted" className={`${tdClass} text-ink-2`}>{formatDate(bond.updatedAt)}</td>
                    <td data-action className={`${tdClass} text-right`}>
                      <form action={claimAction}>
                        <input type="hidden" name="bondId" value={bond.id} />
                        <Button variant="secondary" className="sm:h-8 sm:px-3 sm:text-[13px]" aria-label={`Claim ${bond.company.name}`}>Claim</Button>
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
          <p className="text-muted">Bonds you claim or list appear here.</p>
        ) : (
          <ul data-reveal="stagger" className="-my-3">
            {mine.map((bond) => {
              const label = `${bond.company.name} · ${formatUsd(bond.amountCents)} · ${formatRate(bond.rateBps)}`;
              const href = PUBLIC_STATUSES.includes(bond.status) ? `/bonds/${bond.id}` : `/curator/review/${bond.id}`;
              return (
                <li key={bond.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                  <Link href={href} className="-my-2.5 inline-block py-2.5 text-[14px] hover:text-accent hover:underline">{label}</Link>
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
