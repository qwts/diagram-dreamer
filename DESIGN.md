---
version: alpha
name: Vellum
description: Visual identity for the Mermaid document renderer. Quiet drafting-paper chrome; the diagram is the star.
colors:
  primary: "#16181A"
  secondary: "#5C6470"
  tertiary: "#0E7C7B"
  tertiary-hover: "#0B6362"
  tertiary-surface: "#F0F7F6"
  on-tertiary: "#FFFFFF"
  neutral: "#FAFAF8"
  surface-raised: "#FFFFFF"
  muted: "#F2F1ED"
  border: "#E3E1DC"
  border-strong: "#8D887C"
  danger: "#B3261E"
  danger-surface: "#FBEAE9"
  warning: "#8A5A00"
  warning-surface: "#FDF3E0"
  success: "#1E7B34"
  success-surface: "#E9F2EB"
  neutral-dark: "#141619"
  surface-raised-dark: "#1D2024"
  muted-dark: "#23272C"
  primary-dark: "#E8E6E1"
  secondary-dark: "#9BA3AD"
  tertiary-dark: "#3FBDB8"
  tertiary-hover-dark: "#58CDC8"
  tertiary-surface-dark: "#17302F"
  on-tertiary-dark: "#0B1416"
  border-dark: "#2A2E33"
  border-strong-dark: "#6A717D"
  danger-dark: "#F2B8B5"
  danger-surface-dark: "#38211F"
  warning-dark: "#E0A949"
  warning-surface-dark: "#33280F"
  success-dark: "#6CD48A"
  success-surface-dark: "#25322E"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: -0.01em
  h2:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.45
  code:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  label-caps:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: 600
    letterSpacing: 0.06em
rounded:
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  2xs: 2px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.sm}"
    padding: 8px
  button-primary-hover:
    backgroundColor: "#0B6362"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 8px
  panel:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.md}"
    padding: 16px
  editor:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    typography: "{typography.code}"
  error-card:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: 16px
  agent-chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.lg}"
    padding: 4px
---

## Overview

Drafting-table minimalism. Vellum treats the app chrome as warm, matte paper — quiet enough that rendered diagrams, which bring their own color, are always the loudest thing on screen. Ink for text, slate for structure, and a single teal accent ("Lagoon") that means exactly one thing: _you can interact with this_. The feel is a precision drawing instrument, not a dashboard.

Dark mode is a first-class surface, not an inversion: the same semantic roles map to the `*-dark` tokens (graphite paper, bone ink, brightened Lagoon for contrast on dark).

## Colors

