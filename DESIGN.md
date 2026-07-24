---
version: alpha
name: TODO Hunter
description: >-
  Cozy pixel-RPG console UI. A warm parchment canvas framed by crisp
  Game-Boy-style double-line windows, driven by a single quest-red accent.
colors:
  primary: "#151413"
  secondary: "#B0AAA1"
  tertiary: "#C84B3A"
  tertiary-active: "#A33A2C"
  neutral: "#E9E3D7"
  on-primary: "#E9E3D7"
  on-tertiary: "#FFFFFF"
  stat-strength: "#E07A82"
  stat-intellect: "#6B8FB8"
  stat-charm: "#E89BB5"
  stat-finance: "#6AAF6A"
  stat-life: "#E0A04E"
  stat-stress: "#9E7AC0"
  error: "#A72F35"
  success: "#2049BD"
  warning: "#D5B946"
typography:
  display:
    fontFamily: "Galmuri11Bold, sans-serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.2
  heading:
    fontFamily: "Galmuri11Bold, sans-serif"
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Galmuri9, Pretendard, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Galmuri9, Pretendard, sans-serif"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1.4
rounded:
  none: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
components:
  surface:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    padding: 12px
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    padding: 6px
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.heading}"
    rounded: "{rounded.none}"
    padding: 12px
  button-primary-active:
    backgroundColor: "{colors.tertiary-active}"
    textColor: "{colors.on-tertiary}"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    padding: 8px
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    padding: 8px
  tab-inactive:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.none}"
    padding: 8px
  meter-track:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.none}"
    height: 12px
---

## Overview

**Cozy Pixel-RPG Console.** The interface reads like a handheld role-playing
game rendered on warm paper — a Game Boy dialog box printed on a broadsheet.
Every surface is a framed window, every edge is crisp, and nothing is smooth.
The mood is nostalgic and tactile, not slick or modern.

Two ideas govern the whole system:

1. **Framed windows, not floating cards.** Content lives inside pixel window
   frames, the way a console game boxes its menus and dialogs. There are no soft
   shadows and no rounded corners.
2. **One accent, earned.** A single quest-red (`tertiary`) marks the one thing
   the player should act on — the primary button, the active tab. Everything else
   is built from three neutral tones.

## Colors

The palette is a three-tone parchment neutral plus one red accent. In code these
map to the `--pixel-*` and `--brand-*` custom properties.

- **Primary — `#151413` (ink).** Near-black. Body text, frame lines, meter
  tracks, and dark accent chips (the LV badge, condition banner). Paired with the
  neutral it clears WCAG AA with wide margin. Code: `--pixel-ink`.
- **Secondary — `#B0AAA1` (stone).** Mid-tone greige. Captions and sub-labels,
  and — critically — the middle band of the window frame that gives it depth.
  Code: `--pixel-stone`.
- **Tertiary — `#C84B3A` (quest red).** The sole driver of interaction: the main
  CTA and the active state. Use it sparingly — at most one per view.
  `tertiary-active` is its pressed shade. Code: `--brand-red`.
- **Neutral — `#E9E3D7` (paper).** Warm parchment. The canvas for every screen
  and the fill inside every window frame. Never pure white. Code: `--pixel-paper`.

**Stat hues** (`stat-strength` … `stat-stress`) fill the six character meters as
a categorical scale — each stat owns one color so the player reads the bar by
hue, not by label. They are data, not chrome: never reuse them for buttons,
borders, or backgrounds.

`error` / `success` / `warning` are reserved for system feedback (form
validation, toasts) and should not appear in ordinary layout.

## Typography

Pixel bitmap type is the voice of the system. Korean and Latin both render in
Galmuri, a pixel font, so text sits naturally beside the pixel frames.

- **`display` / `heading`** — Galmuri11 Bold. Screen titles, nicknames, card
  values, the number in the LV badge. Bold pixel weight; never anti-aliased-soft.
- **`body` / `caption`** — Galmuri9 (falling back to Pretendard for long
  passages). Labels, stat descriptions, metadata. Caption weight is bold to stay
  legible at 10px.

Keep type small and dense — this is a stats screen, not an article. Center card
titles and values; left-align lists.

## Layout

A single mobile column, capped at **460px** and centered, sitting on a 92%-width
content band. Screens stack framed sections with an 8px gap:

`header → hero row (portrait + level/condition/traits) → stat panel → tabs`

Inside the hero row, the character portrait is a fixed 150px card on the left; a
flexible column of small framed cards fills the right to match its height.
Spacing is tight (4–16px) — the density is part of the console feel.

## Elevation & Depth

**There is no elevation.** No drop shadows, no blur, no layering. Depth is
implied entirely by the window frame, the way a Game Boy screen fakes a raised
panel with lines rather than light.

The one dark accent — `primary`-filled chips (LV badge, condition banner) on a
`neutral` field — creates hierarchy through contrast, not shadow.

## Shapes

**Everything is square.** `rounded.none` (0px) is the only radius. Rounded
corners break the pixel grid and read as "modern," which this system rejects.

The signature shape is the **pixel window frame** — a three-tone double line:

```
outer line (primary, 2px) + middle band (secondary, 2px) + inner line (primary, 2px)
```

Implemented as a 2px `primary` border plus two inset box-shadows
(`secondary` then `primary`), rendered with `image-rendering: pixelated`. It
wraps every surface (cards, stat panel, KPI tiles) so the whole screen reads as
one system of console windows.

Meters are flat rectangles: a `primary` track with a solid stat-hue fill, no
radius.

## Components

- **`surface`** — The base pixel window. `neutral` fill, the three-tone frame,
  square corners. All cards derive from it.
- **`badge`** — A solid `primary` chip with `on-primary` text, for compact
  emphasis (the LV badge, the condition banner). The only routine dark fill.
- **`button-primary`** — `tertiary` fill, white text, square, with a hard 2–3px
  offset pixel shadow that collapses on `:active` (the button visibly presses in).
  One per view.
- **`button-secondary`** — `neutral` fill, `primary` text, framed. For
  non-primary actions like the settings entry.
- **`tab-active` / `tab-inactive`** — Segmented tabs. Active is a `primary` fill
  with `on-primary` text and a leading `▶` selection arrow (a console-menu cue);
  inactive is `secondary` text on `neutral`.
- **`meter-track`** — A 12px `primary` rectangle; the fill is the relevant stat
  hue at the value's width.

## Do's and Don'ts

**Do**

- Frame every surface with the three-tone pixel window.
- Keep the accent scarce — one `tertiary` element per view.
- Use `primary` chips against `neutral` for emphasis instead of shadow.
- Render pixel assets and frames with `image-rendering: pixelated`.
- Let stat hues carry meaning; keep chrome to the three neutrals.

**Don't**

- Don't round corners, add drop shadows, blur, or gradients — they read as
  "modern" and break the console feel.
- Don't use pure white or pure black; the neutrals are warm `neutral` and
  `primary`.
- Don't spread `tertiary` across multiple elements in one view.
- Don't reuse stat hues for buttons, borders, or backgrounds.
- Don't anti-alias-soften pixel type; keep it crisp and small.
