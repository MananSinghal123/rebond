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
const STATUS_DOT: Record<DistributionStatus, string> = { SCHEDULED: 'bg-ink/20', PAID: 'bg-accent', LATE: 'bg-warn' };

export type BondTermsProps = {
  amountCents: number;
  rateBps: number;
  termMonths: number;
  payoutFrequency: PayoutFrequency;
  curatorFeeBps: number | null;
  maturityDate: Date | null;
  showRate?: boolean;
};

export function BondTerms(props: BondTermsProps) {
  const rows = [
    ...(props.showRate === false ? [] : [['Fixed annual rate', formatRate(props.rateBps)]]),
    ['Raise', formatUsd(props.amountCents)],
    ['Term', `${props.termMonths} months`],
    ['Payouts', FREQUENCY_LABEL[props.payoutFrequency]],
    ['Curator fee', props.curatorFeeBps === null ? 'Not set' : formatRate(props.curatorFeeBps)],
    ['Maturity', props.maturityDate ? formatDate(props.maturityDate) : 'Set when fully funded'],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[13px] text-muted">{label}</dt>
          <dd className="mt-0.5 text-[17px] font-medium tracking-[-0.01em]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FundingProgress({ fundedCents, amountCents }: { fundedCents: number; amountCents: number }) {
  const pct = fundedPct(fundedCents, amountCents);
  return (
    <div className="grid gap-3">
      <p>
        <span className="block font-[family-name:var(--font-display)] text-[28px] leading-tight font-semibold tracking-[-0.02em]">
          {formatUsd(fundedCents)}
        </span>
        <span className="text-[13px] text-muted">of {formatUsd(amountCents)} raised · {pct}%</span>
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
    return <p className="text-muted">No distributions scheduled yet.</p>;
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
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className={`size-2 rounded-full ${STATUS_DOT[row.status]}`} />
                  {DISTRIBUTION_LABEL[row.status]}
                </span>
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
  if (events.length === 0) return <p className="text-muted">No on-chain events yet.</p>;
  return (
    <ol className="grid">
      {events.map((event) => (
        <li
          key={event.id}
          className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-b border-line py-3.5 first:pt-0 last:border-b-0 last:pb-0"
        >
          <span className="font-medium">{EVENT_LABEL[event.type]}</span>
          <span className="text-[13px] text-muted">{formatDate(event.createdAt)}</span>
          <span className="font-mono text-[12px] text-muted" title={event.txHash}>tx {shortHash(event.txHash)}</span>
          <span
            aria-disabled="true"
            title="Simulated record: not on a real network"
            className="text-[13px] text-accent"
          >
            View on explorer (simulated)
          </span>
        </li>
      ))}
    </ol>
  );
}
