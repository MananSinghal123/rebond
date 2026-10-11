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
