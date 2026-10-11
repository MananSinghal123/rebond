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
