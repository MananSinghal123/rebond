import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { CashFlow } from '@/components/landing/cash-flow';
import { EXAMPLE_BONDS, exampleFigures, TICKET_CENTS } from '@/components/landing/examples';
import { HeroNetwork } from '@/components/landing/hero-network';
import { TermSheetDeck } from '@/components/term-sheet-deck';
import { ArrowIcon, ButtonLink, FREQUENCY_LABEL, NoteRef, ProgressBar } from '@/components/ui';
import { entryPath } from '@/lib/auth/edge';
import { getSession } from '@/lib/auth/session';
import { expectedReturnCents, formatUsd, MIN_TICKET_CENTS } from '@/lib/domain/money';

/** Offsets siblings in the hero entrance (see .rise-in in globals.css). */
const stagger = (n: number) => ({ '--stagger': n }) as CSSProperties;

const SECTION_TITLE = 'text-[30px] leading-[1.12] font-semibold tracking-[-0.025em] md:text-[40px]';
const PROSE = 'text-[17px] leading-relaxed text-ink-2';
const CONTAINER = 'mx-auto max-w-[1120px] px-4 sm:px-5';
const SECTION_Y = 'py-12 sm:py-20 md:py-28';

/* ── Hero ─────────────────────────────────────────────────────────────── */

const CLAIMS = [
  { title: 'Backed by signed contracts', body: 'Each bond names the contracts whose payments fund it.' },
  { title: 'Vetted by a named curator', body: 'Curators earn a public rank from how their bonds actually pay.' },
  { title: 'Recorded at every step', body: 'Listing, funding and each payout leave a chain record. Simulated in this demo.' },
];

/* ── Problem ──────────────────────────────────────────────────────────── */

const COMPARISON = [
  { topic: 'What gets underwritten', today: 'The company’s balance sheet and history', rebond: 'The signed contracts that generate the revenue' },
  { topic: 'How the rate is set', today: 'Negotiated privately with one lender', rebond: 'Fixed at listing and visible to every investor' },
  { topic: 'Who vouches for it', today: 'The lender’s internal credit team', rebond: 'A named curator with a public, performance-based rank' },
  { topic: 'What investors can see', today: 'Little beyond the headline rate', rebond: 'Terms, backing and every distribution, on record' },
];

/* ── Journey ──────────────────────────────────────────────────────────── */

const EXAMPLE = EXAMPLE_BONDS[0];
const EXAMPLE_TOTAL = formatUsd(TICKET_CENTS + expectedReturnCents(TICKET_CENTS, EXAMPLE.rateBps, EXAMPLE.termMonths));
const EXAMPLE_COUPON = formatUsd(expectedReturnCents(TICKET_CENTS, EXAMPLE.rateBps, 3));

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-6 items-center rounded-[4px] border border-line-strong bg-surface px-2 text-[12px] font-medium text-ink-2">{children}</span>;
}

function FragmentRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 text-[13px] last:border-b-0">
      <span className="label">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

const STEPS: { name: string; body: string; fragment: ReactNode }[] = [
  {
    name: 'Discover',
    body: 'Compare listed bonds by yield, term, payout frequency and curator rank.',
    fragment: (
      <div className="flex flex-wrap gap-1.5">
        <Chip>Yield ≥ 9%</Chip>
        <Chip>12–24 months</Chip>
        <Chip>Quarterly</Chip>
        <Chip>Sort: highest yield</Chip>
      </div>
    ),
  },
  {
    name: 'Inspect',
    body: 'Read the backing contracts, the curator’s note and the full distribution schedule.',
    fragment: (
      <div>
        <FragmentRow label="Backing">Capitation contract <NoteRef n={1} /></FragmentRow>
        <FragmentRow label="Curator">Rank {EXAMPLE.rank} <NoteRef n={2} /></FragmentRow>
      </div>
    ),
  },
  {
    name: 'Invest',
    body: `Choose any amount from ${formatUsd(MIN_TICKET_CENTS)}. You see the total at maturity before anything is recorded.`,
    fragment: (
      <div>
        <FragmentRow label="You invest">{formatUsd(TICKET_CENTS)}</FragmentRow>
        <FragmentRow label="At maturity"><span className="text-accent">{EXAMPLE_TOTAL}</span></FragmentRow>
      </div>
    ),
  },
  {
    name: 'Track',
    body: 'Follow each distribution in your portfolio, with the chain record that settled it.',
    fragment: (
      <div className="text-[13px]">
        {[
          ['01', 'Paid', 'bg-accent'],
          ['02', 'Scheduled', 'bg-ink/20'],
        ].map(([seq, status, dot]) => (
          <div key={seq} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
            <span className="flex items-center gap-2.5">
              <span className="font-mono text-[12px] text-muted">{seq}</span>
              <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
              {status}
            </span>
            <span className="font-medium">{EXAMPLE_COUPON}</span>
          </div>
        ))}
      </div>
    ),
  },
];

