import Link from 'next/link';
import { Button, EmptyState, Field, FREQUENCY_LABEL, inputClass, PageHeader, ProgressBar } from '@/components/ui';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { listBonds, listCuratorOptions, parseFilters, type BondCard } from '@/lib/services/marketplace';

const SORT_LABEL = { newest: 'Newest', yield: 'Highest yield', term: 'Shortest term', funded: 'Most funded' } as const;

function Card({ bond }: { bond: BondCard }) {
  return (
    <li className="group relative grid gap-6 rounded-[22px] bg-surface p-7 shadow-sheet transition-[transform,box-shadow] duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.015em]">
            <Link href={`/bonds/${bond.id}`} className="after:absolute after:inset-0 after:rounded-[22px]">{bond.companyName}</Link>
          </h2>
          <p className="text-[13px] text-muted capitalize">{bond.sector.toLowerCase()}</p>
        </div>
        <span className="text-[13px] text-muted">{FREQUENCY_LABEL[bond.payoutFrequency]}</span>
      </div>
      <div>
        <p className="font-[family-name:var(--font-display)] text-[56px] leading-none font-semibold tracking-[-0.04em]">
          {formatRate(bond.rateBps)}
        </p>
        <p className="mt-1.5 text-[13px] text-muted">
          fixed per year · {bond.termMonths} months · {formatUsd(bond.amountCents)} raise
        </p>
      </div>
      <div className="grid gap-2">
        <ProgressBar pct={bond.fundedPct} label={`${bond.companyName} funding progress`} />
        <p className="text-[13px] text-muted">{bond.fundedPct}% funded</p>
      </div>
      <p className="relative z-10 border-t border-line pt-4 text-[13px] text-muted">
        Curated by{' '}
        <Link href={`/curators/${bond.curator.id}`} className="font-medium text-ink hover:underline">
          {bond.curator.displayName}
        </Link>
        {' · '}
        {bond.curator.score === null ? 'Unrated' : `Rank ${bond.curator.score}`}
      </p>
    </li>
  );
}

export default async function BondsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const [bonds, curators] = await Promise.all([listBonds(filters), listCuratorOptions()]);

  return (
    <>
      <PageHeader title="Bonds" description="Fixed-return bonds backed by contracted revenue, vetted by a named curator." />
      <form method="get" className="mb-10 grid grid-cols-2 gap-4 rounded-[22px] bg-surface p-6 shadow-sheet md:grid-cols-4 lg:grid-cols-7 lg:items-end">
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
        <Field label="Sort">
          <select name="sort" defaultValue={filters.sort} className={inputClass}>
            {Object.entries(SORT_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <div className="col-span-2 flex gap-3 md:col-span-4 lg:col-span-7">
          <Button variant="secondary">Apply filters</Button>
          <Link href="/bonds" className="self-center text-[15px] text-accent hover:underline">Clear</Link>
        </div>
      </form>
      {bonds.length === 0 ? (
        <EmptyState title="No bonds match these filters">
          <Link href="/bonds" className="text-accent hover:underline">Clear filters</Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {bonds.map((bond) => <Card key={bond.id} bond={bond} />)}
        </ul>
      )}
    </>
  );
}
