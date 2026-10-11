import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth/session';
import { Button, EmptyState, Field, FREQUENCY_LABEL, inputClass, PageHeader, ProgressBar, sheetClass } from '@/components/ui';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { listBonds, listCuratorOptions, parseFilters, type BondCard } from '@/lib/services/marketplace';

const SORT_LABEL = { newest: 'Newest', yield: 'Highest yield', term: 'Shortest term', funded: 'Most funded' } as const;

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sm:border-l sm:border-line sm:pl-3 sm:first:border-l-0 sm:first:pl-0">
      <dt className="label">{label}</dt>
      <dd className="mt-1 text-[14px] font-medium whitespace-nowrap">{children}</dd>
    </div>
  );
}

function Card({ bond }: { bond: BondCard }) {
  return (
    <li data-reveal="up" className={`${sheetClass} group relative grid transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-[0_1px_2px_oklch(0.2_0.008_255/0.05),0_4px_12px_-4px_oklch(0.2_0.008_255/0.08)]`}>
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">
            <Link href={`/bonds/${bond.id}`} className="after:absolute after:inset-0 after:rounded-[8px] group-hover:underline">{bond.companyName}</Link>
          </h2>
          <p className="text-[13px] text-muted capitalize">{bond.sector.toLowerCase()}</p>
        </div>
        <p className="text-right">
          <span className="block text-[40px] leading-none font-medium tracking-[-0.03em]">{formatRate(bond.rateBps)}</span>
          <span className="mt-1 block text-[12px] text-muted">fixed annual</span>
        </p>
      </div>
      <dl className="mx-6 mt-5 grid grid-cols-2 gap-3 border-t sm:grid-cols-4 border-line pt-3.5">
        <Figure label="Term">{bond.termMonths} mo</Figure>
        <Figure label="Raise">{formatUsd(bond.amountCents)}</Figure>
        <Figure label="Payouts">{FREQUENCY_LABEL[bond.payoutFrequency]}</Figure>
        <Figure label="Funded">{bond.fundedPct}%</Figure>
      </dl>
      <div className="mx-6 mt-4 mb-5">
        <ProgressBar pct={bond.fundedPct} label={`${bond.companyName} funding progress`} />
      </div>
      <p className="relative z-10 flex items-center justify-between gap-4 border-t border-line bg-fill/60 px-6 py-3 text-[13px] text-muted">
        <span>
          Curated by{' '}
          <Link href={`/curators/${bond.curator.id}`} className="font-medium text-ink hover:underline">
            {bond.curator.displayName}
          </Link>
        </span>
        <span className="font-medium text-ink-2">{bond.curator.score === null ? 'Unrated' : `Rank ${bond.curator.score}`}</span>
      </p>
    </li>
  );
}

export default async function BondsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole();
  const filters = parseFilters(await searchParams);
  const [bonds, curators] = await Promise.all([listBonds(filters), listCuratorOptions()]);
  const activeFilters = [filters.minRate, filters.maxRate, filters.minTerm, filters.maxTerm, filters.curator, filters.frequency].filter(
    (value) => value !== undefined && value !== null && value !== '',
  ).length;

  return (
    <>
      <PageHeader title="Bonds" description="Fixed-return bonds backed by contracted revenue, vetted by a named curator." />
      <form
        method="get"
        data-reveal="up"
        className={`${sheetClass} mb-6 grid grid-cols-2 gap-3 p-4 sm:mb-8 sm:gap-4 sm:p-5 md:grid-cols-4 lg:grid-cols-7 lg:items-end`}
      >
        {/* Phones: the six filters fold behind this toggle (no name, so it never submits). */}
        <input id="bond-filters" type="checkbox" className="peer sr-only" />
        <div className="col-span-2 hidden grid-cols-2 gap-3 peer-checked:grid sm:contents sm:peer-checked:contents">
          <Field label="Min yield %"><input name="minRate" type="number" step="0.1" min={0} defaultValue={filters.minRate} className={inputClass} /></Field>
          <Field label="Max yield %"><input name="maxRate" type="number" step="0.1" min={0} defaultValue={filters.maxRate} className={inputClass} /></Field>
          <Field label="Min term"><input name="minTerm" type="number" min={0} defaultValue={filters.minTerm} className={inputClass} /></Field>
          <Field label="Max term"><input name="maxTerm" type="number" min={0} defaultValue={filters.maxTerm} className={inputClass} /></Field>
          <Field label="Curator">
            <select name="curator" defaultValue={filters.curator ?? ''} className={inputClass}>
              <option value="">Any</option>
              {curators.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
          </Field>
          <Field label="Payouts">
            <select name="frequency" defaultValue={filters.frequency ?? ''} className={inputClass}>
              <option value="">Any</option>
              {Object.entries(FREQUENCY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Sort" className="order-first sm:order-none">
          <select name="sort" defaultValue={filters.sort} className={inputClass}>
            {Object.entries(SORT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <label
          htmlFor="bond-filters"
          className="order-first inline-flex h-11 cursor-pointer items-center justify-center gap-2 self-end rounded-[6px] border border-line-strong bg-surface text-[15px] font-medium text-ink shadow-[0_1px_1px_oklch(0.2_0.008_255/0.04)] transition-colors duration-150 select-none peer-checked:bg-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent sm:hidden"
        >
          <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" />
          </svg>
          Filters
          {activeFilters > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-ink text-[11px] font-semibold text-paper">{activeFilters}</span>
          )}
        </label>
        <div className="col-span-2 flex items-center gap-4 md:col-span-4 lg:col-span-7">
          <Button variant="secondary" className="flex-1 sm:flex-none">Apply filters</Button>
          <Link href="/bonds" className="px-2 py-3 text-[14px] text-accent hover:underline sm:p-0">Clear</Link>
        </div>
      </form>
      {bonds.length === 0 ? (
        <EmptyState title="No bonds match these filters">
          <Link href="/bonds" className="text-accent hover:underline">Clear filters</Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {bonds.map((bond) => <Card key={bond.id} bond={bond} />)}
        </ul>
      )}
    </>
  );
}
