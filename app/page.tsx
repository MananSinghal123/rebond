import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { TermSheetDeck } from '@/components/term-sheet-deck';
import { ButtonLink, NoteRef } from '@/components/ui';
import { entryPath } from '@/lib/auth/edge';
import { getSession } from '@/lib/auth/session';

const STEPS = [
  { name: 'Apply', body: 'A company with contracted revenue proposes a bond: amount, fixed rate, term and payout schedule.' },
  { name: 'Curate', body: 'An independent curator reviews the contracts, puts their name on the bond and sets their fee.' },
  { name: 'Fund', body: 'Investors compare listed bonds by yield, term and curator rating, and fund the ones they choose.' },
  { name: 'Settle', body: 'Distributions are paid on schedule and principal returns at maturity, each recorded on Cardano.' },
];

const AUDIENCES = [
  { name: 'Companies', body: 'Raise at a fixed rate and term against revenue you have already contracted.' },
  { name: 'Curators', body: 'Vet applications, earn a fee, and build a public ranking from how your bonds perform.' },
  { name: 'Investors', body: 'Fund fixed-return bonds and track every position and payout to maturity.' },
];

const PROOFS: { claim: string; body: string; proof: ReactNode }[] = [
  {
    claim: 'Yield with a source.',
    body: 'Every bond names the contracts that pay it, so investors see what stands behind the coupon.',
    proof: (
      <>
        <span className="label block">Backing contracts</span>
        <span className="mt-1 block">Three-year capitation contract with a regional health plan, paid monthly.</span>
      </>
    ),
  },
  {
    claim: 'A name on every bond.',
    body: 'Curators vet each application and earn a public rank from how their bonds actually pay.',
    proof: (
      <span className="flex items-end justify-between gap-4">
        <span>
          <span className="label block">Curator</span>
          <span className="mt-1 block font-medium">Atlas Credit Review</span>
        </span>
        <span className="text-right">
          <span className="label block">On time</span>
          <span className="mt-1 block font-medium">100%</span>
        </span>
      </span>
    ),
  },
  {
    claim: 'A record of every step.',
    body: 'Listing, funding, each distribution and maturity leave a chain record anyone can trace.',
    proof: (
      <>
        <span className="label block">Distribution paid</span>
        <span className="mt-1 block font-mono text-[12px]">tx 3f9a51c2e0…b17d42</span>
      </>
    ),
  },
];

/** Offsets siblings that enter the viewport together (see the landing motion block in globals.css). */
const stagger = (n: number) => ({ '--stagger': n }) as CSSProperties;

const SECTION_TITLE = 'text-[30px] leading-[1.15] font-semibold tracking-[-0.025em] md:text-[40px]';