/* ── Trust ────────────────────────────────────────────────────────────── */

function ExampleTag() {
  return <span className="rounded-[4px] border border-line-strong px-1.5 py-px text-[11px] font-medium tracking-[0.02em] text-ink-2">Example</span>;
}

function Exhibit({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div data-reveal="up" className="grid gap-3.5 border-b border-line py-6 first:pt-0 last:border-b-0 last:pb-0 sm:gap-5 sm:py-10 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
      <div className="grid content-start gap-1.5 sm:gap-2">
        <h3 className="text-[17px] font-semibold tracking-[-0.015em] sm:text-[18px]">{title}</h3>
        <p className="text-[14px] text-ink-2 sm:text-[15px]">{body}</p>
      </div>
      <div className="min-w-0 rounded-[8px] border border-line bg-surface">{children}</div>
    </div>
  );
}

function ExhibitHead({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 sm:px-5">
      <span className="text-[13px] font-semibold">{children}</span>
      <ExampleTag />
    </div>
  );
}

const CHAIN = [
  { event: 'Listed', tx: '9c47a2e1b3…f0d218' },
  { event: 'Position opened', tx: 'a61f08c9d2…4be370' },
  { event: 'Distribution paid', tx: '3f9a51c2e0…b17d42' },
];

const SIMULATED = [
  'No real money moves. Every amount is demo data.',
  'Chain records are generated by the demo, not written to Cardano.',
  'Contracts are summarized by the company and reviewed by the curator. ReBond does not audit them.',
];

/* ── Closing ──────────────────────────────────────────────────────────── */

const AUDIENCES = [
  { name: 'Investors', body: 'Fund fixed-return bonds and track every position and payout to maturity.' },
  { name: 'Companies', body: 'Raise at a fixed rate and term against revenue you have already contracted.' },
  { name: 'Curators', body: 'Vet applications, earn a fee, and build a public rank from how your bonds perform.' },
];

