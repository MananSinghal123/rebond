# Architecture

## Status and evidence
**Provisional** (drafted 2026-10-10 for the architecture review). There is no source code yet. Evidence: [REQUIREMENTS.md](REQUIREMENTS.md) and the plan set [docs/plans/2026-10-10-rebond-mvp/](docs/plans/2026-10-10-rebond-mvp/00-overview.md). DDD is **not** adopted: the design is a layered monolith with a pure core.

## System overview
A single Next.js 15 App Router app. Mutations go through server actions, which call services. Data lives in Prisma (SQLite locally, Postgres on deploy). The "chain" is simulated: `ChainEvent` rows hold deterministic hashes, and no network is involved.

## Principles
1. **Pure core.** `lib/domain/*` has no I/O and no Next or Prisma imports. Money maths, the schedule, pro-rata splits, rank, the lifecycle and chain hashing all live there.
2. **Effects at the edges.** `lib/services/*` owns persistence and transactions. `app/**` actions authenticate, call one service, then redirect.
3. **Dependency direction.**
   - `app` → `components`, `lib/services`, `lib/auth`, `lib/domain`, and `lib/db` for **projection-only reads**. A page may select rows to render, but every visibility or authorization rule it applies must come from `lib/domain` (e.g. `curatorCanView`, `PUBLIC_STATUSES`) or a service. Pages never write.
   - `lib/services` → `lib/db`, `lib/domain`. Read-model services may compose other read-model services, without cycles.
   - `lib/domain` → nothing.
   - `components` → `lib/domain` (pure) and `components` only. `components` must not import `app/**` or `lib/domain/chain.ts`, which uses `node:crypto` and is server-only.
   - `lib/auth` → `lib/domain/types` only. `lib/auth/edge.ts` must stay edge-safe (no Prisma, no `node:*`). `lib/auth/dev-tools.ts` holds the `DEMO_DEV_TOOLS` gate.
4. **Money is integer cents and rates are basis points.** Convert at the edge with `usdToCents` and `pctToBps`. Services called with typed numbers take cents and bps. There are two documented exceptions, both validation boundaries for raw input: `saveApplication` (the application form) and `parseFilters` (the `/bonds` URL), which parse dollars or percent and convert them inside. The curator fee band (`MIN_FEE_BPS`/`MAX_FEE_BPS`) and `feesAccruedCents` live in `lib/domain/money.ts`.
5. **Status changes are guarded writes**: `updateMany` with the expected persisted status, failing on `count === 0`. Status groups and visibility predicates (`curatorCanView`, `curatorCanDecide`) live only in `lib/domain/lifecycle.ts`. Inside a transaction, `return fail(...)` is allowed only before the first write. After any write, a failed guard must call `abort(message)` within `runTx` (from `lib/db.ts`, serializable), so everything rolls back.
6. **Errors the user can fix return a `Result`. Broken invariants throw via `assert`.**
7. **Authorization is checked twice**: middleware first, then `requireActor` in every action, plus a role `assert` inside services (NFR-4). **Exception:** `payNextDistribution` is an actorless simulation. Its only callers are `advanceTimeAction` (session plus `devToolsEnabled()` from `lib/auth/dev-tools.ts`) and the seed.
8. **No PII in chain payloads** (FR-29), enforced by `buildChainEvent`.

