# Plan: Infrastruktur Tab Reform

Status: **Draft — proposing options, needs your picks before build.** You said
you don't have a concrete idea yet; this is a menu of reform modules grounded
in the PM brief's requirement that the tab answer: *which assets exist, which
are functioning, which aren't, which are underutilized, which have recent
notes, and where are the gaps* — none of which the current single-scroll
layout answers at a glance today.

## 1. What's weak today

Current structure: filter bar → 2 summary cards (IPAL/IPLT) → map → table →
detail side-panel. Concretely:
- No headline interpretation — you have to read the summary cards yourself to
  know if things are "fine" or "concerning."
- "Underutilized" assets are buried as a one-line count inside the summary
  card, not a place you can act on.
- No prioritized "fix these first" view — non-functioning, low-utilization,
  old-build, and no-recent-notes assets are all separately filterable but
  never combined into "here's what needs attention most."
- No coverage-gap view *inside this tab* — "which kab/kota have zero
  IPAL/IPLT" currently only exists on the Provinsi page's alerts, despite
  Infrastruktur being the more natural home for it.
- Notes/logs are only visible per-asset (open the detail panel, check the
  Catatan tab) — there's no way to see "what's been logged recently across
  everything" without clicking through assets one at a time.
- The map plots every point with no clustering; at national zoom with filters
  cleared, dense areas (Jawa) become an unreadable pile of overlapping dots.

## 2. Proposed modules (pick what you want; not all are required)

**A — Executive band (recommended, foundational)**
A short KPI + interpretation strip at the very top, before the filter bar:
Total assets, % functioning, % underutilized (<30%), kab/kota with a
coverage gap — plus one generated sentence, e.g. "87% aset berfungsi normal;
14 unit memerlukan perhatian; 22 kab/kota belum memiliki IPLT." Mirrors the
executive-view pattern already used on Provinsi/Kab-Kota pages. This is the
direct fix for "quickly identify asset status and risk."

**B — Tabbed structure: Ringkasan / Aset / Catatan Lapangan (recommended)**
Splits the current one-long-scroll page into three views behind a segmented
control, so users land on a summary instead of scrolling past it:
- *Ringkasan*: Module A's KPI band + Module C's at-risk list + the map.
- *Aset*: today's filterable table + detail side-panel, unchanged in
  function, just moved to its own tab.
- *Catatan Lapangan* (new): aggregate feed of all logs across all assets,
  newest first, filterable by province/kab-kota/date range — currently this
  data exists (`useLog()`) but has no standalone view.
This directly implements the PM brief's "executive view / analytical detail"
two-layer principle, specifically for this page.

**C — "Unit Berisiko" (at-risk) ranked list (recommended)**
A short, ranked list (top 8–10) combining: non-functioning status +
utilization <30% + no notes in the last N months + old build year, into one
composite view. Not a replacement for the full table — a shortcut to "what
should I look at first." Lives in the Ringkasan tab.

**D — Coverage-gap module**
Small card/table: kab/kota with zero IPAL and/or zero IPLT nationally
(or within the current province/kab-kota filter). Reuses logic already
written for the Provinsi page's `kabsNoIPLT` alert, generalized to also check
IPAL and to run against the full dataset rather than one province.

**E — Map clustering + secondary color mode**
Add marker clustering (Leaflet's standard clustering plugin) so national/
unfiltered views collapse dense areas into a count bubble instead of an
unreadable pile of dots. Optionally add a toggle to color markers by
utilization band instead of functioning-status, for a second "which assets
are underused" view on the same map without a second map.

**F — Filtered-vs-national benchmark**
When a province/kab-kota filter is active, show a small inline comparison
("this filter: 62% functioning · nationally: 81% functioning") next to the
KPI band, so a filtered view doesn't lose context of how it compares.

## 3. Recommended combination for this pass

**A + B + C + D**, skip E and F for now — E is a real UX win but pulls in a
new mapping dependency (Leaflet marker-cluster) and needs its own testing
pass; F is a nice-to-have that's easy to add later once B's tab structure
exists. Confirm if you'd rather include E/F now, or want a smaller/larger
first pass than A+B+C+D.

## 4. Technical approach (for the recommended set)

- `Infrastruktur.jsx`: introduce a `view` state (`ringkasan | aset | catatan`)
  driving a `SegmentedControl`-style tab bar (reuse the `.seg` CSS class
  already used elsewhere), each view rendering a distinct section instead of
  today's single always-visible stack.
- New `computeInfraExecutiveSummary(allInfra)` helper in `lib/` — used by both
  the Ringkasan KPI band and (later) the PPTX/CSV export, so the "% functioning"
  number is computed once, consistently.
- New `RiskList` component — sorts/filters `allInfra` by a simple composite
  score (non-functioning=3pts, utilization<30%=2pts, no note in 6mo=1pt,
  build year>15yr old=1pt), shows top N with a "why it's here" tag per item.
- New `CoverageGapCard` — generalizes the existing `kabsNoIPLT` computation
  from `Provinsi.jsx` into a shared `lib/coverage.js` function taking
  `(kabkotList, infraList, type)`, reused by both this tab and Provinsi.
- New `NotesFeed` component for the Catatan Lapangan tab — flat, sorted,
  filterable list over `useLog()`'s existing data, no new fetch.
- No change to the underlying data layer (`useIPAL`, `useIPLT`, `useLog`)
  beyond the new shared `lib/coverage.js` helper.

## 5. Open questions

1. Confirm the A+B+C+D recommended set, or adjust.
2. For Module C's risk score, are the weighting/criteria in §4 reasonable, or
   do you want different weights (e.g., non-functioning should dominate more
   heavily than "no recent notes")?
3. Should the Catatan Lapangan tab allow adding a note directly (it already
   can per-asset via the detail panel), or stay read-only as an overview feed
   that links back into the Aset tab to add notes?

## 6. Acceptance criteria

- Landing on Infrastruktur shows an executive summary before any filtering.
- At-risk assets are visible without manually cross-referencing filters.
- Coverage gaps (kab/kota with zero IPAL/IPLT) are visible in this tab, not
  only on Provinsi.
- All logs are browsable in aggregate, not only per-asset.
- Existing filter/search/table/detail-panel functionality is fully preserved
  inside the Aset tab — nothing removed, only relocated and supplemented.
