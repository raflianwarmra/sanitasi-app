# DESIGN.md — Sanitasi.id

Apple's interface principles (WWDC *Designing Fluid Interfaces*, *The Details
of UI Typography*, *Principles of Great Design*) translated for an
institutional data dashboard: clarity, deference to content, depth through
materials, immediate feedback. Light mode is primary (bright offices,
projectors); dark mode is tuned, not inverted. Revised 2026-10.

## Color (Apple HIG palette, restrained)

Tokens live in `src/index.css` under `:root` and `[data-theme="dark"]`, as
**hex** on purpose: the same tokens are read by Chart.js canvases and Leaflet
SVG attributes, which must parse them in every browser (oklch() is not safe
there). Light = Apple gray canvas `#F5F5F7`, white cards, ink `#1D1D1F`,
system blue; dark = true black canvas, `#1C1C1E` cards.

| Token | Role |
|---|---|
| `--bg` | grouped canvas — Apple gray; each island remaps it (see Island themes) |
| `--paper` | the one elevated surface (cards, dialogs, popovers) |
| `--paper-2` | inset tiles inside a card (KPI, detail groups), row hover |
| `--fill` / `--fill-2` | control tracks & input fields / pressed state |
| `--ink` / `--ink-2` / `--ink-3` | text hierarchy — all ≥ 5.4:1 on every surface, both themes |
| `--line` / `--line-2` | hairlines; never a heavy divider |
| `--accent` (+`-strong`, `-soft`) | Apple blue for links, selection, focus ring (text-safe) |
| `--accent-fill` | `#0071E3` — filled buttons (white text 4.7:1) |
| `--ok` / `--warn` / `--bad` (+`-soft`) | status only; chips are tinted (color on its own soft wash) |
| `--viz-*` | chart series; `--viz-aman-deep`, `--viz-layak-light` for ladder sub-rungs |
| `--viz-ald` (+`-light`) | Air Limbah Domestik in budget charts — purple, the one hue no island accent or status color uses. Light `#9A3FC9` (5.3:1 on paper, 4.4:1 on fill), dark `#C77DFF` (6.3:1 / 5.2:1); ≥3.4:1 against the neutral bars beside it |
| `--viz-neutral` / `--viz-muted` | non-highlighted series: strong part / light part (e.g. Pemprov / kab/kota) |
| `--material` / `--scrim` | translucent chrome and modal dimming only |

Rules:
- Pure white cards on gray (and true black in dark mode) as Apple does.
- Accent ≤10% of a surface. Status colors only where they mean something.
- White text on a status color is banned (fails in dark mode) — use tinted chips.
- Choropleth ramps (`lib/mapMetrics.js`) are the one fixed-hex exception: they are
  shared with the PPTX rasterizer and must read the same in both themes.
- No gradients as decoration, no glass cards, no side-stripe accents.

## Island themes (nuansa per pulau)

When a province or kab/kota page is open, `<html data-island="…">` switches
the whole chrome to that island's nuansa — not just an accent. Tokens are
generated (light + dark, WCAG-checked) by `scripts/build_island_themes.py`
into `src/index.css`; rerun it to tune a palette.

| Island | Nuansa | Motif (hero sky) |
|---|---|---|
| Sumatera | songket emas — warm gold | songket lattice |
| Jawa | batik indigo | kawung circles |
| Bali–Nusa Tenggara | tenun ikat terakota | ikat diamonds |
| Kalimantan | hijau hutan hujan | hook spirals |
| Sulawesi | toska pesisir | chevrons |
| Maluku | merah rempah cengkih | clove stars |
| Papua | cokelat ukiran | carving waves |

What an island remaps: canvas (`--bg-base`), inset tiles (`--paper-2`),
fills, hairlines, the UI accent (`--accent`, `-fill`, `-soft`, `-strong`:
buttons, links, focus, nav pill, app mark, breadcrumb), the nav material,
dark-mode card surfaces, and `.island-page` — a hero "sky" in
`--island-hero` with the island motif drawn in `--island-motif` through a
mask, densest top-right behind the controls, clear of the title. The header
shows an island badge + its nuansa name.

