# ReBond MVP: Requirements Plan (Next.js)

> Source of truth for product context: https://rebond.site
> Status: Draft v0.1, 2026-10-10

## 1. Product summary

ReBond is a marketplace for **fixed-return bonds** backed by **contracted revenue**. Each deal, term and distribution is recorded on **Cardano**.

- **Companies** that have contract-backed revenue raise capital at a fixed rate and term.
- **Curators** vet company applications, put their name on bonds and earn a fee. Each curator builds a public ranking based on how their bonds perform.
- **Investors** compare bonds by yield, term and curator rating, fund the ones they choose, and track their positions to maturity.

Bond lifecycle: **Apply → Curate → Fund → Settle**.
First market: **Healthcare**, meaning bonds backed by contracted health-plan premiums.

## 2. Goal of this app

Build a **simple, demoable Next.js app** that shows the full lifecycle from all three roles' points of view. It uses mocked data and a simulated on-chain record. The goal is to prove the UX and data model. It is not meant to move real money.

### In scope (MVP)
- Marketing landing page (a condensed version of rebond.site)
- Auth with email (magic link or password) plus a **mock** wallet connect
- Role selection: Investor / Curator / Company (one role per account)
- Company: apply to raise a bond
- Curator: review applications, then approve or reject them and attach their name
- Investor: browse and filter listed bonds, view details, fund
- Portfolio view (investor) and dashboard (company, curator)
- Distribution schedule with simulated payouts
- "On-chain record" panel that shows a mock tx hash per event

### Out of scope (later phases)
- Real Cardano transactions and smart contracts (Plutus/Aiken)
- Real KYC/AML, accreditation checks and payments (fiat or stablecoin)
- Secondary trading of bonds
- Multiple markets beyond Healthcare
- Admin back-office beyond a seed script

## 3. Users and roles

| Role | Can do | Cannot do |
|---|---|---|
| Visitor | View landing page and public bond list (read-only) | Fund, apply or curate |
| Investor | Browse, filter, fund bonds; view portfolio | Create or curate bonds |
| Company | Submit and edit applications; view own bond status and funding progress | Fund own bond, curate |
| Curator | Review the application queue; approve, reject or request changes; see fees and ranking | Curate a bond they have a stake in |

Investors must be marked **"verified"** before they can fund. In the MVP this is a self-attest checkbox stored on the profile.

## 4. Functional requirements

### 4.1 Landing page (`/`)
- **FR-1** Hero: "Real yield from real contracts.", subcopy, and CTAs **Open the app** and **See how it works**.
- **FR-2** Sections: Problem (3 cards), How it works (4 steps), Who it's for (3 roles), Markets (Healthcare first, "Next" teaser), Footer (privacy, contact).
- **FR-3** Fully static (SSG) and responsive.

### 4.2 Auth and onboarding
- **FR-4** Sign up / sign in with email.
- **FR-5** "Connect wallet" button that stores a fake `addr1…` address on the profile (CIP-30 can come later).
- **FR-6** First login asks the user to pick a role. Investors also tick the "verified investor" attestation.
- **FR-7** Route protection by role, enforced in middleware.

### 4.3 Company: Apply (`/company/apply`, `/company`)
- **FR-8** Application form fields: company name, sector (Healthcare only), description, raise amount (USD), fixed annual rate (%), term (months), payout frequency (monthly/quarterly/at maturity), contract summary, annual contracted revenue, and an upload of supporting docs (PDF, stored only).
- **FR-9** Validation: amount > 0, rate between 0 and 30%, term from 1 to 60 months.
- **FR-10** Status flow: `DRAFT → SUBMITTED → IN_REVIEW → CHANGES_REQUESTED | REJECTED | LISTED → FUNDED → ACTIVE → MATURED`.
- **FR-11** Dashboard shows the company's applications, current status, curator notes, % funded, and the upcoming distribution schedule.

### 4.4 Curator: Review (`/curator`)
- **FR-12** Queue of `SUBMITTED` applications. A curator can **claim** one, which moves it to `IN_REVIEW`.
- **FR-13** Review page shows the full application. Actions: **Approve & list**, **Request changes** (note required), **Reject** (note required).
- **FR-14** On approval the curator sets the curator fee (%, e.g. 0.5 to 2%) and the bond becomes `LISTED` with the curator's name attached.
- **FR-15** Curator profile (`/curators/[id]`, public) shows bonds curated, total volume, default/late count, and a **rank score**. MVP formula: % of distributions paid on time, weighted by volume.

### 4.5 Investor: Marketplace (`/bonds`, `/bonds/[id]`)
- **FR-16** List of `LISTED` bonds as cards: company, yield, term, amount, % funded, curator name with rank, and market tag.
- **FR-17** Filters: yield range, term range, curator, payout frequency. Sort by yield, term, % funded or newest.
- **FR-18** Detail page: terms, company summary, curator and note, a funding progress bar, the **distribution schedule table**, and the **on-chain record** panel.
- **FR-19** Fund flow: enter an amount (minimum $100, no more than what is left to raise) → confirm modal (shows expected return = principal × rate × term/12) → creates a `Position` plus a mock tx hash.
- **FR-20** When fully funded the bond moves to `FUNDED`, then `ACTIVE`, and the distribution schedule is generated.