## Components and ownership
| Component | Owns | Location | Public contract |
|---|---|---|---|
| Domain core | Types, lifecycle, money, schedule, payouts, rank, chain | `lib/domain/` | Pure functions and `as const` enums |
| Accounts | Users, roles, attestation, wallet | `lib/services/accounts.ts` | `signUp`, `signIn`, `chooseRole`, `attestInvestor`, `connectWallet` |
| Applications | DRAFT→SUBMITTED, issuer details, documents | `lib/services/applications.ts` | `saveApplication` |
| Review | SUBMITTED→IN_REVIEW→LISTED/REJECTED/CHANGES_REQUESTED | `lib/services/review.ts` | `claimApplication`, `decideApplication` |
| Funding | Positions, `fundedCents`, LISTED→ACTIVE, schedule creation | `lib/services/funding.ts` | `fundBond` |
| Settlement | Distributions paid, payouts, ACTIVE→MATURED | `lib/services/settlement.ts` | `payNextDistribution` |
| Read models | Curator rank, marketplace, portfolio | `lib/services/{curators,marketplace,portfolio}.ts` | View objects |
| Auth | Session token, route rules, cookies | `lib/auth/` | `routeAccess`, `requireActor`, `requireSession` |
| UI | Primitives and bond panels | `components/` | Presentational props |
| Assistant | FAQ chatbot: knowledge base, prompt, Claude call, rate limit | `lib/assistant/`, public `app/api/chat/route.ts`, `components/assistant/` | `handleChat`; streams plain text. No DB access |

## State and consistency boundaries
| Boundary | State owner | Invariants | Atomicity |
|---|---|---|---|
| Bond status | Service owning the transition | FR-10 transitions only | Guarded `updateMany` in one tx with its chain event |
| Funding | Funding | Σ positions = `fundedCents` ≤ `amountCents`; the remainder is 0 or ≥ $100 | Reserve, then position, then event in one tx |
| Settlement | Settlement | Σ payouts = distribution amount; each distribution is paid once | Claim, then payouts, then event (and maturity) in one tx |
| Issuer identity | Applications | Locked while any bond is in `ISSUER_LOCKED_STATUSES` | Guarded `company.updateMany` first in a serializable `runTx`; a failed bond guard `abort`s it |
| Review claim | Review (set) / Applications (cleared on resubmit) | A SUBMITTED bond has no `curatorId` | Same guarded write as the status change |

## Trust boundaries
Wallet sign-in works like this. The server issues a nonce in a short-lived signed httpOnly cookie (`lib/auth/wallet-challenge.ts`). The wallet signs it through CIP-30 `signData`. The server verifies the COSE signature, the address bound into it, and the message (`lib/auth/wallet-signature.ts`). Only then does it find or create the account. The Google option is a labelled demo. Signed httpOnly JWT cookie (`jose`, HS256). Roles are trusted from the token and re-checked per action. The dev tool needs a session and `DEMO_DEV_TOOLS=1` (private demos only). Uploaded PDFs are untrusted bytes: the `%PDF` magic number and a 5 MB total cap are checked, and they are never rendered.

## Current drift
| Area | Drift/evidence | Target state | Status/task | Last reviewed |
|---|---|---|---|---|
| Bond reads | Pages 17, 19 and 24 each assemble a bond view with their own Prisma include, and `components/bond-panels.tsx` parses stored strings (`toScheduleRows`, `toChainRows`) | One `getBondView(bondId, viewer)` read model returning parsed rows; panels take typed rows only | DEFER (after MVP; it needs a new plan slot ahead of 17) | 2026-10-10 |
| Curator fees | `/curator` computed fees accrued inline | Pure `feesAccruedCents` in `lib/domain/money.ts`, with a test | Planned: plans 03 and 19 | 2026-10-10 |
| Seed `FUNDED` | The seed rolls one funded bond ACTIVE→FUNDED with a guarded direct write, outside Funding | No direct writes, if FUNDED ever becomes a resting state | Accepted seed-only exception | 2026-10-10 |
| Domain IDs | All IDs are plain `string`, and curators have two ID spaces (`User.id`, `Curator.id`) | Branded ID types | DEFER (Phase 2) | 2026-10-10 |
| Status in queries | Prisma `where` clauses use status string literals on `String` columns | Typed query helpers, or native enums on Postgres | DEFER (Phase 2, with the Postgres switch) | 2026-10-10 |
| Tx hash copies | `Position.txHash` and `Distribution.txHash` copy `ChainEvent.txHash` | Accepted denormalization for FR-19 and FR-23 reads; written in the same tx | Accepted | 2026-10-10 |

## Related documents
[REQUIREMENTS.md](REQUIREMENTS.md) · [Plan overview and deviations](docs/plans/2026-10-10-rebond-mvp/00-overview.md)
