# ReBond MVP: Plan Overview

> Spec: [REQUIREMENTS.md](../../../REQUIREMENTS.md) (Draft v0.1, 2026-10-10)
> Decisions confirmed with the product owner on 2026-10-10: include a simple landing page; visual direction is "Quiet ledger".

Execute the plan files in numeric order. Each one changes at most 3 files and leaves the app building and the tests green.

## Plan index

| # | Plan | Spec coverage | Files |
|---|---|---|---|
| 01 | [Scaffold and tooling](01-scaffold.md) | M1, §7 | `package.json`, `vitest.config.ts`, `.gitignore` |
| 02 | [Domain types and lifecycle](02-domain-types-lifecycle.md) | FR-10, §5 | `lib/domain/types.ts`, `lib/domain/lifecycle.ts`, test |
| 03 | [Money and returns](03-domain-money.md) | FR-19, NFR-3 | `lib/domain/money.ts`, test |
| 04 | [Distribution schedule](04-domain-schedule.md) | FR-20, FR-25 | `lib/domain/schedule.ts`, test |
| 05 | [Pro-rata split and curator rank](05-domain-payouts-rank.md) | FR-15, FR-24, FR-26 | `lib/domain/payouts.ts`, `lib/domain/rank.ts`, test |
| 06 | [Chain events and mock wallet](06-domain-chain.md) | FR-5, FR-27, FR-29 | `lib/domain/chain.ts`, test |
| 07 | [Database schema](07-database-schema.md) | §5 | `prisma/schema.prisma`, `lib/db.ts`, `.env.example` |
| 08 | [Test database harness](08-test-db-harness.md) | §7 testing | `vitest.config.ts`, `tests/helpers/global-setup.ts`, test |
| 09 | [Accounts service](09-accounts-service.md) | FR-4, FR-5, FR-6 | `lib/services/accounts.ts`, test, `tests/helpers/actors.ts` |
| 10 | [Session token and route guard](10-edge-auth-middleware.md) | FR-7 | `lib/auth/edge.ts`, `middleware.ts`, test |
| 11 | [Design tokens and UI kit](11-design-tokens-ui-kit.md) | NFR-1, NFR-2 | `app/globals.css`, `components/ui.tsx` |
| 12 | [Session and login](12-session-login.md) | FR-4, NFR-4 | `lib/auth/session.ts`, login page and action |
| 13 | [App shell and onboarding](13-app-shell-onboarding.md) | FR-5, FR-6, NFR-5 | `app/(app)/layout.tsx`, onboarding page and action |
| 14 | [Landing and privacy](14-landing-privacy.md) | FR-1 to FR-3 | `app/page.tsx`, `app/privacy/page.tsx`, `app/layout.tsx` |
| 15 | [Applications service](15-applications-service.md) | FR-8, FR-9, FR-10 | `lib/services/applications.ts`, test, `next.config.ts` |
| 16 | [Company apply UI](16-company-apply-ui.md) | FR-8 | form component, apply page, company actions |
| 17 | [Company dashboard and bond panels](17-company-dashboard.md) | FR-11, FR-18 panels | dashboard, company bond page, `components/bond-panels.tsx` |
| 18 | [Review service](18-review-service.md) | FR-12 to FR-14, FR-27 | `lib/services/review.ts`, test, actors helper |
| 19 | [Curator UI](19-curator-ui.md) | FR-12 to FR-14 | queue page, review page, curator actions |
| 20 | [Funding service](20-funding-service.md) | FR-19, FR-20, FR-27 | `lib/services/funding.ts`, test, actors helper |
| 21 | [Settlement service](21-settlement-service.md) | FR-24, FR-25, FR-27 | `lib/services/settlement.ts`, test |
| 22 | [Curator stats and public profile](22-curator-profile.md) | FR-15, FR-26 | `lib/services/curators.ts`, profile page, test |
| 23 | [Marketplace list](23-marketplace-list.md) | FR-16, FR-17 | `lib/services/marketplace.ts`, `/bonds` page, test |
| 24 | [Bond detail and fund flow](24-bond-detail-fund.md) | FR-18, FR-19, FR-28 | bond page, `components/fund-form.tsx`, fund action |
| 25 | [Dev advance-time control](25-dev-advance-time.md) | FR-24 | `lib/auth/dev-tools.ts`, bond actions, bond page |
| 26 | [Portfolio](26-portfolio.md) | FR-21 to FR-23 | `lib/services/portfolio.ts`, page, test |
| 27 | [Seed script](27-seed.md) | NFR-6 | `prisma/seed.ts`, test, `package.json` |
| 28 | [End-to-end lifecycle test](28-e2e-lifecycle.md) | §10 acceptance | `playwright.config.ts`, spec, `package.json` |
| 29 | [Deploy notes](29-deploy.md) | M7 | `README.md` |

Milestone mapping: M1 = 01–08, 11, 14 · M2 = 09–10, 12–13 · M3 = 15–17 · M4 = 18–19, 22 · M5 = 20, 23–24 · M6 = 21, 25–26 · M7 = 27–29.

