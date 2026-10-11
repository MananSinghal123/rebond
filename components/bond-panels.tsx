import { formatDate, FREQUENCY_LABEL, numClass, ProgressBar, shortHash, tableClass, tableWrapClass, tdClass, thClass } from '@/components/ui';
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
    <dl className="grid grid-cols-2 border-y border-line py-1.5 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="py-2.5 pr-4">
          <dt className="label">{label}</dt>
          <dd className="mt-1 text-[15px] font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FundingProgress({ fundedCents, amountCents }: { fundedCents: number; amountCents: number }) {
  const pct = fundedPct(fundedCents, amountCents);
  return (
    <div className="grid gap-2.5">
      <p className="text-[24px] leading-tight font-medium tracking-[-0.015em]">{formatUsd(fundedCents)}</p>
      <ProgressBar pct={pct} label="Funding progress" />
      <p className="flex justify-between gap-4 text-[13px] text-muted">
        <span>of {formatUsd(amountCents)} raised</span>
        <span className="font-medium text-ink">{pct}%</span>
      </p>
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
            <th className={`${thClass} ${numClass}`}>Amount</th>
            <th className={thClass}>Includes</th>
            <th className={thClass}>Status</th>
          </tr>
        </thead>
        <tbody data-reveal="stagger">
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-mobile-hide className={`${tdClass} font-mono text-[13px] text-muted`}>{String(row.seq).padStart(2, '0')}</td>
              <td data-primary className={tdClass}>{formatDate(row.dueDate)}</td>
              <td data-figure className={`${tdClass} ${numClass} font-medium`}>{formatUsd(row.amountCents)}</td>
              <td data-label="Includes" className={tdClass}>{row.isPrincipal ? 'Interest + principal' : 'Interest'}</td>
              <td data-label="Status" className={`${tdClass} ${row.status === 'SCHEDULED' ? 'text-muted' : ''}`}>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden className={`size-1.5 rounded-full ${STATUS_DOT[row.status]}`} />
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
    <ol data-reveal="stagger" className="grid">
      {events.map((event) => (
        <li
          key={event.id}
          className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0"
        >
          <span className="text-[14px] font-medium">{EVENT_LABEL[event.type]}</span>
          <span className="text-[13px] text-muted">{formatDate(event.createdAt)}</span>
          <span className="font-mono text-[12px] whitespace-nowrap text-ink-2 max-sm:col-span-2" title={event.txHash}>tx {shortHash(event.txHash)}</span>
          <span
            aria-disabled="true"
            title="Simulated record: not on a real network"
            className="text-[13px] text-accent max-sm:col-span-2"
          >
            View on explorer (simulated)
          </span>
        </li>
      ))}
    </ol>
  );
}
