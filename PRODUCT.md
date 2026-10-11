# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Investors (primary, confirmed 2026-10-11):** compare fixed-return bonds by yield, term and curator rating, fund the ones they choose, and track positions and payouts to maturity. The redesign is optimised for them first. Their screens (marketplace, bond detail, portfolio) set the tone, and every other screen follows.
- **Companies:** apply to raise a bond against contracted revenue, then follow review status, funding and the distribution schedule.
- **Curators:** work a review queue, approve, request changes or reject, and build a public ranking from how their bonds perform.
- **Visitors:** read the landing page and the public bond list.

## Product Purpose

ReBond is a marketplace for fixed-return bonds backed by contracted revenue, with every deal, term and distribution recorded on Cardano. This MVP proves the UX and data model for the full lifecycle (Apply → Curate → Fund → Settle) with mocked data and simulated on-chain records. No real money moves.

## Positioning

Yield that traces back to signed contracts, vetted by a named curator who has a public, performance-based rank. Each lifecycle event leaves a simulated chain record.

## Operating Context

The app is used as a demo in pitch settings and by testers walking the §10 script. First market: Healthcare (contracted health-plan premiums). It is web-only, desktop first and must work down to 360px.

## Capabilities and Constraints

- The existing features, routes, server actions and the Playwright lifecycle test stay unchanged. Visual work is presentation only (confirmed 2026-10-11).
- "Demo: no real funds, simulated on-chain records." must be visible on every app page (REQUIREMENTS NFR-5).
- Money is integer cents and rates are basis points. Amounts are capped at $8M in this demo.
- Open, undecided: payout currency (USDM vs fiat), the curator fee model, and accreditation rules.

## Brand Commitments

- The name is ReBond. The landing headline is "Real yield from real contracts."
- Visual direction requested by the user: inspired by Apple's design philosophy (clarity, deference to content, depth), applied to ReBond's own identity. Use no Apple marks, product imagery or copied layouts (confirmed 2026-10-11).
- One shared header component on every route, including `/` and `/bonds`.

## Evidence on Hand

- Seed data only (`prisma/seed.ts`): fictional companies (Northwind Health, Harbor Dialysis Partners, Meridian Home Care) and curators (Atlas Credit Review, Juniper Diligence).
- There are no real customers, testimonials, returns or press. Do not fabricate them.

## Product Principles

1. Every number traces to its source: contracts, curator and chain record.
2. The investor's decision comes first. Yield, term and curator credibility are always visible together.
3. Be honest about simulation: demo and mock labels are never hidden.
4. Use one consistent vocabulary and component set across all roles.

## Accessibility & Inclusion

WCAG AA contrast. Forms and modals must be keyboard-navigable (REQUIREMENTS NFR-2).
