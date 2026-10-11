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
