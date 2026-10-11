---
name: ReBond
description: Clarity, deference and depth. An Apple-inspired system where the bond's numbers lead.
colors:
  paper: "oklch(0.975 0.003 260)"
  surface: "oklch(1 0 0)"
  fill: "oklch(0.94 0.004 260)"
  ink: "oklch(0.21 0.005 260)"
  muted: "oklch(0.52 0.008 260)"
  line: "oklch(0.21 0.005 260 / 0.1)"
  accent: "oklch(0.52 0.13 158)"
  accent-ink: "oklch(0.99 0.01 158)"
  warn: "oklch(0.55 0.13 65)"
  bad: "oklch(0.55 0.19 27)"
typography:
  hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "80px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  hero-mobile:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  yield-lens-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "72px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.045em"
  yield-lens-hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "64px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body-large:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.47
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  nav:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  yield-lens:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
  section:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "-0.01em"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12px"
rounded:
  focus: "10px"
  control: "12px"
  sheet: "18px"
  card: "22px"
  pill: "9999px"
spacing:
  gutter: "20px"
  sheet-padding: "24px"
  card-padding: "28px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 18px"
  button-secondary:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "36px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "{spacing.sheet-padding}"
  bond-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
---

## Overview

ReBond follows Apple's design philosophy without borrowing Apple's marks: **clarity** (one idea per screen region, generous space, precise type), **deference** (the interface recedes so yield, term and curator credibility lead), and **depth** (white sheets float on a cool neutral ground through soft, layered shadow). The source of truth is `app/globals.css` (tokens) and `components/ui.tsx` (primitives). Every route shares one header, `components/site-header.tsx`.

## Colors

The strategy is restrained: cool neutrals plus one ReBond green. Green is reserved for primary actions, progress, positive state (Paid, Active, Listed) and links in text. `warn` marks review and late states, and `bad` marks rejection and errors. State badges and notices use a 10–12% tint of their colour, never a border. The demo ribbon is ink on paper inverted, and it is always present.

## Typography

The system font stack is used throughout (SF Pro on Apple devices, Segoe/system elsewhere). Hierarchy comes from scale and weight: large titles at 34–40px semibold with negative tracking, section titles at 19px, body at 15px, captions at 13px muted. All numbers are tabular. **Yield lens:** the coupon rate is always the largest figure in its context: 56px on marketplace cards, 72px on the bond page and 64px on the landing example card.

## Layout

The content column is `max-w-[1080px]` with a 20px gutter. Pages open with a large title and description, then the work. The bond page uses a two-column grid (content | 20rem funding column, sticky on large screens). Cards sit in a two-column grid on md and up, and in one column on mobile. The landing page alternates paper and white full-bleed bands at 96px vertical rhythm.

## Motion

Product screens stay still apart from 200ms state transitions (button press scale, hover lift, focus glow) and the confirm sheet's 320ms entrance. Only the landing page moves on scroll, and only in CSS: on load the hero rises in, staggered from headline to card. Sections and items then fade up 32px as they enter the viewport (`.reveal`, scroll-driven `view()` timelines), the "How it works" step lines draw left to right, and the hero card settles slightly as the page scrolls. Browsers without scroll-timeline support show everything static. `prefers-reduced-motion` turns all of it off.

## Elevation & Depth

Elevation is declared with shadow only; containers carry no borders. There are three levels: `shadow-sheet` (resting panels, stats, cards), `shadow-lift` (card hover, a 2px rise) and `shadow-float` (the landing hero card and the confirm sheet). The header is frosted (75% white, backdrop blur and saturate) and sticky. The dialog backdrop dims and blurs.

## Shapes

Controls are 12px, sheets 18px and cards 22px. Buttons, nav items and badges are pills. Hairline dividers (`line`) separate rows inside sheets; tables are inset lists with no outer frame.

## Components

- **Header:** wordmark, then role-aware nav pills (the active item gets an ink/6% fill and `aria-current`), then the wallet chip and a compact pill action. On mobile the nav wraps onto a second row.
- **Buttons:** primary (accent fill), secondary (gray fill), danger (red tint). Every button has a 0.98 press scale.
- **Inputs:** white fill with a hairline border. On focus they get an accent border and a 4px soft accent glow.
- **Panel/sheet:** white, 18px radius, `shadow-sheet`, with an optional 19px title.
- **Bond card:** yield lens, a terms caption, a thin progress bar and the curator credit below a hairline. The whole card is a link.
- **Confirm sheet:** native `<dialog>`, 22px radius, `shadow-float`, a 320ms expo ease-out entrance, and the total at maturity as the hero figure.
- **Schedule:** the status dot (gray scheduled, green paid, amber late) precedes the label.

## Do's and Don'ts

- Do keep yield, term and curator together wherever a bond appears.
- Do keep the demo ribbon and the "simulated" labels visible.
- Don't add borders to raised containers. Use one elevation system.
- Don't introduce a second accent colour, gradients, glass decoration beyond the header, or icon tiles.
- Don't nest sheets inside sheets. Tables and lists sit directly in their sheet.
- Don't use Apple logos, product imagery or copied apple.com layouts.
