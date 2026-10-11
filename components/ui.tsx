import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import type { BondStatus, PayoutFrequency } from '@/lib/domain/types';

const BUTTON_VARIANTS = {
  primary:
    'bg-accent text-accent-ink shadow-[inset_0_-1px_0_oklch(0_0_0/0.14),0_1px_1px_oklch(0.2_0.008_255/0.08)] hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-ink shadow-[0_1px_1px_oklch(0.2_0.008_255/0.04)] hover:bg-fill',
  danger: 'border border-bad/30 bg-surface text-bad hover:bg-bad/[0.05]',
} as const;

type ButtonVariant = keyof typeof BUTTON_VARIANTS;

const BUTTON_BASE =
  'inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] px-4 text-[15px] font-medium sm:h-9 sm:px-3.5 sm:text-[14px] transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45';

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

export const CONTROL =
  'w-full rounded-[6px] border border-line-strong bg-surface px-3 text-[16px] text-ink sm:text-[15px] shadow-[inset_0_1px_1px_oklch(0.2_0.008_255/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-muted hover:border-ink/30 focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-accent)_16%,transparent)] focus:outline-none';

// 16px text on phones stops iOS Safari zooming the page when a field takes focus.
export const inputClass = `h-11 sm:h-10 ${CONTROL}`;
export const textareaClass = `min-h-28 py-2.5 ${CONTROL}`;

/** A resting white sheet: hairline border, no shadow. */
export const sheetClass = 'min-w-0 rounded-[8px] border border-line bg-surface';

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid content-start gap-1.5 ${className}`}>
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div data-reveal="up" className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-5 sm:mb-8 sm:gap-y-4 sm:pb-6 [.grid>&]:mb-0 sm:[.grid>&]:mb-2">
      <div className="grid max-w-2xl gap-1.5">
        <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[28px] md:text-[32px]">{title}</h1>
        {description && <p className="text-[15px] text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section data-reveal="up" className={sheetClass}>
      {title && (
        <h2 className="border-b border-line px-4 py-3 text-[14px] font-semibold tracking-[-0.005em] sm:px-5 md:px-6">{title}</h2>
      )}
      <div className={`p-4 sm:p-5 md:p-6 ${className}`}>{children}</div>
    </section>
  );
}

export function Notice({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  const styles = tone === 'error' ? 'border-bad/20 bg-bad/[0.05] text-bad' : 'border-accent/20 bg-accent/[0.05] text-accent';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-[6px] border px-4 py-3 text-[14px] font-medium ${styles}`}>
      {children}
    </p>
  );
}

/** Joins stats into one ruled strip, like the summary line of a statement. */
export function StatGrid({ children, className = 'grid-cols-2 md:grid-cols-4' }: { children: ReactNode; className?: string }) {
  return (
    <div data-reveal="up" className={`grid gap-px overflow-hidden rounded-[8px] border border-line bg-line ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface px-4 py-3.5 sm:px-5 sm:py-4 ${className}`}>
      <p className="label">{label}</p>
      <p className="mt-1 text-[20px] leading-tight font-medium tracking-[-0.015em] sm:mt-1.5 sm:text-[24px]">{value}</p>
    </div>
  );
}

export const FREQUENCY_LABEL: Record<PayoutFrequency, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  AT_MATURITY: 'At maturity',
};

const NEUTRAL = 'bg-ink/[0.05] text-ink-2';
const STATUS_TONE: Record<BondStatus, string> = {
  DRAFT: NEUTRAL,
  SUBMITTED: NEUTRAL,
  IN_REVIEW: 'bg-warn/10 text-warn',
  CHANGES_REQUESTED: 'bg-warn/10 text-warn',
  REJECTED: 'bg-bad/[0.08] text-bad',
  LISTED: 'bg-accent/[0.08] text-accent',
  FUNDED: 'bg-accent/[0.08] text-accent',
  ACTIVE: 'bg-accent/[0.08] text-accent',
  MATURED: NEUTRAL,
};

export function StatusBadge({ status }: { status: BondStatus }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 rounded-[4px] px-2 text-[12px] font-medium whitespace-nowrap capitalize ${STATUS_TONE[status]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
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
      className="h-1 overflow-hidden rounded-full bg-ink/[0.08]"
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div data-reveal="up" className="grid justify-items-center gap-2 px-6 py-12 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <div className="grid max-w-sm justify-items-center gap-4 text-[14px] text-muted">{children}</div>
    </div>
  );
}

/** Footnote marker tying a line on a document to the note that explains it. */
export function NoteRef({ n }: { n: number }) {
  return (
    <span className="inline-grid size-[18px] shrink-0 place-items-center rounded-[4px] border border-accent/35 font-mono text-[11px] leading-none font-medium text-accent">
      <span className="sr-only">Note </span>
      {n}
    </span>
  );
}

export const tableWrapClass = 'overflow-x-auto';
/** On phones `.rtable` turns each row into a compact record (see globals.css); give cells data-label. */
export const tableClass = 'rtable w-full text-left text-[14px] sm:min-w-[36rem]';
export const thClass = 'label border-b border-line pb-2.5 pr-4 font-medium last:pr-0';
export const tdClass = 'border-b border-line py-3 pr-4 last:pr-0 [tr:last-child>&]:border-b-0';
/** Right-aligns a numeric column; add to both its th and td. */
export const numClass = 'text-right';

export const shortHash = (value: string) => `${value.slice(0, 10)}…${value.slice(-6)}`;

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
