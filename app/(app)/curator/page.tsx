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
            <p className="text-muted">New applications appear here as soon as a company submits them.</p>
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
          <p className="text-muted">Bonds you claim or list appear here.</p>
        ) : (
          <ul className="grid gap-2">
            {mine.map((bond) => {
              const label = `${bond.company.name} · ${formatUsd(bond.amountCents)} · ${formatRate(bond.rateBps)}`;
              const href = PUBLIC_STATUSES.includes(bond.status) ? `/bonds/${bond.id}` : `/curator/review/${bond.id}`;
              return (
                <li key={bond.id} className="flex flex-wrap items-center justify-between gap-3">
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
