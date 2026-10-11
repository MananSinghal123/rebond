import Link from 'next/link';
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';

const PROBLEMS = [
  {
    title: 'Contracted revenue sits idle',
    body: 'Companies with signed, recurring contracts still wait on credit priced as if that revenue were uncertain.',
  },
  {
    title: 'Yield without a source',
    body: 'Investors are offered returns with little view of what actually pays them.',
  },
  {
    title: 'No one owns the vetting',
    body: 'When a deal goes wrong there is rarely a named party whose track record shows it.',
  },
];

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

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="border-t border-line py-16">
      <h2 className="mb-8 text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <header className="flex items-center justify-between py-6">
        <span className="font-semibold tracking-tight">ReBond</span>
        <Link href="/login" className="text-sm text-muted hover:text-ink">Sign in</Link>
      </header>

      <section className="grid gap-6 py-20 md:py-28">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Real yield from real contracts.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Fixed-return bonds backed by contracted revenue. Curated by people with their name on the line, and recorded on Cardano.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/bonds">Open the app</ButtonLink>
          <ButtonLink href="#how-it-works" variant="secondary">See how it works</ButtonLink>
        </div>
      </section>

      <Section title="The problem">
        <div className="grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <div key={problem.title} className="rounded-lg border border-line bg-surface p-5">
              <h3 className="font-medium">{problem.title}</h3>
              <p className="mt-2 text-sm text-muted">{problem.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="how-it-works" title="How it works">
        <ol className="grid gap-6 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.name} className="grid content-start gap-2">
              <span className="font-mono text-xs text-muted">0{index + 1}</span>
              <h3 className="text-lg font-semibold">{step.name}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Who it's for">
        <dl className="grid gap-6 md:grid-cols-3">
          {AUDIENCES.map((role) => (
            <div key={role.name}>
              <dt className="font-medium">{role.name}</dt>
              <dd className="mt-1 text-sm text-muted">{role.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Markets">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-accent/40 bg-surface p-5">
            <h3 className="text-lg font-semibold">
              Healthcare <span className="text-sm font-normal text-accent">· live first</span>
            </h3>
            <p className="mt-2 text-sm text-muted">Bonds backed by contracted health-plan premiums.</p>
          </div>
          <div className="rounded-lg border border-dashed border-line p-5">
            <h3 className="text-lg font-semibold text-muted">More contract-backed markets</h3>
            <p className="mt-2 text-sm text-muted">Coming after Healthcare.</p>
          </div>
        </div>
      </Section>

      <footer className="flex flex-wrap gap-6 border-t border-line py-8 text-sm text-muted">
        <span>© ReBond</span>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <a href="https://rebond.site" className="hover:text-ink">Contact</a>
      </footer>
    </div>
  );
}