### 4.6 Investor: Portfolio (`/portfolio`)
- **FR-21** Summary tiles: total invested, expected total return, received to date, and next payout date.
- **FR-22** Positions table: bond, amount, rate, maturity, received, status.
- **FR-23** Per-position distribution history with mock tx hashes.

### 4.7 Settlement simulation
- **FR-24** A dev-only "Advance time" control (or a `/api/dev/tick` route) marks the next due distribution as `PAID` and splits it pro-rata to positions.
- **FR-25** At the final payout the bond becomes `MATURED` and principal is returned.
- **FR-26** Each payout updates the curator's on-time stats and so their rank.

### 4.8 On-chain record (simulated)
- **FR-27** Every lifecycle event (listed, funded, distribution paid, matured) writes a `ChainEvent` row: type, payload hash, a fake tx hash and a timestamp.
- **FR-28** The UI shows a "View on explorer" link styled like Cardanoscan. In the MVP it has no real link, or links to the preprod explorer.
- **FR-29** Never put PII in the chain payload. This mirrors the privacy policy.

## 5. Data model (initial)

```
User        id, email, role(INVESTOR|CURATOR|COMPANY), walletAddress?, verified, createdAt
Company     id, ownerId→User, name, sector, description
Curator     id, userId→User, displayName, bio
Bond        id, companyId, curatorId?, status, amountUsd, ratePct, termMonths,
            payoutFrequency, curatorFeePct?, contractSummary, annualRevenueUsd,
            reviewNote?, listedAt?, fundedAt?, maturityDate?
Document    id, bondId, url, name
Position    id, bondId, investorId→User, amountUsd, createdAt
Distribution id, bondId, dueDate, amountUsd, isPrincipal, status(SCHEDULED|PAID|LATE), paidAt?
Payout      id, distributionId, positionId, amountUsd
ChainEvent  id, bondId, type, payloadHash, txHash, createdAt
```

## 6. Pages and routes

| Route | Access | Render |
|---|---|---|
| `/` | public | SSG |
| `/login`, `/onboarding` | public / authed | client |
| `/bonds`, `/bonds/[id]` | public (fund requires investor) | server components |
| `/curators/[id]` | public | server |
| `/portfolio` | investor | server |
| `/company`, `/company/apply`, `/company/bonds/[id]` | company | server + form actions |
| `/curator`, `/curator/review/[id]` | curator | server + form actions |
| `/privacy` | public | SSG |

## 7. Tech stack

- **Next.js 15+ (App Router)**, TypeScript, Server Components and Server Actions for mutations
- **Tailwind CSS v4 + shadcn/ui** for the UI
- **Prisma + SQLite** locally (switch to Postgres when deploying)
- **Auth.js (NextAuth v5)** with the email provider, or a credentials provider for the demo
- **Zod** for form and server action validation
- **Vitest** for domain logic (interest, schedules, rank) and **Playwright** for one end-to-end lifecycle test
- Deploy on **Vercel**

Put the domain logic in `lib/domain/` (schedule generation, return calc, pro-rata split, rank score) as pure, unit-tested functions.

## 8. Non-functional requirements

- **NFR-1** Responsive down to 360px. Lighthouse score of 90+ on the landing page.
- **NFR-2** Accessibility: keyboard-navigable forms and modals, WCAG AA contrast.
- **NFR-3** All money stored as integer cents. Rates stored as basis points.
- **NFR-4** Role checks on every server action, not only in middleware.
- **NFR-5** A visible banner on every app page: "Demo: no real funds, simulated on-chain records."
- **NFR-6** A seed script with 3 companies, 2 curators, 3 investors and bonds in every status.

## 9. Milestones

| # | Deliverable | Est. |
|---|---|---|
| M1 | Scaffold, Tailwind/shadcn, Prisma schema, seed, landing page | 1–2 d |
| M2 | Auth, onboarding, role guards | 1 d |
| M3 | Company apply flow and dashboard | 1–2 d |
| M4 | Curator queue, review, public profile | 1–2 d |
| M5 | Marketplace list, filters, detail, fund flow | 2 d |
| M6 | Portfolio, settlement simulation, chain events | 2 d |
| M7 | Tests, polish, demo banner, deploy | 1 d |

## 10. Acceptance criteria (demo script)

1. A company signs up and submits a $250k / 11% / 12-month / quarterly bond.
2. A curator claims it, approves it at a 1% fee, and it appears on `/bonds`.
3. Two investors fund it in full. The bond goes to `ACTIVE`, the schedule shows 4 payouts, and chain events appear.
4. "Advance time" × 4 pays every distribution. Portfolios show the amounts received, and the bond is `MATURED`.
5. The curator's public profile shows 1 bond, 100% on time, and an updated rank.

## 11. Open questions

- Should the app include the landing page, or only the app (`app.rebond.site`)?
- Investor minimum ticket size and any accreditation rules?
- Is payout currency USD-denominated stablecoin (e.g. USDM on Cardano) or fiat?
- Is curator rank formula / fee model defined by the business?
- Phase 2: real CIP-30 wallet (Lace, Eternl) and Cardano preprod contracts. Which framework: Mesh or Lucid Evolution?