export default async function LandingPage() {
  const appHref = entryPath(await getSession());
  return (
    <main>
      <div aria-hidden className="page-progress fixed inset-x-0 top-0 z-[60] h-0.5 bg-accent" />

      {/* Hero. Phones read headline → term sheet → claims; from lg the claims are wired to the sheet. */}
      <section aria-labelledby="hero-title">
        <div className={`${CONTAINER} relative grid gap-8 pt-8 pb-12 sm:gap-12 sm:pt-16 sm:pb-20 md:pt-20 md:pb-24 lg:grid-cols-[minmax(0,1fr)_29rem] lg:gap-x-24 lg:gap-y-12`}>
          <HeroNetwork />
          <div className="relative grid max-w-xl justify-items-start gap-6 lg:self-end">
            <h1 id="hero-title" className="rise-in text-[42px] leading-[1.03] font-semibold tracking-[-0.035em] min-[400px]:text-[46px] md:text-[64px]">
              Real yield from real contracts.
            </h1>
            <p className={`rise-in max-w-[34rem] text-[18px] leading-relaxed text-ink-2`} style={stagger(1)}>
              Fixed-return bonds backed by contracted revenue. Curated by people with their name on the line, and recorded on Cardano.
            </p>
            <div className="rise-in flex flex-wrap items-center gap-x-4 gap-y-3 pt-1 min-[360px]:gap-x-5 sm:gap-x-6" style={stagger(2)}>
              <ButtonLink href={appHref} className="px-4 min-[360px]:px-5 sm:h-11 sm:px-5 sm:text-[15px]">
                Open the app
              </ButtonLink>
              <a href="#how-it-works" className="arrow-link inline-flex h-11 items-center gap-1.5 text-[15px] font-medium text-ink-2 transition-colors duration-150 hover:text-ink">
                See how it works
                <ArrowIcon />
              </a>
            </div>
          </div>

          <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <div className="rise-in" style={stagger(3)}>
              <TermSheetDeck />
            </div>
          </div>

          <ol aria-label="What stands behind every bond" className="rise-in relative grid border-t border-line lg:col-start-1 lg:row-start-2" style={stagger(2)}>
            {CLAIMS.map((claim, index) => (
              <li key={claim.title} className="grid gap-0.5 border-b border-line py-3 sm:gap-1 sm:py-3.5">
                <div className="flex items-center gap-3">
                  <NoteRef n={index + 1} />
                  <p className="text-[15px] font-semibold tracking-[-0.005em]">{claim.title}</p>
                  <span aria-hidden data-net-from={index + 1} className="hidden h-px flex-1 bg-line lg:block" />
                </div>
                <p className="pl-[30px] text-[13px] text-ink-2 sm:text-[14px]">{claim.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Problem */}
      <section aria-labelledby="problem-title" data-reveal="rule" className={`band rule-draw border-t border-line bg-surface ${SECTION_Y}`}>
        <div className={CONTAINER}>
          <div className="grid gap-5 md:grid-cols-2 md:gap-16">
            <h2 id="problem-title" data-reveal="up" className={SECTION_TITLE}>Signed revenue, priced as if it were a guess.</h2>
            <p data-reveal="up" className={`${PROSE} self-end`}>
              A provider with a multi-year health-plan contract knows what it will be paid. Its credit is still priced on the balance sheet, and the
              investors who could fund it never see the contracts at all.
            </p>
          </div>

          <div data-reveal="up" className="mt-8 overflow-hidden rounded-[8px] border border-line md:hidden">
            <p className="grid grid-cols-2 gap-4 border-b border-line bg-fill/60 px-4 py-2.5">
              <span className="label">Conventional</span>
              <span className="text-[11px] font-semibold tracking-[0.06em] text-accent uppercase">A ReBond bond</span>
            </p>
            <dl>
              {COMPARISON.map((row) => (
                <div key={row.topic} className="border-b border-line px-4 py-3 last:border-b-0">
                  <dt className="text-[14px] font-semibold">{row.topic}</dt>
                  <dd className="mt-1 grid grid-cols-2 gap-4 text-[14px] leading-snug">
                    <span className="text-muted">{row.today}</span>
                    <span className="font-medium">{row.rebond}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <table data-reveal="up" className="mt-14 w-full border-collapse text-left text-[15px] max-md:hidden">
            <caption className="sr-only">Conventional credit compared with a ReBond bond</caption>
            <thead>
              <tr>
                <th className="label w-[24%] border-b border-line-strong pb-3 font-medium">&nbsp;</th>
                <th className="label w-[38%] border-b border-line-strong pr-8 pb-3 font-medium">Conventional credit</th>
                <th className="w-[38%] border-b-2 border-accent pb-3 text-[11px] font-semibold tracking-[0.06em] text-accent uppercase">A ReBond bond</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.topic}>
                  <th scope="row" className="border-b border-line py-4 pr-6 align-top text-[15px] font-semibold">
                    {row.topic}
                  </th>
                  <td className="border-b border-line py-4 pr-8 align-top text-muted">{row.today}
                  </td>
                  <td className="border-b border-line py-4 align-top font-medium">{row.rebond}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Solution */}
      <section aria-labelledby="solution-title" data-reveal="rule" className={`rule-draw border-t border-line ${SECTION_Y}`}>
        <div className={`${CONTAINER} grid items-center gap-8 md:gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20`}>
          <div className="grid content-start gap-5">
            <h2 id="solution-title" data-reveal="up" className={SECTION_TITLE}>A fixed coupon, traced to the contract that pays it.</h2>
            <p data-reveal="up" className={PROSE}>
              Each bond turns part of a company’s contracted revenue into a fixed-rate instrument with a published schedule. You know every payment
              before you invest.
            </p>
            <dl data-reveal="stagger" className="mt-2 grid border-t border-line">
              {[
                ['Rate', 'Fixed at listing. It never floats or resets.'],
                ['Schedule', 'Monthly, quarterly or at maturity, set before funding.'],
                ['Principal', 'Returned with the final distribution.'],
              ].map(([term, detail]) => (
                <div key={term} className="grid grid-cols-[5.5rem_1fr] gap-3 border-b border-line py-3 sm:grid-cols-[6.5rem_1fr] sm:gap-4 sm:py-3.5">
                  <dt className="label pt-0.5">{term}</dt>
                  <dd className="text-[14px] sm:text-[15px]">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div data-reveal="up" className="parallax min-w-0 [--parallax:20px]">
            <CashFlow />
          </div>
        </div>
      </section>

      {/* How it works: the investor's path, on a rail that fills as it scrolls through. */}
      <section id="how-it-works" aria-labelledby="how-title" data-reveal="rule" className={`band rule-draw scroll-mt-16 border-t border-line bg-surface ${SECTION_Y}`}>
        <div className={CONTAINER}>
          <div className="grid gap-4 md:grid-cols-2 md:gap-16">
            <h2 id="how-title" data-reveal="up" className={SECTION_TITLE}>From listing to last payout.</h2>
            <p data-reveal="up" className={`${PROSE} self-end`}>
              Before a bond reaches you, a company has applied with its contracts and a curator has reviewed them and put their name on it.
            </p>
          </div>

          <ol className="relative mt-8 grid gap-7 sm:mt-14 sm:gap-9 lg:grid-cols-4 lg:gap-8">
            <span aria-hidden className="absolute top-2 bottom-2 left-[4px] w-px bg-line-strong lg:hidden" />
            <span aria-hidden className="rail-fill-y absolute top-2 bottom-2 left-[4px] w-px bg-accent lg:hidden" />
            <span aria-hidden className="absolute top-[4px] right-0 left-0 hidden h-px bg-line-strong lg:block" />
            <span aria-hidden className="rail-fill absolute top-[4px] right-0 left-0 hidden h-px bg-accent lg:block" />
            {STEPS.map((step, index) => (
              <li key={step.name} data-reveal="up" className="relative grid content-start gap-2 pl-7 sm:gap-2.5 sm:pl-8 lg:pt-8 lg:pl-0">
                <span aria-hidden className="absolute top-[5px] left-0 size-[9px] rounded-full border border-accent bg-surface lg:top-0 [li:first-child>&]:bg-accent" />
                <div className="flex items-baseline justify-between gap-3 lg:flex-col-reverse lg:gap-2.5">
                  <h3 className="text-[18px] font-semibold tracking-[-0.015em] sm:text-[20px]">{step.name}</h3>
                  <span className="font-mono text-[12px] text-muted">Step {index + 1}</span>
                </div>
                <p className="text-[14px] text-ink-2 sm:text-[15px]">{step.body}</p>
                <div className="mt-1 rounded-[6px] border border-line bg-paper px-3 py-2.5 sm:mt-2 sm:px-3.5 sm:py-3">{step.fragment}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust and verification */}
      <section id="trust" aria-labelledby="trust-title" data-reveal="rule" className={`rule-draw scroll-mt-16 border-t border-line ${SECTION_Y}`}>
        <div className={`${CONTAINER} grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20`}>
          <div className="grid content-start gap-5 lg:sticky lg:top-28 lg:self-start">
            <h2 id="trust-title" data-reveal="up" className={SECTION_TITLE}>Every claim has a line behind it.</h2>
            <p data-reveal="up" className={PROSE}>
              Who reviewed the bond, what pays it, what it promises and what has happened since. All of it is on the bond’s page before you fund.
            </p>
            <div data-reveal="up" className="mt-2 rounded-[8px] border border-warn/25 bg-warn/[0.05] p-4">
              <p className="text-[13px] font-semibold text-warn">What is simulated in this demo</p>
              <ul className="mt-2 grid gap-1.5 text-[14px] text-ink-2">
                {SIMULATED.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-warn" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <Exhibit title="Curator credentials" body="A named reviewer stands behind each listing. Their rank is computed from how the bonds they approved have paid.">
              <ExhibitHead>Curator</ExhibitHead>
              <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[16px] font-semibold tracking-[-0.01em]">{EXAMPLE.curator}</p>
                  <p className="text-[13px] text-muted">Independent curator · Healthcare</p>
                </div>
                <p className="text-right">
                  <span className="label block">Rank</span>
                  <span className="text-[32px] leading-none font-medium tracking-[-0.03em]">{EXAMPLE.rank}</span>
                </p>
              </div>
              <dl className="grid grid-cols-2 border-t border-line text-[14px]">
                <div className="border-r border-line px-4 py-3 sm:px-5">
                  <dt className="label">Bonds curated</dt>
                  <dd className="mt-0.5 font-medium">2</dd>
                </div>
                <div className="px-4 py-3 sm:px-5">
                  <dt className="label">On time</dt>
                  <dd className="mt-0.5 font-medium">100%</dd>
                </div>
              </dl>
            </Exhibit>

            <Exhibit title="Contract documentation" body="The company describes the contracts behind the bond, and the curator checks them before approving the listing.">
              <ExhibitHead>Backing contracts</ExhibitHead>
              <div className="grid gap-3 px-4 py-4 text-[14px] sm:px-5">
                <p>{EXAMPLE.backing}. Premiums are paid on the first business day of each month.</p>
                <p className="border-l border-line-strong pl-3.5 text-ink-2">“Payer concentration is high, but the contract runs well past the bond’s maturity.”</p>
              </div>
            </Exhibit>

            <Exhibit title="Transparent terms" body="Rate, raise, term, payout schedule and the curator’s fee are fixed and shown in full. Nothing changes after funding.">
              <ExhibitHead>Terms</ExhibitHead>
              <dl className="grid grid-cols-2 px-4 py-2 sm:grid-cols-3 sm:px-5">
                {[
                  ['Fixed annual rate', exampleFigures(EXAMPLE).rate],
                  ['Raise', exampleFigures(EXAMPLE).raise],
                  ['Term', `${EXAMPLE.termMonths} months`],
                  ['Payouts', FREQUENCY_LABEL[EXAMPLE.frequency]],
                  ['Curator fee', '1%'],
                  ['Maturity', 'Set when funded'],
                ].map(([label, value]) => (
                  <div key={label} className="py-2.5 pr-3">
                    <dt className="label">{label}</dt>
                    <dd className="mt-0.5 text-[15px] font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Exhibit>

            <Exhibit title="On-chain records" body="Listing, each investment, every distribution and maturity produce a record with a transaction hash anyone can trace.">
              <ExhibitHead>Chain record</ExhibitHead>
              <ol className="px-4 py-1 sm:px-5">
                {CHAIN.map((row) => (
                  <li key={row.event} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-line py-2.5 last:border-b-0">
                    <span className="text-[14px] font-medium">{row.event}</span>
                    <span className="font-mono text-[12px] text-ink-2">tx {row.tx}</span>
                  </li>
                ))}
              </ol>
              <p className="border-t border-line bg-fill/70 px-4 py-2.5 text-[12px] text-muted sm:px-5">Simulated records: not written to a real network.</p>
            </Exhibit>
          </div>
        </div>
      </section>

      {/* Markets and example opportunities */}
      <section id="markets" aria-labelledby="markets-title" data-reveal="rule" className={`band rule-draw scroll-mt-16 border-t border-line bg-surface ${SECTION_Y}`}>
        <div className={CONTAINER}>
          <div className="grid gap-5 md:grid-cols-2 md:gap-16">
            <h2 id="markets-title" data-reveal="up" className={SECTION_TITLE}>Healthcare first.</h2>
            <div data-reveal="up" className="grid gap-4 self-end">
              <p className={PROSE}>
                Providers are paid by health plans under multi-year contracts on fixed schedules: revenue that is signed, recurring and documented.
                Other contract-backed markets follow.
              </p>
              <p className="flex flex-wrap gap-2">
                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-[4px] bg-accent/[0.08] px-2 text-[12px] font-medium text-accent">
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  Healthcare · live in demo
                </span>
                <span className="inline-flex h-[22px] items-center rounded-[4px] bg-ink/[0.05] px-2 text-[12px] font-medium text-ink-2">More markets next</span>
              </p>
            </div>
          </div>

          <div data-reveal="up" className="mt-10 rounded-[8px] border border-line sm:mt-14">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
              <p className="text-[14px] font-semibold">Example opportunities</p>
              <p className="flex items-center gap-2.5 text-[13px] text-muted">
                <span className="max-sm:hidden">Illustrative, built from the demo’s fictional companies</span>
                <ExampleTag />
              </p>
            </div>
            {/* Phones: one compact record per bond, yield opposite the issuer. */}
            <ul data-reveal="stagger" className="px-4 sm:hidden">
              {EXAMPLE_BONDS.map((bond) => {
                const figures = exampleFigures(bond);
                return (
                  <li key={bond.company} className="grid gap-2 border-b border-line py-3.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className="min-w-0">
                        <span className="block text-[15px] font-medium">{bond.company}</span>
                        <span className="block text-[13px] text-muted">{bond.market}</span>
                      </p>
                      <p className="shrink-0 text-[26px] leading-none font-medium tracking-[-0.025em]">{figures.rate}</p>
                    </div>
                    <p className="text-[13px] text-ink-2">
                      {bond.termMonths} mo · {FREQUENCY_LABEL[bond.frequency]} · {bond.curator} <span className="text-muted">· {bond.rank}</span>
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="flex-1">
                        <ProgressBar pct={figures.pct} label={`Example funding progress, ${bond.company}`} />
                      </span>
                      <span className="text-[13px] text-muted"><span className="font-medium text-ink">{figures.pct}%</span> funded</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="px-6 py-2 max-sm:hidden">
              <table className="w-full text-left text-[14px]">
                <caption className="sr-only">Example bonds</caption>
                <thead>
                  <tr>
                    <th className="label py-3 pr-4 font-medium">Issuer</th>
                    <th className="label py-3 pr-4 text-right font-medium">Yield</th>
                    <th className="label py-3 pr-4 text-right font-medium">Term</th>
                    <th className="label py-3 pr-4 font-medium">Payouts</th>
                    <th className="label py-3 pr-4 font-medium">Curator</th>
                    <th className="label w-[22%] py-3 font-medium">Funded</th>
                  </tr>
                </thead>
                <tbody data-reveal="stagger">
                  {EXAMPLE_BONDS.map((bond) => {
                    const figures = exampleFigures(bond);
                    return (
                      <tr key={bond.company} className="border-t border-line">
                        <td className="py-3.5 pr-4">
                          <span className="block font-medium">{bond.company}</span>
                          <span className="block text-[13px] font-normal text-muted">{bond.market}</span>
                        </td>
                        <td className="py-3.5 pr-4 text-right text-[20px] leading-none font-medium tracking-[-0.02em]">{figures.rate}</td>
                        <td className="py-3.5 pr-4 text-right">{bond.termMonths} mo</td>
                        <td className="py-3.5 pr-4">{FREQUENCY_LABEL[bond.frequency]}</td>
                        <td className="py-3.5 pr-4">
                          {bond.curator} <span className="text-muted">· {bond.rank}</span>
                        </td>
                        <td className="py-3.5">
                          <span className="flex items-center gap-3">
                            <span className="w-full max-w-28 min-w-16">
                              <ProgressBar pct={figures.pct} label={`Example funding progress, ${bond.company}`} />
                            </span>
                            <span className="w-9 text-right font-medium">{figures.pct}%</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-fill/60 px-4 py-3 text-[13px] text-muted sm:px-6">
              <span><span className="sm:hidden">Illustrative examples. </span>Listed bonds, with live funding, are in the app.</span>
              <Link href={appHref} className="arrow-link inline-flex min-h-11 items-center gap-1.5 font-medium text-accent hover:text-accent-hover sm:min-h-0">
                See listed bonds
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="closing-title" className="bg-night text-paper">
        <div className={`${CONTAINER} grid gap-10 py-14 sm:gap-12 sm:py-20 md:py-28 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-20`}>
          <div className="grid content-start justify-items-start gap-6">
            <h2 id="closing-title" data-reveal="up" className={`${SECTION_TITLE} text-paper`}>Read the contract before you fund the bond.</h2>
            <p data-reveal="up" className="text-[17px] leading-relaxed text-paper/70">
              Browse listed bonds, inspect what backs them, and walk one from application to its final payout. Sign in with Google, a Cardano
              wallet, or email.
            </p>
            <div data-reveal="up" className="pt-1">
              <ButtonLink href={appHref} variant="inverse" className="px-5 sm:h-11 sm:px-5 sm:text-[15px]">
                Enter the demo
              </ButtonLink>
            </div>
          </div>
          <dl data-reveal="stagger" className="grid self-end border-t border-paper/15">
            {AUDIENCES.map((audience) => (
              <div key={audience.name} className="grid gap-0.5 border-b border-paper/15 py-3.5 sm:grid-cols-[8.5rem_1fr] sm:gap-6 sm:py-5">
                <dt className="text-[16px] font-semibold">{audience.name}</dt>
                <dd className="text-[14px] text-paper/70 sm:text-[15px]">{audience.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <footer className="border-t border-paper/10">
          <div className={`${CONTAINER} grid gap-3 py-5 text-[13px] text-paper/60 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:py-6`}>
            <span className="flex items-center gap-2.5 font-medium text-paper">
              <BrandMark tone="night" />
              ReBond
            </span>
            <span className="sm:mr-auto">Demo: no real funds, simulated on-chain records.</span>
            <span className="flex gap-6">
              <Link href="/privacy" className="py-2 transition-colors duration-150 hover:text-paper sm:py-0">Privacy</Link>
              <a href="https://rebond.site" className="py-2 transition-colors duration-150 hover:text-paper sm:py-0">Contact</a>
            </span>
          </div>
        </footer>
      </section>
    </main>
  );
}
