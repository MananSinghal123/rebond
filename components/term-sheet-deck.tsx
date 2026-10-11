'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NoteRef, ProgressBar } from '@/components/ui';

/** Illustrative bonds built from the demo's fictional companies. Every sheet is labelled "Example". */
type ExampleBond = {
  company: string;
  market: string;
  rate: string;
  terms: string;
  backing: string;
  curator: string;
  rank: number;
  tx: string;
  raised: string;
  goal: string;
  pct: number;
};

const BONDS: ExampleBond[] = [
  {
    company: 'Northwind Health',
    market: 'contracted health-plan premiums',
    rate: '11%',
    terms: '$250,000 · 12 months · quarterly',
    backing: 'Three-year capitation contract, regional health plan',
    curator: 'Atlas Credit Review',
    rank: 100,
    tx: '3f9a51c2e0…b17d42',
    raised: '$150,000',
    goal: '$250,000',
    pct: 60,
  },
  {
    company: 'Harbor Dialysis Partners',
    market: 'contracted dialysis service agreements',
    rate: '9.75%',
    terms: '$400,000 · 18 months · monthly',
    backing: 'Five-year service agreement with a regional payer network',
    curator: 'Juniper Diligence',
    rank: 96,
    tx: '8b21e7d4a9…c03f15',
    raised: '$312,000',
    goal: '$400,000',
    pct: 78,
  },
  {
    company: 'Meridian Home Care',
    market: 'contracted in-home care visits',
    rate: '10.5%',
    terms: '$180,000 · 24 months · monthly',
    backing: 'Two-year managed-care contract for in-home visits',
    curator: 'Atlas Credit Review',
    rank: 100,
    tx: '5d0c93fa17…e8a264',
    raised: '$54,000',
    goal: '$180,000',
    pct: 30,
  },
];

const INTERVAL_MS = 5000;
/** The lift-away is fully transparent 40% into its 900ms run; the sheet's contents hide then. */
const LIFT_MS = 360;

/** Resting positions in the stack: front sheet, then two sheets peeking out underneath. */
const STACK: CSSProperties[] = [
  { transform: 'translateY(0) scale(1)', zIndex: 30 },
  { transform: 'translateY(12px) scale(0.955)', zIndex: 20 },
  { transform: 'translateY(24px) scale(0.91)', zIndex: 10 },
];

function SheetRow({ label, refN, children }: { label: string; refN?: number; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-line py-2.5 text-[14px] last:border-b-0 sm:grid-cols-[7.5rem_1fr_auto] sm:items-baseline">
      <dt className="label col-start-1">{label}</dt>
      <dd className="col-start-1 sm:col-start-2 sm:row-start-1">{children}</dd>
      <span className="col-start-2 row-span-2 row-start-1 self-center sm:col-start-3 sm:row-span-1">{refN && <NoteRef n={refN} />}</span>
    </div>
  );
}

function TermSheet({ bond, front, visible }: { bond: ExampleBond; front: boolean; visible: boolean }) {
  return (
    <div className={`flex h-full flex-col transition-opacity ${visible ? 'opacity-100 duration-300' : 'opacity-0 duration-0'}`}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
        <p className="text-[13px] font-medium text-ink-2">Term sheet</p>
        <span className="rounded-[4px] bg-ink/[0.05] px-1.5 py-0.5 text-[11px] font-medium text-muted">Example</span>
      </div>
      <div className="flex-1 px-4 pt-4 pb-1 sm:px-6 sm:pt-5 sm:pb-2">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.01em]">{bond.company}</p>
            <p className="text-[13px] text-muted">Healthcare · {bond.market}</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="block text-[40px] leading-none font-medium tracking-[-0.035em] sm:text-[48px]">{bond.rate}</span>
            <span className="mt-1 block text-[12px] text-muted">fixed annual</span>
          </p>
        </div>
        <dl className="mt-4 border-t border-line sm:mt-5">
          <SheetRow label="Raise">{bond.terms}</SheetRow>
          <SheetRow label="Backing" refN={1}>{bond.backing}</SheetRow>
          <SheetRow label="Curator" refN={2}>
            {bond.curator} <span className="text-muted">· Rank {bond.rank}</span>
          </SheetRow>
          <SheetRow label="Chain record" refN={3}>
            <span className="font-mono text-[12px] text-ink-2">tx {bond.tx}</span>
          </SheetRow>
        </dl>
      </div>
      <div className="grid gap-2 border-t border-line bg-fill/60 px-4 py-3.5 sm:px-6 sm:py-4">
        {/* Behind the front sheet the bar sits empty, so it fills each time a sheet comes forward. */}
        <ProgressBar pct={front ? bond.pct : 0} label={`Example funding progress, ${bond.company}`} />
        <p className="flex justify-between text-[13px] text-muted">
          <span><span className="font-medium text-ink">{bond.raised}</span> of {bond.goal} raised</span>
          <span className="font-medium text-ink">{bond.pct}%</span>
        </p>
      </div>
    </div>
  );
}

export function TermSheetDeck() {
  const count = BONDS.length;
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [lifting, setLifting] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    setReady(true);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (lifting === null) return;
    const timer = window.setTimeout(() => setLifting(null), LIFT_MS);
    return () => window.clearTimeout(timer);
  }, [lifting]);

  // Hovering holds the current sheet so it can be read; reduced motion keeps the first sheet still.
  const running = ready && !held && !reducedMotion;

  useEffect(() => {
    if (!running) return;
    // The front sheet lifts away to the back and the next one comes forward.
    const timer = window.setTimeout(() => {
      setLeaving(active);
      setLifting(active);
      setActive((active + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [running, active, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Example bonds"
      className="w-full pb-6"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <div className="grid [&>*]:[grid-area:1/1]">
        {BONDS.map((bond, index) => {
          const position = (index - active + count) % count;
          const front = position === 0;
          return (
            <div
              key={bond.company}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              aria-hidden={!front}
              inert={!front}
              onAnimationEnd={(event) => event.animationName === 'deck-leave' && setLeaving(null)}
              className={`origin-bottom rounded-[8px] bg-surface text-left transition-[transform,box-shadow] duration-700 ease-[var(--ease-out-expo)] ${
                front ? 'shadow-float' : 'shadow-[0_0_0_1px_oklch(0.2_0.008_255/0.08),0_1px_2px_oklch(0.2_0.008_255/0.05)]'
              } ${leaving === index ? 'deck-leave' : ''}`}
              style={STACK[position]}
            >
              <TermSheet bond={bond} front={front} visible={front || lifting === index} />
            </div>
          );
        })}
      </div>

    </section>
  );
}
