'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { exampleFigures, EXAMPLE_BONDS as BONDS, type ExampleBond } from '@/components/landing/examples';
import { FREQUENCY_LABEL, NoteRef, ProgressBar } from '@/components/ui';

const INTERVAL_MS = 6000;
/** The lift-away is fully transparent 40% into its 900ms run; the sheet's contents hide then. */
const LIFT_MS = 360;

/** Resting positions in the stack: front sheet, then two sheets peeking out underneath. */
const STACK: CSSProperties[] = [
  { transform: 'translateY(0) scale(1)', zIndex: 30 },
  { transform: 'translateY(12px) scale(0.955)', zIndex: 20 },
  { transform: 'translateY(24px) scale(0.91)', zIndex: 10 },
];

/** A footnoted line on the sheet. `refN` ties it to the matching claim beside the deck. */
function SheetRow({ label, refN, children }: { label: string; refN: number; children: ReactNode }) {
  return (
    <div
      data-net-to={refN}
      className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-line py-2.5 text-[13.5px] leading-snug last:border-b-0 sm:grid-cols-[6.75rem_minmax(0,1fr)_auto] sm:text-[14px] sm:leading-normal"
    >
      <dt className="label pt-0.5 sm:pt-[3px]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
      <span className="sm:pt-px">
        <NoteRef n={refN} />
      </span>
    </div>
  );
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface px-2.5 py-2 sm:px-3.5 sm:py-2.5">
      <dt className="label truncate max-sm:text-[10px] max-sm:tracking-[0.04em]">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium whitespace-nowrap sm:text-[14px]">{children}</dd>
    </div>
  );
}

function TermSheet({ bond, front, visible }: { bond: ExampleBond; front: boolean; visible: boolean }) {
  const figures = exampleFigures(bond);
  return (
    <div className={`flex h-full flex-col transition-opacity ${visible ? 'opacity-100 duration-300' : 'opacity-0 duration-0'}`}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 sm:px-6">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Term sheet
          <span className="text-muted max-[359px]:hidden">· Fixed-rate bond</span>
        </p>
        <span className="rounded-[4px] border border-line-strong px-1.5 py-px text-[11px] font-medium tracking-[0.02em] text-ink-2">Example</span>
      </div>
      <div className="flex-1 px-4 pt-4 pb-1 sm:px-6 sm:pt-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 pt-1">
            <p className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">{bond.company}</p>
            <p className="mt-0.5 text-[13px] text-muted"><span className="max-sm:hidden">Healthcare · </span>{bond.market}</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="block text-[44px] leading-none font-medium tracking-[-0.035em] sm:text-[52px]">{figures.rate}</span>
            <span className="mt-1.5 block text-[12px] text-muted">fixed annual rate</span>
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden min-[360px]:grid-cols-4 rounded-[6px] border border-line bg-line sm:mt-5">
          <Term label="Raise">
            <span className="sm:hidden">{figures.raiseShort}</span>
            <span className="max-sm:hidden">{figures.raise}</span>
          </Term>
          <Term label="Term">
            {bond.termMonths} <span className="sm:hidden">mo</span>
            <span className="max-sm:hidden">months</span>
          </Term>
          <Term label="Payouts">{FREQUENCY_LABEL[bond.frequency]}</Term>
          <Term label="On $1,000">{figures.perTicket}</Term>
        </dl>
        <dl className="mt-2 sm:mt-3">
          <SheetRow label="Backing" refN={1}>
            <span className="line-clamp-2 block sm:min-h-[2lh]">{bond.backing}</span>
          </SheetRow>
          <SheetRow label="Curator" refN={2}>
            {bond.curator} <span className="whitespace-nowrap text-muted">· Rank {bond.rank}</span>
          </SheetRow>
          <SheetRow label="Chain record" refN={3}>
            <span className="font-mono text-[12px] text-ink-2">tx {bond.tx}</span>{' '}
            <span className="text-[12px] text-muted">simulated</span>
          </SheetRow>
        </dl>
      </div>
      <div className="grid gap-2 border-t border-line bg-fill/70 px-4 py-3.5 sm:px-6 sm:py-4">
        <p className="flex items-baseline justify-between gap-4 text-[13px] text-muted">
          <span className="label">Funding</span>
          <span>
            <span className="font-medium text-ink">{figures.raised}</span> of {figures.raise} · <span className="font-medium text-ink">{figures.pct}%</span>
          </span>
        </p>
        {/* Behind the front sheet the bar sits empty, so it fills each time a sheet comes forward. */}
        <ProgressBar pct={front ? figures.pct : 0} label={`Example funding progress, ${bond.company}`} />
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
              data-front={front ? '' : undefined}
              onAnimationEnd={(event) => event.animationName === 'deck-leave' && setLeaving(null)}
              className={`origin-bottom rounded-[8px] bg-surface text-left transition-[transform,box-shadow] duration-700 ease-[var(--ease-out-expo)] ${
                front ? 'shadow-lift' : 'shadow-[0_0_0_1px_oklch(0.2_0.022_258/0.08),0_1px_2px_oklch(0.2_0.022_258/0.05)]'
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