- **Primary (#16181A):** Near-black ink. Headlines, body text, editor foreground.
- **Secondary (#5C6470):** Slate. Metadata, captions, inactive tabs, dividers pair with `border`.
- **Tertiary (#0E7C7B):** Lagoon. The sole interactive accent — buttons, links, active states, focus rings, agent-activity indicators. If it isn't interactive or live, it isn't Lagoon.
- **Neutral (#FAFAF8):** Warm paper. App background and editor surface; softer than pure white so exported white-background diagrams still read as distinct objects.
- **Surface-raised (#FFFFFF):** Panels, cards, dialogs — one step above paper, separated by `border`, not shadow-first.
- **Border vs Border-strong:** `border` (#E3E1DC) is a _divider_ — it separates surfaces and sits at roughly 1.25:1, which is deliberate and correct for something purely decorative. `border-strong` (#8D887C) is for a boundary that **identifies a control**: the secondary button, which DESIGN.md defines as paper-on-paper with a border, and form inputs. Those clear 3:1 because WCAG 1.4.11 governs them. If a border is the only thing telling the user something is interactive, it is `border-strong`; otherwise it is `border`.
- **Muted (#F2F1ED):** Recessed paper. The one step _below_ surface-raised: inert pill backgrounds, secondary-button hover, disabled or disconnected chrome. Never carries meaning on its own — it is the absence of state, which is why it is not one of the status colors.
- **Danger / Warning / Success:** Diagnostics only (parse errors, lint findings, agent permission prompts). Never decorative. Every status color is always paired with an icon or text label — color is never the sole signal.
- **The `*-surface` tints:** each semantic color that can back a filled region has an explicit surface token — `tertiary-surface`, `danger-surface`, `warning-surface`, `success-surface`. Use them; never approximate one with an alpha of the base color. A 10% Lagoon tint reads as the same idea but only reaches 4.4:1 against Lagoon text, which fails AA — the tokens are tuned to clear 4.5:1 in both themes.
- **Dark set:** every role above has a `*-dark` counterpart, not just the neutrals — the diagnostic colors and their surfaces are re-picked for dark rather than reused, because a tint that works on paper turns muddy on graphite. `tertiary-dark` is brightened to hold ≥4.5:1 on dark surfaces.

Contrast is a token-level contract, not a per-screen concern: `npm run check:contrast` verifies every text-bearing pair in both themes against WCAG 2.1 AA and fails the build otherwise. It also asserts the values here still match `src/styles.css`.

## Typography

Inter for UI (broad glyph coverage across Latin, Cyrillic, Greek — a deliberate i18n choice), JetBrains Mono for everything source-shaped: the editor, diagram block identifiers, agent tool-call payloads, diff previews. `label-caps` is reserved for locale-safe system labels (pane titles, kbd hints); translatable strings never get the all-caps treatment — many scripts have no casing.

Type scale is compact because this is a desktop working tool: `body-md` at 15px is the default UI voice; `code` at 14px/1.6 keeps dense diagram source readable.

## Layout & Spacing

8px base grid via the `spacing` scale; `xs` (4px) only for intra-component gaps, and `2xs` (2px) reserved for optical corrections inside a control — pill padding, icon baseline nudges — never for layout. The canonical layout is a two-pane split (source left, preview right; mirrored under RTL — all layout uses logical properties). Panels get `md` internal padding; the preview canvas gets generous `lg`+ margins so diagrams never touch chrome. Touch/click targets are minimum 32px with 40px preferred for primary actions.

## Elevation & Depth

Border-first, shadow-second. Raised surfaces are distinguished by `border` and background step; shadows appear only on overlays (dialogs, permission prompts, command palette) and stay soft and low-spread. Nothing in the chrome should cast a shadow onto a diagram.

## Shapes

`sm` (4px) for controls, `md` (8px) for panels and cards, `lg` (12px) reserved for pills and the agent-activity chip. No fully-round rectangles on structural surfaces — this is a drafting tool, not a toy.

## Components

- **button-primary:** Lagoon fill, white text. **One per surface maximum** — a surface being a toolbar, a panel, a card, or a dialog, not the whole screen. The workspace legitimately shows several at once (the prompt's send button, a permission card's _Allow once_, a diff card's _Accept edit_, a dialog's _Save changes_) because each is the single dominant action of its own surface, and they are never in visual competition. Two primaries inside one card or one toolbar is the thing this rule forbids.
- **button-secondary:** Paper-on-paper with a border; the default button.
- **editor:** Paper surface, mono type, error underlines in `danger` with gutter badges (icon + line number, not color alone).
- **error-card:** Inline per-block diagnostic in the preview — a failed diagram renders this card in place; sibling diagrams are unaffected.
- **agent-chip:** Persistent, small, honest — shows agent session state (idle / streaming / awaiting-permission). Awaiting-permission adds a Lagoon ring; it pulses only if `prefers-reduced-motion` is unset.
- **Focus ring (all interactive elements):** 2px `tertiary` outline, 2px offset, visible on every focusable element in both themes. Non-negotiable; treat as a component invariant even though it has no token entry here.

## Do's and Don'ts

- **Do** reserve `tertiary` exclusively for interactive/live elements — its meaning is the product's affordance language.
- **Do** keep motion under 150ms (fades and position eases only) and honor `prefers-reduced-motion` everywhere, including diagram re-render transitions.
- **Do** use logical CSS properties exclusively; the RTL build is a first-class target.
- **Don't** let chrome tokens leak into rendered diagram internals — Mermaid theming is a separate, user-facing system (per-document frontmatter), not part of this identity.
- **Don't** signal state with color alone; pair with icon, text, or shape.
- **Don't** use `label-caps` on translatable strings. In practice this means pane titles ("Source", "Preview", "Agent") carry the `label-caps` size, weight and tracking but **not** `text-transform: uppercase` — casing is the part that does not survive translation.
- **Don't** introduce new colors for features; new semantics must map to existing roles or be added here first, through a lint-gated PR.
