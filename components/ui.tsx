import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import type { BondStatus, PayoutFrequency } from '@/lib/domain/types';

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 active:brightness-95',
  secondary: 'bg-fill text-ink hover:bg-ink/10 active:bg-ink/15',
  danger: 'bg-bad/10 text-bad hover:bg-bad/15 active:bg-bad/20',
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;

const BUTTON_BASE =
  'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-[18px] text-[15px] font-medium tracking-[-0.01em] transition-[background-color,filter,transform] duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return <button className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />;
}

const CONTROL =
  'w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-ink/20 focus:border-accent focus:shadow-[0_0_0_4px_color-mix(in_oklch,var(--color-accent)_18%,transparent)] focus:outline-none';

export const inputClass = `h-11 ${CONTROL}`;
export const textareaClass = `min-h-28 py-2.5 ${CONTROL}`;

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid content-start gap-1.5">
      <span className="text-[13px] font-medium text-ink/80">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="grid max-w-2xl gap-2">
        <h1 className="text-[34px] leading-[1.12] font-semibold tracking-[-0.025em] md:text-[40px]">{title}</h1>
        {description && <p className="text-[17px] leading-snug text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[18px] bg-surface p-6 shadow-sheet ${className}`}>
      {title && <h2 className="mb-5 text-[19px] font-semibold tracking-[-0.015em]">{title}</h2>}
      {children}
    </section>
  );
}

export function Notice({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  const styles = tone === 'error' ? 'bg-bad/10 text-bad' : 'bg-accent/10 text-accent';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-3 text-[15px] font-medium ${styles}`}>
      {children}
    </p>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-surface px-5 py-4 shadow-sheet">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-[28px] leading-tight font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

export const FREQUENCY_LABEL: Record<PayoutFrequency, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  AT_MATURITY: 'At maturity',
};

const STATUS_TONE: Record<BondStatus, string> = {
  DRAFT: 'bg-fill text-muted',
  SUBMITTED: 'bg-fill text-ink',
  IN_REVIEW: 'bg-warn/12 text-warn',
  CHANGES_REQUESTED: 'bg-warn/12 text-warn',
  REJECTED: 'bg-bad/10 text-bad',
  LISTED: 'bg-accent/10 text-accent',
  FUNDED: 'bg-accent/10 text-accent',
  ACTIVE: 'bg-accent/10 text-accent',
  MATURED: 'bg-fill text-muted',
};

export function StatusBadge({ status }: { status: BondStatus }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold capitalize ${STATUS_TONE[status]}`}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}

export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-1.5 overflow-hidden rounded-full bg-fill"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[var(--ease-out-expo)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-14 text-center">
      <p className="text-[19px] font-semibold tracking-[-0.015em]">{title}</p>
      <div className="grid max-w-sm justify-items-center gap-4 text-muted">{children}</div>
    </div>
  );
}

export const tableWrapClass = 'overflow-x-auto';
export const tableClass = 'w-full min-w-[36rem] text-left text-[15px]';
export const thClass = 'border-b border-line pb-2.5 pr-4 text-[13px] font-medium text-muted first:pl-0';
export const tdClass = 'border-b border-line py-3.5 pr-4 [tr:last-child>&]:border-b-0';

export const shortHash = (value: string) => `${value.slice(0, 10)}…${value.slice(-6)}`;

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
