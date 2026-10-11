import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink, ProgressBar } from '@/components/ui';
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

function ExampleTag() {
  return <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] font-medium text-muted">Example</span>;
}

function ExampleBondCard() {
  return (
    <div className="mx-auto w-full max-w-md rounded-[22px] bg-surface p-7 text-left shadow-float">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[17px] font-semibold tracking-[-0.015em]">Northwind Health</p>
          <p className="text-[13px] text-muted">Healthcare · contracted health-plan premiums</p>
        </div>
        <ExampleTag />
      </div>
      <p className="mt-6 font-[family-name:var(--font-display)] text-[64px] leading-none font-semibold tracking-[-0.04em]">
        11<span className="text-[34px] tracking-[-0.02em]">%</span>
      </p>
      <p className="mt-1 text-[13px] text-muted">fixed per year · 12 months · paid quarterly</p>
      <div className="mt-6 grid gap-2">
        <ProgressBar pct={60} label="Example funding progress" />
        <p className="text-[13px] text-muted">
          <span className="font-medium text-ink">$150,000</span> of $250,000 raised
        </p>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
        Curated by <span className="font-medium text-ink">Atlas Credit Review</span> · Rank 100
      </p>
    </div>
  );
}

const PROOFS: { claim: string; body: string; proof: ReactNode }[] = [
  {
    claim: 'Yield with a source.',
    body: 'Every bond names the contracts that pay it, so investors see what stands behind the coupon.',
    proof: (
      <p className="text-[15px] leading-relaxed">
        <span className="block text-[13px] text-muted">Backing contracts</span>
        Three-year capitation contract with a regional health plan, paid monthly.
      </p>
    ),
  },
  {
    claim: 'A name on every bond.',
    body: 'Curators vet each application and earn a public rank from how their bonds actually pay.',
    proof: (
      <div className="flex items-baseline justify-between gap-4 text-[15px]">
        <span>
          <span className="block text-[13px] text-muted">Curator</span>
          <span className="font-medium">Atlas Credit Review</span>
        </span>
        <span className="text-right">
          <span className="block text-[13px] text-muted">On time</span>
          <span className="font-medium">100%</span>
        </span>
      </div>
    ),
  },
  {
    claim: 'A record of every step.',
    body: 'Listing, funding, each distribution and maturity leave a chain record anyone can trace.',
    proof: (
      <p className="text-[15px]">
        <span className="block text-[13px] text-muted">Distribution paid</span>
        <span className="font-mono text-[13px]">tx 3f9a51c2e0…b17d42</span>
      </p>
    ),
  },
];

export default async function LandingPage() {
  const appHref = entryPath(await getSession());
  return (
    <main>
      <section className="mx-auto grid max-w-[1080px] justify-items-center gap-6 px-5 pt-20 pb-24 text-center md:pt-28">
        <h1 className="rise-in max-w-3xl text-[48px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-[80px]">
          Real yield from real contracts.
        </h1>
        <p className="rise-in max-w-xl text-[19px] leading-snug text-muted [animation-delay:90ms] md:text-[21px]">
          Fixed-return bonds backed by contracted revenue. Curated by people with their name on the line, and recorded on Cardano.
        </p>
        <div className="rise-in flex flex-wrap justify-center gap-3 [animation-delay:180ms]">
          <ButtonLink href={appHref} className="h-11 px-6 text-[17px]">Open the app</ButtonLink>
          <ButtonLink href="#how-it-works" variant="secondary" className="h-11 px-6 text-[17px]">See how it works</ButtonLink>
        </div>
        <div className="hero-settle mt-12 w-full">
          <div className="rise-in [animation-delay:300ms] [animation-duration:1200ms]">
            <ExampleBondCard />
          </div>
        </div>
      </section>

      <section className="bg-surface py-24">
        <div className="mx-auto max-w-[1080px] px-5">
          <h2 className="reveal max-w-2xl text-[34px] leading-tight font-semibold tracking-[-0.025em] md:text-[48px]">
            Credit for revenue that is already signed.
          </h2>
          <p className="reveal mt-4 max-w-2xl text-[19px] text-muted">
            Companies with recurring contracts still wait on credit priced as if that revenue were uncertain. ReBond turns those contracts into
            fixed-return bonds that investors can read end to end.
          </p>
          <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
            {PROOFS.map((item, index) => (
              <div key={item.claim} className={`reveal grid content-start gap-3 ${index > 0 ? 'reveal-late' : ''}`}>
                <h3 className="text-[21px] font-semibold tracking-[-0.02em]">{item.claim}</h3>
                <p className="text-muted">{item.body}</p>
                <div className="mt-2 rounded-2xl bg-paper p-4">{item.proof}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1080px] scroll-mt-20 px-5 py-24">
        <h2 className="reveal text-[34px] font-semibold tracking-[-0.025em] md:text-[48px]">How it works.</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.name} className="draw-line grid content-start gap-3 border-t-2 border-fill pt-5 first:[--line-color:var(--color-accent)]">
              <span className="text-[13px] font-medium text-muted">Step {index + 1}</span>
              <h3 className="text-[24px] font-semibold tracking-[-0.02em]">{step.name}</h3>
              <p className="text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-surface py-24">
        <div className="mx-auto grid max-w-[1080px] gap-14 px-5 md:grid-cols-[1fr_1.4fr]">
          <h2 className="reveal text-[34px] font-semibold tracking-[-0.025em] md:text-[48px]">Who it&apos;s for.</h2>
          <dl className="grid gap-8">
            {AUDIENCES.map((audience) => (
              <div key={audience.name} className="reveal grid gap-1 border-b border-line pb-8 last:border-b-0 last:pb-0">
                <dt className="text-[21px] font-semibold tracking-[-0.02em]">{audience.name}</dt>
                <dd className="text-[17px] text-muted">{audience.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-[1080px] px-5 py-24">
        <h2 className="reveal text-[34px] font-semibold tracking-[-0.025em] md:text-[48px]">Markets.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="reveal rounded-[22px] bg-surface p-8 shadow-sheet">
            <h3 className="text-[24px] font-semibold tracking-[-0.02em]">
              Healthcare <span className="text-[15px] font-medium text-accent">· live first</span>
            </h3>
            <p className="mt-2 text-[17px] text-muted">Bonds backed by contracted health-plan premiums.</p>
          </div>
          <div className="reveal rounded-[22px] p-8 ring-1 ring-line ring-inset">
            <h3 className="text-[24px] font-semibold tracking-[-0.02em] text-muted">More contract-backed markets</h3>
            <p className="mt-2 text-[17px] text-muted">Coming after Healthcare.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap gap-6 px-5 py-8 text-[13px] text-muted">
          <span>© ReBond</span>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <a href="https://rebond.site" className="hover:text-ink">Contact</a>
        </div>
      </footer>
    </main>
  );
}