What it never remaps: `--viz-*`, ok/warn/bad, map ramps, chart and table
colors — a province in Papua must read with the same color rules as one in
Jawa. Light-mode cards stay pure white so data surfaces are identical.

Switching islands cross-fades: the theme colors are registered `@property`
`<color>` tokens transitioned on `html` (off under reduced motion; motif
hidden under `prefers-contrast: more`; softened on phones).

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
- Figures use `.num` (tabular numerals). Charts use 11px minimum text.
- Titles use the display stack (SF Pro Display); page h1 2.25rem.
- **Charts**: the sanitation ladder (`LadderChart`, Screen Time-style
  segmented capsule) and the province benchmark (`BenchmarkChart`, bar list
  with dashed reference lines) are plain HTML/CSS — no canvas — so they draw
  in every browser. Budget charts (`RpBars`: `ShareBar` capsule and
  `RpBarList`) reuse the same `.ladder-*` / `.bench-*` pieces with a wider
  Rupiah value column (`.bench-rp`). Only ALD carries color; every other
  sector stays neutral. A stacked row puts parts of one whole (Pemprov +
  kab/kota) on one bar, so both read on the same scale. Trend charts use Chart.js with hex tokens, rounded bars,
  11px ticks; defaults are adjusted in place, never replaced.

## Surfaces & components

- **Card** (`.card`, `SectionCard`): radius 20, no border, very soft shadow,
  24px padding. Header = headline + caption, no divider; spacing groups.
- **Inside a card, never another bordered card** — use inset tiles
  (`.kpi`, `.inset`): `--paper-2` fill, radius 12, no border.
- `MetricCard` — Apple Health tile: colored dot + label, large **SF Pro
  Rounded** figure (`--font-rounded`), gray context, optional meter. The
  figure is colored only for status (ok/warn/bad).
- Buttons are capsules: `.btn`/`.btn-accent` filled blue, `.btn-secondary`
  tinted, `.btn-ghost` gray fill; `.icon-btn` round 38px (44 mobile).
- **Segmented control** (`.seg`): fill track, selected thumb on `--paper` with
  a small shadow.
- **Inputs**: filled fields; focus = accent border + 3px soft ring.
- `SearchableSelect` — WAI-ARIA combobox/listbox: ↑↓ Home End Enter Esc,
  focus returns to the trigger; popover anchored to its trigger.
- Tables (`.data-table`): sticky header, hairline rows; clickable rows use
  `rowLinkProps()` (Tab + Enter/Space, visible focus ring).
- `BumdCard` — status score scale (0–5, thresholds 2,2/2,8), FCR tariff vs HPP,
  customers, coverage meter, revenue & profit, explicit coverage caveat.
- `AnggaranCard` — APBD 2026 bidang PU for a Pemprov or kab/kota, with a
  segmented control for *Ringkasan* (ALD figure, rank, ALD share capsule,
  sector bar list; provinces add Pemprov vs agregat) and *Rincian ALD*
  (sub-kegiatan grouped by kelompok; provinces list every kab/kota as
  disclosure rows that open their detail). `AnggaranNasional` ranks the
  provinces on the national view. Caveats (stage unknown, Penunjang kept
  apart, what the aggregate leaves out) are always shown as captions.
- Detail lists (`.ald-item`) are a four-column table on desktop and stacked
  rows on phones (amount stays top-right, the rest goes full width), using
  grid areas rather than a scrolling table.
- `EmptyState` teaches the next step; skeletons for panel loading.

## Materials & depth

- Translucency is functional chrome only: the sticky `TopNav` is a material
  (`backdrop-filter: saturate(180%) blur(20px)`) with content scrolling under
  it. Instead of a hairline, a soft scroll-edge fade appears once content is
  under the bar.
- Modals pair a dialog with a dimming, lightly blurred `.scrim`.
- `prefers-reduced-transparency` → solid chrome; `prefers-contrast: more` →
  solid chrome, stronger hairlines, outlined tiles.

## Motion & interaction

One motion language, so every surface moves the same way. Nothing is a
one-off timing.

**Springs, not durations** (`src/lib/spring.js`). Every curve is defined as
an Apple spring, with a damping ratio and a response time:

