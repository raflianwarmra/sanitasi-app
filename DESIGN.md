# DESIGN.md — Sanitasi.id

Water-infrastructure design language: clean, calm, analytical. Light mode is
primary (bright offices, projectors); dark mode is supported and tuned.

## Color (OKLCH, restrained strategy)

Tokens live in `src/index.css` under `:root` and `[data-theme="dark"]`.

| Token | Role |
|---|---|
| `--bg` | app background — very soft blue-tinted off-white |
| `--paper` | card/panel surface |
| `--paper-2` | secondary surface (table headers, filter bars) |
| `--ink` / `--ink-2` / `--ink-3` | text hierarchy — deep navy ink, tinted toward hue 235 |
| `--line` / `--line-2` | borders, 1px only |
| `--accent` | teal/cyan (hue ~200) — primary actions, selection, "Aman" data |
| `--ok` | muted green — good status, "Layak" progress |
| `--warn` | amber — warnings, incomplete regulation |
| `--bad` | rose/red — risk, BABS, non-functioning assets only |
| `--viz-layak` | blue (hue ~245) for Layak series |
| `--viz-aman` | teal for Aman series |
| `--viz-babs` | rose for BABS series |
| `--viz-muted` | grey-blue for "dasar/belum layak" remainder |

Rules:
- Never pure #000/#fff; all neutrals carry a whisper of the navy hue.
- Accent ≤10% of any surface. Status colors only where they mean something.
- BABS/risk red is reserved: never decorative.
- No gradients, no glass, no side-stripe (`border-left`) accents.

## Typography

- Single family: **Inter** (400/500/600/700) for everything.
- Data figures use `font-variant-numeric: tabular-nums` (class `.num`).
- Mono (`JetBrains Mono`) only for kode/identifier strings, nothing else.
- Scale (rem-fixed): 11 / 12 / 13 / 15 / 18 / 22 / 28. Body 13–14px in-app.
- Section labels: 11px, weight 600, letter-spacing 0.06em, uppercase, ink-3.

## Components

- `SectionCard` — 1px border, radius 8, paper surface, title row w/ actions.
- `MetricCard` — label + tabular number + context line. No colored borders;
  status shown via a small dot/delta, not surfaces.
- `PageHeader` — kicker (section label) + h1 + meta + right-side controls.
- `EmptyState` — icon, one sentence, optional action. Teaches, never blank.
- Buttons: `.btn` solid ink (primary), `.btn-accent` teal, `.btn-ghost`
  outline. Radius 7. Focus ring 2px accent, offset 2.
- Tables: `.data-table` — 12–13px, paper-2 header, hover row tint, sticky
  header where scrollable.
- Charts (Chart.js): grid lines low-contrast, no chart junk, legends
  rendered in HTML (not canvas) for a11y, colors from `--viz-*`.
- Choropleth (`ProvinceKabkotMap`): sequential teal scale for Aman/Layak,
  sequential rose scale for BABS, 5-step legend with thresholds, hover
  tooltip + click navigates to kab/kota profile.

## Motion

- 150–200ms ease-out only. State feedback, not choreography.
- Respect `prefers-reduced-motion`.

## Density & layout

- `page-pad`: 24px desktop / 16px mobile. Max content width 1320px.
- Spacing rhythm: 8 / 12 / 16 / 24 / 40.
- Mobile: single column, 44px touch targets, horizontal scroll allowed only
  inside dense tables.
