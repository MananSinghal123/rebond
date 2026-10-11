---
name: ReBond
description: Ledger. An institutional system where every figure reads like a line on a term sheet.
colors:
  paper: "oklch(0.982 0.003 95)"
  surface: "oklch(1 0 0)"
  fill: "oklch(0.963 0.004 95)"
  ink: "oklch(0.2 0.008 255)"
  ink-2: "oklch(0.36 0.01 255)"
  muted: "oklch(0.5 0.01 255)"
  line: "oklch(0.2 0.008 255 / 0.1)"
  line-strong: "oklch(0.2 0.008 255 / 0.18)"
  accent: "oklch(0.47 0.1 162)"
  accent-hover: "oklch(0.41 0.09 162)"
  accent-ink: "oklch(0.995 0.005 162)"
  accent-mark: "oklch(0.72 0.13 162)"
  warn: "oklch(0.52 0.12 68)"
  bad: "oklch(0.52 0.17 27)"
typography:
  hero:
    fontFamily: "IBM Plex Sans"
    fontSize: "64px"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  hero-mobile:
    fontFamily: "IBM Plex Sans"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  yield-lens-large:
    fontFamily: "IBM Plex Sans"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  yield-lens-mobile:
    fontFamily: "IBM Plex Sans"
    fontSize: "56px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  yield-lens-sheet:
    fontFamily: "IBM Plex Sans"
    fontSize: "48px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  section:
    fontFamily: "IBM Plex Sans"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  yield-lens:
    fontFamily: "IBM Plex Sans"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
  confirm-total:
    fontFamily: "IBM Plex Sans"
    fontSize: "36px"
    fontWeight: 500
    letterSpacing: "-0.025em"
  title:
    fontFamily: "IBM Plex Sans"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  section-mobile:
    fontFamily: "IBM Plex Sans"
    fontSize: "30px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title-phone:
    fontFamily: "IBM Plex Sans"
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  title-mobile:
    fontFamily: "IBM Plex Sans"
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "IBM Plex Sans"
    fontSize: "24px"
    fontWeight: 500
    letterSpacing: "-0.015em"
  step:
    fontFamily: "IBM Plex Sans"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  lede:
    fontFamily: "IBM Plex Sans"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  body-large:
    fontFamily: "IBM Plex Sans"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  card-title:
    fontFamily: "IBM Plex Sans"
    fontSize: "16px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontFamily: "IBM Plex Sans"
    fontSize: "14px"
    fontWeight: 500
  caption:
    fontFamily: "IBM Plex Sans"
    fontSize: "13px"
    fontWeight: 400
  small:
    fontFamily: "IBM Plex Sans"
    fontSize: "12px"
    fontWeight: 500
  label:
    fontFamily: "IBM Plex Sans"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.06em"
  mono:
    fontFamily: "IBM Plex Mono"
    fontSize: "12px"
rounded:
  tag: "4px"
  control: "6px"
  sheet: "8px"
  dot: "9999px"
spacing:
  gutter: "20px"
  sheet-padding: "24px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "{spacing.sheet-padding}"
  badge:
    rounded: "{rounded.tag}"
    height: "22px"
---

## Overview

ReBond's visual system is **Ledger**: a term sheet, not a startup landing page. Warm paper ground, white sheets ruled with hairlines, near-black ink, and one deep ReBond green. It should feel established and exact, on the level of Stripe, Linear and Bloomberg, without borrowing any of their marks or layouts. The interface steps back so yield, term and curator credibility lead, and every figure reads like a line someone could audit. The sources of truth are `app/globals.css` (tokens) and `components/ui.tsx` (primitives). Every route shares one header, `components/site-header.tsx`.

## Colors

The strategy is restrained. Paper is a warm off-white; sheets are pure white; ink is a cool near-black, with `ink-2` for secondary text and `muted` for captions and labels. `line` is the hairline that does most of the structural work, and `line-strong` outlines controls. Green is reserved for primary actions, progress, positive state (Listed, Funded, Active) and links in running text. `accent-mark` is a lighter green used only on the dark brand mark. `warn` marks review and late states, `bad` marks rejection and errors. Badges and notices use a 5–10% tint of their colour; notices add a 1px border in the same tone. There are no gradients, glows or translucent glass anywhere. The demo ribbon is ink with paper text and is always present.

## Typography