## Architecture

```
app/                      Next.js routes. Server components read, server actions mutate.
  (app)/                  Every app route sits under this group so the demo banner layout wraps it (NFR-5).
components/               ui.tsx (UI kit), bond-panels.tsx, application-form.tsx, fund-form.tsx
lib/domain/               Pure functions and types. No I/O and no Next imports. Unit-tested.
lib/services/             Use cases: (actor, input) → Result. Prisma lives here. Integration-tested on SQLite.
lib/auth/                 edge.ts (JWT and route rules, edge-safe), session.ts (cookies, requireActor), dev-tools.ts (DEMO_DEV_TOOLS gate)
prisma/                   schema.prisma, seed.ts
tests/                    domain/, auth/, services/, helpers/
e2e/                      Playwright acceptance script
```

**Request flow:** every mutation goes through a service. Read-only pages may query Prisma directly with field projection, but any visibility rule they apply comes from `lib/domain` (ARCHITECTURE P3). A page or form posts to a server action. The action calls `requireActor(role)` (NFR-4), then a service function. The service asserts the actor's role, validates with Zod, and writes inside `db.$transaction`. A failure becomes a `Result` error. The action redirects back with `?error=` (or `useActionState` on the long application form). The page renders the error with `<Notice>`.

### Conventions every plan relies on

- **`Result<T>`** (`lib/domain/types.ts`): services return `ok(value)` or `fail(message)` for errors the user can fix. Broken invariants (wrong role, missing rows that must exist) **throw** through `assert()`. No defensive try/catch.
- **Money** is integer cents and **rates** are basis points (NFR-3). Convert at the edge with `usdToCents` and `pctToBps`. Format only in the UI with `formatUsd` and `formatRate`.
- **Enums** are `as const` arrays in `lib/domain/types.ts`, stored as strings in SQLite and read back with `parseEnum`.
- **Time** is injectable: service functions take `now` (positional, or in `PayOptions` for settlement) so tests are deterministic. The seed uses real time.
- **Status groups** (`EDITABLE_STATUSES`, `PUBLIC_STATUSES`, `RAISED_STATUSES`) live only in `lib/domain/lifecycle.ts`. Never write a local status array.
- **Concurrency**: every status change and every capacity reservation is a guarded `updateMany` on the persisted state (`where: { id, status: <from>, … }`) that fails when `count === 0` (before the first write in a tx: `return fail`; after a write: `abort` inside `runTx`), so double submits and races cannot double-list, overfill or double-pay. This holds on Postgres as well as SQLite.
- **Services take cents and bps**, never dollars or percent. The two exceptions are the raw-input validation boundaries `saveApplication` (application form) and `parseFilters` (`/bonds` URL).
- **Chain events** are built only through `buildChainEvent()`, which refuses PII (FR-29).
- **Tests**: Vitest. Domain tests are pure. Service tests run on a real SQLite test DB through the service functions. Helpers in `tests/helpers/actors.ts` build state through the same public services. One Playwright test covers §10.

## Architecture Alignment

Reviewed against the provisional [ARCHITECTURE.md](../../../ARCHITECTURE.md) on 2026-10-10.

| Principle | Status | Notes |
|---|---|---|
| Pure core | ✅ Compliant | All money, schedule, split, rank, lifecycle, visibility (`curatorCanView`) and chain rules live in `lib/domain` |
| Dependency direction | ⚠️ Reshaped | `FormState` moved into `components/application-form.tsx` (no components→app edge). Projection-only page reads written into P3 as an explicit rule |
| Cents and bps | ⚠️ Reshaped | `Decision` now carries `feeBps` (the action converts). `saveApplication` is documented as the raw-form validation boundary |
| Guarded status writes | ⚠️ Reshaped | Issuer rename is now a guarded write inside the save tx. Resubmit clears `curatorId`. The seed's FUNDED rollback is guarded and documented |
| Status groups in lifecycle | ⚠️ Reshaped | Added `SETTLED_DISTRIBUTION_STATUSES` and `ISSUER_LOCKED_STATUSES` |
| Authorization twice | ✅ Documented exception | Actorless settlement is gated at its only edge (plan 25) |
| Transaction rollback | ⚠️ Reshaped (cycle 2) | `runTx`/`abort` in `lib/db.ts` (plan 07): a guard failing after a write rolls back. Used by `saveApplication` |
| Domain owns rules | ⚠️ Reshaped (cycle 2) | `curatorCanDecide`, the fee band and `feesAccruedCents` moved to `lib/domain`. Funding persists FUNDED then ACTIVE as two guarded writes. The dev gate moved to `lib/auth/dev-tools.ts`. The company bond read is scoped by owner |

**Reshapes applied:** cycle 1: plans 02, 15, 16, 18, 19, 21, 22, 27. Cycle 2: plans 02, 03, 07, 15, 17, 18, 19, 20, 25.

## Drift Correction Tasks

None emitted as `00-drift-*.md`. This is a greenfield repo, so each correction was folded into the feature plan that creates the file. Deferred items are tracked in the ARCHITECTURE.md drift table (bond read model, branded IDs, typed status queries).

