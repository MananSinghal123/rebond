---
name: ReBond
description: Ledger. An institutional system where every figure reads like a line on a term sheet.
colors:
  paper: "oklch(0.982 0.005 88)"
  surface: "oklch(1 0 0)"
  fill: "oklch(0.962 0.006 88)"
  ink: "oklch(0.2 0.022 258)"
  ink-2: "oklch(0.37 0.02 258)"
  muted: "oklch(0.51 0.016 258)"
  line: "oklch(0.2 0.022 258 / 0.1)"
  line-strong: "oklch(0.2 0.022 258 / 0.18)"
  accent: "oklch(0.44 0.085 158)"
  accent-hover: "oklch(0.38 0.075 158)"
  accent-ink: "oklch(0.995 0.005 158)"
  accent-mark: "oklch(0.76 0.12 158)"
  night: "oklch(0.185 0.026 260)"
  night-2: "oklch(0.235 0.026 260)"
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
    fontSize: "42px"
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
    fontSize: "52px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  hero-mobile-wide:
    fontFamily: "IBM Plex Sans"
    fontSize: "46px"
    fontWeight: 600
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  yield-lens-sheet-mobile:
    fontFamily: "IBM Plex Sans"
    fontSize: "44px"
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

The strategy is restrained. Paper is a warm off-white; sheets are pure white; ink is a cool near-black, with `ink-2` for secondary text and `muted` for captions and labels. `line` is the hairline that does most of the structural work, and `line-strong` outlines controls. Green is reserved for primary actions, progress, positive state (Listed, Funded, Active) and links in running text. `accent-mark` is a lighter green used only on the dark brand mark. `warn` marks review and late states, `bad` marks rejection and errors. Badges and notices use a 5–10% tint of their colour; notices add a 1px border in the same tone. `night` is a near-black navy used for exactly one band: the landing page's closing call to action and footer, where text is paper at 100/70/60% and rules are paper at 10–15%. Green is a deep forest green; ink carries a faint navy cast. There are no gradients, glows or translucent glass anywhere. The demo ribbon is ink with paper text and is always present.

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
- **Navigation:** below `sm` the header is the logo plus a menu button. The menu is a full-screen sheet (`components/mobile-menu.tsx`, native popover: Esc and outside taps close it, it closes on navigation, and page scroll locks while it is open) with the nav as 56px rows, then the wallet or Connect wallet, then Sign out. Visitors see Sign in beside the menu button; their sheet lists the landing anchors (How it works, Trust, Markets) and a full-width Sign in. On desktop, visitors get the same anchors as header tabs.
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
- **Landing story** (`app/page.tsx`): hero (claims wired to the deck) → problem as a comparison ledger (a table that becomes stacked records below `md`) → solution with `components/landing/cash-flow.tsx`, a $1,000 cash-flow figure computed by `buildSchedule` (axis breaks shorten principal and are disclosed) → investor journey on a rail with an interface fragment per step → trust as a sticky column beside four exhibits, with a warn-toned "What is simulated" note → Healthcare market and an example-opportunities table (`.rtable`) → night closing band and footer. All illustrative data comes from `components/landing/examples.ts` and is labelled Example.
- **Risks panel** on the bond page: plain-language risks plus the simulation statement. No ratings or guarantees are implied.
- **Schedule and chain record:** zero-padded mono sequence numbers, a status dot before the label, mono tx hashes.

## Motion

Motion is quiet and purposeful: long exponential ease-outs, small distances, nothing that bounces. Everything below is scoped under the `motion` class, so reduced-motion and no-JS visitors get a complete static page, and every reveal has a 2.2s failsafe.

**Scroll-triggered reveals (every page).** `components/motion-observer.tsx` sets `data-in` on `[data-reveal]` elements as they enter the viewport, a beat apart (80ms, up to five steps).

- `up`: rises 18px over 1100ms (expo) while fading over 700ms (quint).
- `stagger`: direct children rise 10px one after another, 55ms apart. Chart bars inside (`.grow-y`) grow from their axis.
- `rule` with `.rule-draw`: the top hairline draws left to right over 1400ms.
- `bar`: set by `ProgressBar` itself. The fill keeps its real width and scales in from the left, so funding bars fill as they arrive on every page.
- `draw`: SVG paths with `pathLength="1"` and `.draw-path` draw in order (`--draw-i`), and `.draw-node` end points appear as each line reaches them.

**Scroll-linked effects (landing only).** CSS scroll timelines, absent where unsupported: the page progress line, white bands brightening from paper, the journey rail filling as its section passes (horizontal from `lg`, vertical on phones), and a 20px parallax on the cash-flow figure (large screens only).

**Hero.** Headline, lede, actions, claims and the deck rise in on load, 100ms apart (`.rise-in`). From `lg`, `components/landing/hero-network.tsx` measures the live layout and draws orthogonal green lines from each numbered claim to the footnoted line on the front term sheet. A small packet travels each line every 7.5s, staggered (the only looping motion besides the deck).

**Term-sheet deck.** Every 6 seconds the front sheet lifts and fades, the next rises forward and its funding bar fills. Hovering holds the sheet.

**Interaction.** State changes take 150ms. Nav tabs draw their underline from the left (300ms expo). Marketplace cards lift 1px with a soft shadow. Arrow links nudge their arrow 3px. The mobile menu's rows stagger in.

## Do's and Don'ts

- Do keep yield, term and curator together wherever a bond appears.
- Do keep the demo ribbon and the "simulated" labels visible.
- Do let hairlines carry structure. Reach for a rule before a box, and a box before a shadow.
- Don't use gradients, glass, glows, or pill-shaped buttons.
- Don't add borders and shadows to the same resting surface.
- Don't nest sheets inside sheets. Tables and lists sit directly in their sheet.
- Don't put an eyebrow label above a heading, or use monospace for anything that isn't a hash, index or sequence.
- Don't add new autoplaying motion. The deck and the hero network packets are the only loops, and both stop under reduced motion.
