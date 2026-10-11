import Link from 'next/link';
import { Button, EmptyState, Field, FREQUENCY_LABEL, inputClass, PageHeader, ProgressBar } from '@/components/ui';
import { formatRate, formatUsd } from '@/lib/domain/money';
import { listBonds, listCuratorOptions, parseFilters, type BondCard } from '@/lib/services/marketplace';

const SORT_LABEL = { newest: 'Newest', yield: 'Highest yield', term: 'Shortest term', funded: 'Most funded' } as const;

function Card({ bond }: { bond: BondCard }) {
  return (
    <li className="relative grid gap-4 rounded-lg border border-line bg-surface p-5 transition-colors duration-150 hover:border-ink/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">
            <Link href={`/bonds/${bond.id}`} className="after:absolute after:inset-0">{bond.companyName}</Link>
          </h2>
          <p className="text-xs text-muted capitalize">{bond.sector.toLowerCase()}</p>
        </div>
        <p className="text-right">
          <span className="block text-2xl font-semibold">{formatRate(bond.rateBps)}</span>
          <span className="text-xs text-muted">fixed / year</span>
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-xs text-muted">Term</dt><dd>{bond.termMonths} mo</dd></div>
        <div><dt className="text-xs text-muted">Raise</dt><dd>{formatUsd(bond.amountCents)}</dd></div>
        <div><dt className="text-xs text-muted">Payouts</dt><dd>{FREQUENCY_LABEL[bond.payoutFrequency]}</dd></div>
      </dl>
      <div className="grid gap-1.5">
        <ProgressBar pct={bond.fundedPct} label={`${bond.companyName} funding progress`} />
        <p className="text-xs text-muted">{bond.fundedPct}% funded</p>
      </div>
      <p className="relative z-10 text-sm">
        <span className="text-muted">Curated by </span>
        <Link href={`/curators/${bond.curator.id}`} className="underline underline-offset-2">{bond.curator.displayName}</Link>
        <span className="text-muted"> · {bond.curator.score === null ? 'Unrated' : `Rank ${bond.curator.score}`}</span>
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
      <form method="get" className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7 lg:items-end">
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
          <Link href="/bonds" className="self-center text-sm text-muted hover:text-ink">Clear</Link>
        </div>
      </form>
      {bonds.length === 0 ? (
        <EmptyState title="No bonds match these filters">
          <Link href="/bonds" className="text-sm underline underline-offset-2">Clear filters</Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {bonds.map((bond) => <Card key={bond.id} bond={bond} />)}
        </ul>
      )}
    </>
  );
}