export default async function LandingPage() {
  const appHref = entryPath(await getSession());
  return (
    <main>
      <div aria-hidden className="page-progress fixed inset-x-0 top-0 z-[60] h-0.5 bg-accent" />
      <section className="mx-auto grid max-w-[1120px] items-center gap-10 sm:gap-12 px-4 pt-10 pb-14 sm:px-5 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28 lg:grid-cols-[1fr_29rem] lg:gap-16">
        <div className="hero-recede grid max-w-xl justify-items-start gap-6">
          <h1 className="rise-in text-[44px] leading-[1.04] font-semibold tracking-[-0.035em] md:text-[64px]">Real yield from real contracts.</h1>
          <p className="rise-in text-[18px] leading-relaxed text-ink-2" style={stagger(1)}>
            Fixed-return bonds backed by contracted revenue. Curated by people with their name on the line, and recorded on Cardano.
          </p>
          <div className="rise-in flex flex-wrap gap-3 pt-1" style={stagger(2)}>
            <ButtonLink href={appHref} className="flex-1 sm:h-10 sm:flex-none sm:px-4 sm:text-[15px]">Open the app</ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary" className="flex-1 sm:h-10 sm:flex-none sm:px-4 sm:text-[15px]">See how it works</ButtonLink>
          </div>
        </div>
        <div className="hero-drift">
          <div className="rise-in" style={stagger(3)}>
            <TermSheetDeck />
          </div>
        </div>
      </section>

      <section data-reveal="rule" className="band rule-draw border-t border-line bg-surface py-14 sm:py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:gap-16">
            <h2 data-reveal="up" className={SECTION_TITLE}>Credit for revenue that is already signed.</h2>
            <p data-reveal="up" className="self-end text-[17px] leading-relaxed text-ink-2">
              Companies with recurring contracts still wait on credit priced as if that revenue were uncertain. ReBond turns those contracts into
              fixed-return bonds that investors can read end to end.
            </p>
          </div>
          <div data-reveal="rule" className="rule-draw mt-10 grid border-t border-line sm:mt-14 md:grid-cols-3">
            {PROOFS.map((item, index) => (
              <div key={item.claim} data-reveal="up" className="grid content-start gap-3 border-b border-line py-6 last:border-b-0 sm:py-8 md:border-b-0 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0">
                <div className="flex items-center gap-2.5">
                  <NoteRef n={index + 1} />
                  <h3 className="text-[18px] font-semibold tracking-[-0.015em]">{item.claim}</h3>
                </div>
                <p className="text-ink-2">{item.body}</p>
                <p className="mt-3 rounded-[6px] border border-line bg-paper px-4 py-3 text-[14px]">{item.proof}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" data-reveal="rule" className="rule-draw scroll-mt-16 border-t border-line py-14 sm:py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-5">
          <h2 data-reveal="up" className={SECTION_TITLE}>How it works.</h2>
          <ol className="mt-8 grid gap-8 sm:mt-12 sm:grid-cols-2 sm:gap-10 md:grid-cols-4 md:gap-8">
            {STEPS.map((step, index) => (
              <li
                key={step.name}
                data-reveal="rule"
                className="rule-draw grid content-start gap-2.5 border-t border-line-strong pt-5 [--rule-color:var(--color-line-strong)] first:border-t-2 first:pt-[19px] first:[--rule-color:var(--color-accent)] first:[--rule-w:2px]"
              >
                <div data-reveal="up" className="grid gap-2.5">
                  <span className="font-mono text-[12px] text-muted">Step {index + 1}</span>
                  <h3 className="text-[20px] font-semibold tracking-[-0.015em]">{step.name}</h3>
                  <p className="text-ink-2">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section data-reveal="rule" className="band rule-draw border-t border-line bg-surface py-14 sm:py-20 md:py-24">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-4 sm:gap-10 sm:px-5 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <h2 data-reveal="up" className={SECTION_TITLE}>Who it&apos;s for.</h2>
          <dl data-reveal="rule" className="rule-draw border-t border-line">
            {AUDIENCES.map((audience) => (
              <div key={audience.name} data-reveal="up" className="grid gap-1 border-b border-line py-5 sm:grid-cols-[9rem_1fr] sm:gap-6 sm:py-6">
                <dt className="text-[17px] font-semibold tracking-[-0.01em]">{audience.name}</dt>
                <dd className="text-[16px] text-ink-2">{audience.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section data-reveal="rule" className="rule-draw border-t border-line py-14 sm:py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-5">
          <h2 data-reveal="up" className={SECTION_TITLE}>Markets.</h2>
          <div data-reveal="up" className="mt-8 grid gap-px sm:mt-10 overflow-hidden rounded-[8px] border border-line bg-line md:grid-cols-2">
            <div className="bg-surface p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[20px] font-semibold tracking-[-0.015em]">Healthcare</h3>
                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-[4px] bg-accent/[0.08] px-2 text-[12px] font-medium text-accent">
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  Live first
                </span>
              </div>
              <p className="mt-2 text-ink-2">Bonds backed by contracted health-plan premiums.</p>
            </div>
            <div className="bg-paper p-5 sm:p-7">
              <h3 className="text-[20px] font-semibold tracking-[-0.015em] text-muted">More contract-backed markets</h3>
              <p className="mt-2 text-muted">Coming after Healthcare.</p>
            </div>
          </div>
        </div>
      </section>

      <footer data-reveal="rule" className="rule-draw border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 px-4 py-3 text-[13px] text-muted sm:px-5 sm:py-6">
          <span className="font-medium text-ink-2">© ReBond</span>
          <Link href="/privacy" className="py-3 hover:text-ink sm:py-0">Privacy</Link>
          <a href="https://rebond.site" className="py-3 hover:text-ink sm:py-0">Contact</a>
        </div>
      </footer>
    </main>
  );
}