IBM Plex Sans carries everything and IBM Plex Mono is reserved for transaction hashes, sequence numbers and step indices, never as decoration. Both load through `next/font` (`--font-plex-sans`, `--font-plex-mono`). All figures are tabular, and the body sets `text-rendering: geometricPrecision` so small caps-style labels space evenly on every platform.

- **Titles** are 600 weight with modest negative tracking: 32px page titles (28px mobile), 40px landing section titles (30px mobile), and a 64px hero (44px mobile).
- **Figures** are 500 weight, not bold. Weight belongs to names and titles; numbers get size. **Yield lens:** the coupon rate is always the largest number in its context: 40px on marketplace cards, 48px on the landing term sheet, 64px on the bond page (56px mobile).
- **Labels** (`.label` utility) are 11px, 500, uppercase, +0.06em tracking, `muted`. They head table columns, term cells and stats, and they sit directly above the value they name. They are never used as eyebrows above headings.
- Body text is 15px at 1.5. Landing prose is 17–18px at 1.6 in `ink-2`.

## Layout

The content column is `max-w-[1120px]` with a 20px gutter. App pages open with a page header (title, description, optional action) closed by a hairline rule, then the work. The bond page uses a two-column grid (content | 20rem funding column, sticky on large screens). Marketplace cards sit two per row on md and up. Stats join into a single ruled strip (`StatGrid`) rather than separate tiles. Numeric table columns are right-aligned (`numClass`). The landing page alternates paper and white full-bleed bands separated by hairlines, at 80–96px vertical rhythm.

## Responsive

Mobile-first, with the desktop layout unchanged from `sm` (640px) up. Tested at 320, 375, 390, 430, 768 and 1366px with no horizontal overflow on any route.

- **Gutter and rhythm:** 16px gutter on phones (20px from `sm`). App pages open 24px below the header on phones (40px from `sm`). Panels pad 16 / 20 / 24px across phone, `sm` and `md`. Landing sections use 56px vertical padding on phones (80px from `sm`, 96px from `md`).
- **Touch:** buttons are 44px tall on phones (36px from `sm`) and inputs 44px (40px from `sm`). Input text is 16px on phones so iOS Safari never zooms on focus. Small links in lists, footers and toggles get padded hit areas. Header actions keep their compact desktop size through a `sm:`-only override.
- **Navigation:** below `sm` the header is the logo plus a menu button. The menu is a full-screen sheet (`components/mobile-menu.tsx`, native popover: Esc and outside taps close it, it closes on navigation, and page scroll locks while it is open) with the nav as 56px rows, then the wallet or Connect wallet, then Sign out. Visitors see a Sign in button instead.
- **Tables become records:** below `sm`, `.rtable` (from `tableClass`) turns each row into a compact record. The `data-primary` cell leads, the `data-figure` cell sits opposite it, other cells become label/value lines from `data-label`, `data-action` cells span the row (their button goes full width), and `data-mobile-hide` cells drop out. Every new table cell needs one of these.
- **Content-aware order:** on phones the bond page reads rate → funding → backing → curator. From `md` the funding column sits on the right, sticky.
- **Filters:** on phones the marketplace shows Sort, a Filters toggle with an active-filter count, and Apply. The six filters fold behind the toggle (a hidden checkbox and CSS, no JS). From `sm` the form is the full grid.
- **Pairing short fields:** short related values share a row on phones (rate and term on the application form, the stats strip two-up), and long ones span it.
- `sheetClass` includes `min-w-0`, so no table or long value can push a grid column wider than the screen.

## Elevation & Depth

Resting surfaces declare elevation with a **hairline border only** (`sheetClass`: white, 1px `line`, 8px radius). Floating surfaces (wallet popover, confirm dialog, the landing term sheet) use `shadow-float`, which includes its own faint 1px ring. Marketplace cards darken their border and pick up a small soft shadow on hover. Nothing else casts a shadow. The header is opaque white with a bottom hairline. The dialog backdrop dims without blur.

## Shapes

Tags and badges are 4px, controls and buttons 6px, sheets and dialogs 8px. Only status dots and the progress bar are fully round. Hairlines separate rows, terms and panel headers; inner divisions use vertical rules (card figure row, landing proof columns) rather than nested boxes.

## Components