| Token | Damping / response | Used for |
|---|---|---|
| `smooth` | 1 / 0.40s | repositioning, page-level moves |
| `snappy` | 1 / 0.30s | popovers, dialogs, press release |
| `sheet` | 1 / 0.36s | tap-opened sheets |
| `flick` | 0.8 / 0.32s | only after a momentum gesture (the one place with bounce) |

- **One source for CSS and JS.** `installSpringTokens()` samples each spring
  into a CSS `linear()` easing plus its settle time, as `--spring-NAME` and
  `--spring-NAME-dur`. Engines without `linear()` get a matching ease-out.
  `animateSpring()` integrates the same spring per frame for gesture
  releases.
- **Interruptible.** CSS transitions retarget from the on-screen value. A
  JS spring can be stopped mid-flight, and a new grab continues from where
  the surface is; nothing snaps back to its start.
- **Press feedback on touch-down:** `:active` scales to 0.97 on every
  tappable surface.

**Direct manipulation** (`useDragDismiss`):
- The mobile menu sheet (drag right) and the infrastructure bottom sheet
  (drag the grabber down) follow the finger 1:1 after a 10px intent
  threshold.
- Past the open position they resist with a rubber band.
- On release, the flick's momentum is projected
  (`v·d/(1−d)`, d = 0.998) to decide close vs. stay. The finger's velocity
  is then handed to the spring, so a hard flick closes even from a short
  drag.

**Spatial consistency.** Things leave the way they came:
- The menu sheet goes back to the right.
- On desktop, the infrastructure dialog zooms out of the table row that
  opened it, and back into it on close (`useZoomFromOrigin`). On phones it
  is a bottom sheet.
- Popovers grow from their trigger. Entry uses `@starting-style`;
  `usePresence` keeps overlays mounted through their exit.

**Depth.** While a modal is open, the page behind recedes: scale 0.985 and
less saturation, around the viewport centre (`html[data-modal]`). It
returns when the modal closes.

**Navigation is one continuous transition.** Route changes, back/forward and
province/kab-kota picks run inside a View Transition (`withViewTransition`):
- The top bar stays put.
- The page title morphs.
- The island theme colours cross-fade through `@property`-registered
  tokens.

**Completion feedback.** Saving a note or exporting CSV/PPTX posts a toast
(`toast()` → `Toaster`, a polite live region). It enters from below, lives
2.8s, and leaves the same way. Failures use the `bad` tone.

**Reduced motion.** Movement, scale, blur, the page recede and View
Transitions are dropped. Short opacity fades remain (feedback is kept,
vestibular motion is not). Gestures still work, but release without the
bounce. Charts don't animate.

## Shared vocabulary (no one-off layouts)

- `PageHeader`: title, then an identity line (island badge + nuance ·
  scope), a meta line, and right-aligned controls. On mobile the controls
  become a full-width toolbar: pickers share a row, the export pair shares
  the next.
- `.inline-list`: "·"-separated lines. The separator that would lead a
  wrapped line is clipped, so no dot ever dangles at a line edge.
- `.metric-grid`: every row of `MetricCard`s. An odd last tile spans the row
  on phones instead of sitting alone.
- `.legend` / `.legend-item` / `.legend-swatch`, `.map-frame`,
  `.map-tooltip`, `.with-panel` / `.side-panel`, and `tr[data-selected]`:
  the same pieces on every page.

## Accessibility

- Focus ring 2.5px accent, offset 2; skip link to `<main>`; dialogs and the
  menu sheet trap focus, close on Esc, restore focus to the trigger.
- Scrollable regions are focusable and labelled.
- Touch targets ≥ 44px on mobile, including small buttons, segmented controls and crumbs.
- Verified with axe-core (WCAG 2.1 A/AA): zero violations on all four pages,
  light and dark.

## Density & layout

- `page-pad`: 24px desktop / 16px mobile. Max content width 1200px.
- Spacing rhythm: 8 / 12 / 16 / 20 / 24 / 40; cards stack with 20px gaps (`.stack`).
- Mobile: single column, horizontal scroll only inside dense tables.