## Deliberate deviations from REQUIREMENTS.md

| Spec | Plan | Why |
|---|---|---|
| Auth.js (NextAuth v5) | Email and password with bcrypt, plus a `jose`-signed httpOnly cookie | §7 allows a credentials provider for the demo. A 60-line edge-safe session avoids Auth.js v5 split-config and role-refresh complexity. Swap it in during Phase 2. |
| shadcn/ui | One `components/ui.tsx` (Button, Field, Panel, Notice, Stat, StatusBadge, ProgressBar) on Tailwind v4 tokens | The product owner asked for a very simple frontend. A few hand-written primitives are easier to keep consistent than a generated component tree. |
| `Document.url` | `Document.data Bytes` + `sizeBytes` | FR-8 says "stored only". Bytes in the DB work on Vercel, where the filesystem is read-only. |
| `Distribution.amountUsd` + `isPrincipal` | The final distribution's amount = last interest + principal, `isPrincipal = true` | This keeps §10's "4 payouts" and "Advance time × 4" exact. |
| `FUNDED` status | Written and immediately followed by `ACTIVE` in the same transaction. Only the seed persists a `FUNDED` bond. | FR-20 says "moves to FUNDED, then ACTIVE". |
| Extra columns | `Position.txHash`, `Distribution.txHash`, `Distribution.seq`, `Bond.createdAt/updatedAt`, `User.passwordHash` | FR-19 and FR-23 show tx hashes per position and per payout. |
| Amount range | Raise and annual revenue are capped at $8,000,000 | Prisma `Int` is 32-bit, which caps cents at about $21.4M. The final payout holds principal plus all interest, up to 2.5× principal (30% for 5 years), so the cap is $8M. Revisit with BigInt in Phase 2. |
| Curator "stake" rule (§3) | No explicit check | One role per account means a curator can never own a company or hold a position. |
| `LATE` distribution status | Means "paid late". It is set by the dev control's "Mark as late" checkbox. | This gives FR-26 rank a way to move during the demo. |

Pinned versions: `next@15` (keeps `middleware.ts`; Next 16 renamed it), `prisma@6` / `@prisma/client@6` (Prisma 7 requires driver adapters), latest `zod`, `jose`, `bcryptjs`, `vitest`, `tsx`, `@playwright/test`.

## Design brief: "Quiet ledger" (impeccable)

**Job and audience.** Investors compare fixed-return bonds and fund one. Companies submit one long form and then wait. Curators work through a queue. Each visit is short and task-focused, and the people using it are checking numbers they care about. Landing = Persuade mode (brief). Everything under `(app)` = Operate mode.

**Direction.** A printed ledger, not a trading app. The UI should feel like a well-set statement: calm, exact, trustworthy.

- **Palette** (OKLCH tokens in `app/globals.css`): `paper` warm off-white page, `surface` white panels, `ink` near-black text, `muted` secondary text (≥4.5:1 on paper), `line` hairlines, one `accent` deep green used only for primary actions, progress and positive state, plus `warn` and `bad` for review states. No dark mode in the MVP.
- **Type**: Geist Sans for everything, Geist Mono only for tx hashes and wallet addresses. Fixed rem scale. All figures use `tabular-nums`. Rates are the largest number on a bond card.
- **Shape**: 1px `line` borders, `rounded-md` / `rounded-lg`, no shadows, no gradients, no icons library, no illustrations, no emoji.
- **Layout**: a single centred column, `max-w-5xl`, `px-4` gutter. Wide tables sit in an `overflow-x-auto` wrapper. Grids collapse to 1 column below `md`. It works at 360px.
- **Components**: only the kit in `components/ui.tsx` plus `bond-panels.tsx`. The same button shape everywhere. Native `<dialog>` for the single confirm modal (FR-19). `<details>` for per-position history. GET forms for filters, so they work without JS.
- **Motion**: only `transition-colors duration-150` on interactive elements.
- **Anti-goals**: crypto-neon styling, dashboard charts, hero art, glass effects, decorative badges, a second accent colour.

**States every screen must render:** empty (with the next action), error (`<Notice>` with `role="alert"`), success (`role="status"`), and disabled or pending on submit buttons.

**When executing UI plans (11–14, 16, 17, 19, 22–26):** load impeccable's `reference/craft-floor.md` before editing. After plans 14 and 26, take one batched desktop (1280px) and mobile (360px) screenshot pass. Then run `.claude/skills/impeccable/scripts/impeccable detect --json app components` once and fix what it reports in one batch. Optionally run `/impeccable init` first to persist this brief as PRODUCT.md.

## Unresolved prerequisites (do not invent; they are flagged in the UI)

- Landing copy is drafted from §1 of the spec. Check it against rebond.site before any public deploy (plan 14).
- Minimum ticket ($100) and the curator fee band (0.5–2%) come from the spec. Accreditation rules are out of scope (open question §11).
- Payout currency (USDM vs fiat) is undecided. The UI says "USD".
- The rank formula is the spec's MVP formula (FR-15), pending a business decision.