- **Header:** the ledger mark (an ink square with three ruled lines, the last in `accent-mark`, in `components/brand-mark.tsx`) and the wordmark, then text tabs. The active tab gets ink text and a 2px ink underline sitting on the header's bottom edge, plus `aria-current`. Wallet chip and actions sit on the right. Below `sm` the tabs and actions move into the mobile menu sheet (see Responsive).
- **Buttons:** primary (solid green with a faint inset base line), secondary (white with a `line-strong` outline), danger (white with a red outline). Press is a 1px downward nudge; no scaling.
- **Inputs:** white, `line-strong` border, faint inset shadow. Focus switches the border to green with a 3px soft green ring.
- **Panel:** white sheet. With a title, the title sits in its own header row (14px semibold) above a hairline, and the body pads below.
- **Bond card:** name and sector top-left, yield lens top-right, a four-cell ruled figure row (term, raise, payouts, funded), a thin progress bar, and a tinted footer with the curator credit and rank. The whole card is a link.
- **Bond terms:** a ruled grid of label-over-value cells, closed top and bottom by hairlines.
- **Confirm dialog:** a statement. Title row, "Total at maturity" as the hero figure, ruled line items, the formula note, and a tinted footer holding Cancel and Confirm.
- **Landing term-sheet deck** (`components/term-sheet-deck.tsx`): three example bonds built from the demo's fictional companies, each labelled Example, stacked so two sheets peek out underneath. Footnote markers (`NoteRef`: Plex Mono numerals in a green-outlined 18px square) on Backing, Curator and Chain record match the three numbered proof columns below, so every claim traces back to a line on the sheet. It has no visible controls or index; it simply turns.
- **Schedule and chain record:** zero-padded mono sequence numbers, a status dot before the label, mono tx hashes.

## Motion

Motion is cinematic but quiet: long exponential ease-outs, small distances, nothing that loops or bounces. There are two kinds, kept separate.

**Scroll-triggered reveals (every page).** Elements marked `data-reveal` play a fixed-length entrance once they enter the viewport, so they always finish, even on pages too short to scroll. `components/motion-observer.tsx` (mounted once in the root layout) watches them, including elements mounted by client-side navigation, and reveals elements that arrive together top-to-bottom, left-to-right, 80ms apart (up to five steps).

- `data-reveal="up"`: rises 18px over 1100ms (expo) while fading in over 700ms (quint), so content is readable before it settles. Used by `PageHeader`, `Panel`, `StatGrid`, `EmptyState`, marketplace cards and filters, the portfolio sheets, and landing headings and blocks.
- `data-reveal="stagger"`: the container stays put and its direct children rise 10px one after another, 55ms apart, starting just after the container's sheet. Used on table bodies (schedule, positions, review queue), the chain record and ruled lists.
- `data-reveal="rule"` with `.rule-draw`: the element's top hairline draws left to right over 1400ms. Used on landing section rules, the proof grid, the step rules (the green one first) and the audience list.

**Scroll-linked effects (landing only).** CSS scroll timelines, absent where unsupported:

- The hero copy lifts 48px and dims to 25% over the first 75vh, while the term-sheet deck lags 64px behind the page (large screens only).
- White bands start as paper and brighten to white as they arrive, so section changes read as light rather than edges.
- A 2px green line at the top of the window tracks page progress.

**Hero entrance:** headline, lede, actions and the deck rise in on load, 100ms apart (`.rise-in`).

**Term-sheet deck:** every 5 seconds the front sheet lifts 18px and fades on top of the stack (`deck-leave`, 900ms expo), then drops to the back while the next sheet rises forward over 700ms and its funding bar fills from empty. Hovering holds the current sheet.

**State changes** take 150ms (colour, border). The dialog and popover enter in 200ms.

**Guarantees.** A head script adds `motion` to `<html>` before first paint, and only when the viewer has not asked for reduced motion; every motion rule is scoped under it, so reduced-motion and no-JS visitors get a complete static page. If the observer never runs, a failsafe reveals hidden content after 2.2s. Only `transform` and `opacity` animate on scroll (plus one background colour on landing bands), and every reveal uses `animation` with backwards fill, never `transition`, so it never overrides a component's own hover transitions.

## Do's and Don'ts

- Do keep yield, term and curator together wherever a bond appears.
- Do keep the demo ribbon and the "simulated" labels visible.
- Do let hairlines carry structure. Reach for a rule before a box, and a box before a shadow.
- Don't use gradients, glass, glows, or pill-shaped buttons.
- Don't add borders and shadows to the same resting surface.
- Don't nest sheets inside sheets. Tables and lists sit directly in their sheet.
- Don't put an eyebrow label above a heading, or use monospace for anything that isn't a hash, index or sequence.
- Don't add scroll or entrance animation. The term-sheet deck is the only autoplaying motion; don't add a second.
