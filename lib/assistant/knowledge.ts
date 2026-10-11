import { PUBLIC_STATUSES } from '@/lib/domain/lifecycle';
import { formatRate, formatUsd, MAX_AMOUNT_USD, MAX_FEE_BPS, MIN_FEE_BPS, MIN_TICKET_CENTS, usdToCents } from '@/lib/domain/money';

const MIN_TICKET = formatUsd(MIN_TICKET_CENTS);
const MAX_RAISE = formatUsd(usdToCents(MAX_AMOUNT_USD));
const FEE_BAND = `${formatRate(MIN_FEE_BPS)} to ${formatRate(MAX_FEE_BPS)}`;

/**
 * Everything the assistant may state as fact. Numbers come from `lib/domain` so answers
 * can't drift from the rules the app enforces. Sources: landing copy, PRODUCT.md, ARCHITECTURE.md, privacy page.
 */
export const KNOWLEDGE = `
## What ReBond is
ReBond is a marketplace for fixed-return bonds backed by contracted revenue: companies raise against contracts they have already signed, independent curators vet them, and investors fund them. Every deal, term and distribution is recorded on Cardano.
Tagline: "Real yield from real contracts."
This app is a demo. No real funds move, and on-chain records are simulated (deterministic hashes stored by the app, no network involved).

## How it works (lifecycle)
1. Apply: a company with contracted revenue proposes a bond with an amount, a fixed annual rate, a term in months and a payout schedule, and describes and uploads (PDF) the contracts that back it.
2. Curate: an independent curator claims the application, reviews the contracts, and either approves it (putting their name on the bond and setting their fee), requests changes, or rejects it.
3. Fund: investors compare listed bonds by yield, term and curator rating, and fund the ones they choose.
4. Settle: distributions are paid on schedule and principal returns at maturity, each recorded on chain.

Bond statuses, in order:
- DRAFT: the company is still editing.
- SUBMITTED: waiting for a curator to claim it.
- IN_REVIEW: a curator has claimed it and is reviewing.
- CHANGES_REQUESTED: the curator asked for edits; the company edits and resubmits.
- REJECTED: final, not listed.
- LISTED: open for investors to fund.
- FUNDED / ACTIVE: fully funded; distributions are being paid.
- MATURED: every distribution, including principal, has been paid.
Investors see bonds only once they are ${PUBLIC_STATUSES.join(', ')}.

## Roles
- Investors: browse the marketplace (/bonds), fund bonds, and track positions and payouts in their portfolio (/portfolio).
- Companies: apply to raise a bond and follow review, funding and the distribution schedule on their dashboard (/company).
- Curators: work a review queue (/curator), approve, request changes or reject, earn a fee on the bonds they approve, and build a public ranking (/curators).
- Visitors (not signed in) can read the landing page and privacy page only. Everything else needs sign-in.
After signing in for the first time, a user picks one role on the onboarding page.

## Signing in
Three ways in, from /login: Continue with Google (a labelled demo that also creates a demo embedded wallet), connect a real Cardano wallet (CIP-30; the wallet signs a one-time challenge, no transaction and no funds), or email and password.

## Investing
- Minimum investment (ticket): ${MIN_TICKET}.
- You can't fund more than what is left to raise, and you must either fund the full remainder or leave at least ${MIN_TICKET} for others.
- Investors must confirm they are a verified investor before funding. In this demo that is a self-attested checkbox.
- Returns are fixed simple interest: principal × annual rate × term in months ÷ 12.
- Payout frequency is monthly, quarterly, or at maturity. Interest is paid each period and principal is returned with the final distribution.
- Each distribution is split between investors pro rata to how much they funded.
- A distribution can be paid on time or late; late payments are recorded and count against the curator's rank.

## Raising (companies)
- Raise amount: from ${MIN_TICKET} up to ${MAX_RAISE} in this demo.
- Rate: above 0% and at most 30% a year. Term: 1 to 60 months.
- The application needs a company description, a summary of the backing contracts, annual contracted revenue, and optional PDF documents (5 MB total).
- An application can be edited only while it is a DRAFT or after changes were requested. Once submitted it is locked for review.

## Curators
- Curators set a fee between ${FEE_BAND} of the bond amount when they approve it. The fee is earned once the bond is funded.
- Curator rank is public and based on how their bonds actually pay: the on-time payment percentage and a score weighted by bond volume. A curator with no paid distributions yet is unrated.

## Markets
Healthcare is live first: bonds backed by contracted health-plan premiums. More contract-backed markets come after Healthcare.

## Privacy
The demo stores your email, a hashed password, your chosen role and any application details you enter. On-chain records contain only bond identifiers, amounts and hashes, never personal information. Uploaded documents are stored only so curators can review them and are never published.

## Not decided yet
Payout currency (USDM stablecoin vs fiat), the final curator fee model, and investor accreditation rules are open questions. Say they have not been decided.

## Demo data
Companies and curators in the demo (for example Northwind Health, Harbor Dialysis Partners, Meridian Home Care, Atlas Credit Review, Juniper Diligence) are fictional seed data. ReBond has no real customers, testimonials, track record or press yet.
`.trim();
