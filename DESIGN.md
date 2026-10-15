# DESIGN.md — Sanitasi.id

Apple's interface principles (WWDC *Designing Fluid Interfaces*, *The Details
of UI Typography*, *Principles of Great Design*) translated for an
institutional data dashboard: clarity, deference to content, depth through
materials, immediate feedback. Light mode is primary (bright offices,
projectors); dark mode is tuned, not inverted. Revised 2026-10.

## Color (OKLCH, restrained)

Tokens live in `src/index.css` under `:root` and `[data-theme="dark"]`.

| Token | Role |
|---|---|
| `--bg` | grouped canvas — light cool gray; island pages tint it 6% |
| `--paper` | the one elevated surface (cards, dialogs, popovers) |
| `--paper-2` | inset tiles inside a card (KPI, detail groups), row hover |
| `--fill` / `--fill-2` | control tracks & input fields / pressed state |
| `--ink` / `--ink-2` / `--ink-3` | text hierarchy — all ≥ 5.4:1 on every surface, both themes |
| `--line` / `--line-2` | hairlines; never a heavy divider |
| `--accent` (+`-strong`, `-soft`) | teal tint — primary action, selection, focus ring |
| `--ok` / `--warn` / `--bad` (+`-soft`) | status only; chips are tinted (color on its own soft wash) |
| `--viz-*` | chart series; `--viz-aman-deep`, `--viz-layak-light` for ladder sub-rungs |
| `--material` / `--scrim` | translucent chrome and modal dimming only |

Rules:
- Never pure #000/#fff; neutrals carry the navy hue.
- Accent ≤10% of a surface. Status colors only where they mean something.
- White text on a status color is banned (fails in dark mode) — use tinted chips.
- Choropleth ramps (`lib/mapMetrics.js`) are the one fixed-hex exception: they are
  shared with the PPTX rasterizer and must read the same in both themes.
- No gradients as decoration, no glass cards, no side-stripe accents.

## Typography

- **System font stack** (`--font-sans`: SF Pro on Apple, Segoe UI Variable on
  Windows) — ships optical sizing and tracking tables; no web-font download.
  Mono (`--font-mono`) only for kode/identifier strings.
- Sizes in **rem** and `html { font-size: 100% }` so the reader's browser text
  size is respected. Inline styles use rem too.
- Scale (weight + size + leading as a set; tracking tightens as size grows):

| Class | Size | Weight / leading / tracking |
|---|---|---|
| `.text-largetitle` | 2rem | 700 / 1.12 / −0.024em |
| `.text-title` (page h1) | 1.625rem | 700 / 1.18 / −0.021em |
| `.text-title2` | 1.25rem | 650 / 1.25 / −0.016em |
| `.text-headline` (card titles) | 1rem | 600 / 1.35 / −0.011em |
| `.text-body` | 0.875rem | 400 / 1.5 / −0.003em |
| `.text-caption` | 0.78125rem | 400 / 1.45 / +0.002em |
| `.text-caption2` | 0.71875rem | floor — nothing smaller ships |

- `.section-label` groups content *inside* a card, sentence case. No
  eyebrow/kicker above page headings: the h1 comes first, context follows.
- Figures use `.num` (tabular numerals). Charts use the same family, 11px min.

## Surfaces & components

- **Card** (`.card`, `SectionCard`): radius 14, hairline border, soft offset
  shadow. Header = headline + caption, no divider; spacing groups.
- **Inside a card, never another bordered card** — use inset tiles
  (`.kpi`, `.inset`): `--paper-2` fill, radius 12, no border.
- `MetricCard` — label → tabular figure → context line, optional 0–100 meter.
- Buttons (radius 10): `.btn` filled ink, `.btn-accent` filled teal,
  `.btn-secondary` tinted, `.btn-ghost` gray fill; `.icon-btn` 38px (44 mobile).
- **Segmented control** (`.seg`): fill track, selected thumb on `--paper` with
  a small shadow.
- **Inputs**: filled fields; focus = accent border + 3px soft ring.
- `SearchableSelect` — WAI-ARIA combobox/listbox: ↑↓ Home End Enter Esc,
  focus returns to the trigger; popover anchored to its trigger.
- Tables (`.data-table`): sticky header, hairline rows; clickable rows use
  `rowLinkProps()` (Tab + Enter/Space, visible focus ring).
- `BumdCard` — status score scale (0–5, thresholds 2,2/2,8), FCR tariff vs HPP,
  customers, coverage meter, revenue & profit, explicit coverage caveat.
- `EmptyState` teaches the next step; skeletons for panel loading.

## Materials & depth

- Translucency is functional chrome only: the sticky `TopNav` is a material
  (`backdrop-filter: saturate(180%) blur(20px)`) with content scrolling under
  it; its hairline + edge shadow appear only once content is under the bar.
- Modals pair a dialog with a dimming, lightly blurred `.scrim`.
- `prefers-reduced-transparency` → solid chrome; `prefers-contrast: more` →
  solid chrome, stronger hairlines, outlined tiles.

## Motion

- Feedback on **press-down**: `:active { transform: scale(0.97) }` in 60–110ms
  on every tappable surface (buttons, rows, segmented, nav).
- Exponential ease-out (`--ease-out`), no overshoot; 180–360ms. Charts animate
  260ms. No page-load choreography.
- **Spatial consistency**: the mobile menu sheet enters from the right and
  leaves to the right on the same curve (`--ease-sheet`); dialogs materialize
  (opacity + scale + blur) and dematerialize the same way; popovers grow from
  their trigger. Entry via CSS `@starting-style`; overlays stay mounted through
  exit (`usePresence`), and CSS transitions retarget from the current value if
  reopened mid-exit.
- `prefers-reduced-motion`: movement, scale and blur are dropped; short
  opacity cross-fades remain (feedback is kept, vestibular motion is not).
  Charts don't animate.

## Accessibility

- Focus ring 2.5px accent, offset 2; skip link to `<main>`; dialogs and the
  menu sheet trap focus, close on Esc, restore focus to the trigger.
- Scrollable regions are focusable and labelled.
- Touch targets ≥ 44px on mobile (crumbs ≥ 39px, above the 24px WCAG minimum).
- Verified with axe-core (WCAG 2.1 A/AA): zero violations on all four pages,
  light and dark.

## Density & layout

- `page-pad`: 24px desktop / 16px mobile. Max content width 1200px.
- Spacing rhythm: 8 / 12 / 16 / 20 / 24 / 40; cards stack with 20px gaps (`.stack`).
- Mobile: single column, horizontal scroll only inside dense tables.
