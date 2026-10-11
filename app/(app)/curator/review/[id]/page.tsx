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
