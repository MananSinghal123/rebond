/** Ledger mark: a term sheet's ruled lines, the last one in ReBond green. `night` inverts it for dark bands. */
export function BrandMark({ tone = 'paper' }: { tone?: 'paper' | 'night' }) {
  const night = tone === 'night';
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
      <rect width="20" height="20" rx="4" className={night ? 'fill-paper' : 'fill-ink'} />
      <rect x="5" y="5.5" width="10" height="1.75" rx="0.5" className={night ? 'fill-ink' : 'fill-paper'} />
      <rect x="5" y="9.25" width="7" height="1.75" rx="0.5" className={night ? 'fill-ink/60' : 'fill-paper/70'} />
      <rect x="5" y="13" width="10" height="1.75" rx="0.5" className={night ? 'fill-accent' : 'fill-accent-mark'} />
    </svg>
  );
}
