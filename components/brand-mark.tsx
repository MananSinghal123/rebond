/** Ledger mark: a term sheet's ruled lines, the last one in ReBond green. */
export function BrandMark() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
      <rect width="20" height="20" rx="4" className="fill-ink" />
      <rect x="5" y="5.5" width="10" height="1.75" rx="0.5" className="fill-paper" />
      <rect x="5" y="9.25" width="7" height="1.75" rx="0.5" className="fill-paper/70" />
      <rect x="5" y="13" width="10" height="1.75" rx="0.5" className="fill-[oklch(0.72_0.13_162)]" />
    </svg>
  );
}
