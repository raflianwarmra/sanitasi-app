# Plan: Island-Based Regional Design Theming

Status: **Draft — needs explicit sign-off before build.** This is the most
significant pivot in this revision round and directly touches the "restrained,
credible for a government meeting" principle set in `PRODUCT.md`/`DESIGN.md`.
I'm proposing a specific, bounded interpretation below rather than an
open-ended "make it feel like adat" brief, precisely so it stays reconcilable
with that credibility requirement. Flagging the tension explicitly rather than
picking a side unilaterally.

## 1. Objective

When a province is selected on the Provinsi (and inherited on Kab/Kota) page,
shift a **restrained accent layer** — not the whole visual system — to reflect
that province's island/cultural region: Sumatera, Jawa, Kalimantan, Sulawesi,
Bali–Nusa Tenggara, Maluku, Papua. Goal: the page feels distinct and "alive"
per region without becoming a tourism microsite or undermining the data's
legibility and government-meeting credibility.

## 2. The tension, stated plainly

Two goals are in real conflict and need a deliberate boundary:
- **You want**: "I want the user feels amaze" — a radical, memorable, culturally
  resonant shift per province.
- **The existing brand register** (`PRODUCT.md`): "credible enough for use in a
  government meeting," "no marketing language, no decorative flourishes."

My proposed boundary: **theme the chrome, never the data.** Headers,
backgrounds, accent colors, and an optional low-opacity motif watermark can
shift per island. Charts, the choropleth's semantic color ramps (teal=good
Aman, blue=Layak, rose=BABS), tables, and KPI numbers **do not** change color
per island — those must stay interpretable by the same rules on every page, or
a Bappenas reviewer comparing two provinces side-by-side loses the ability to
compare at a glance. This is the single most important constraint in this
plan; everything below respects it.

## 3. Island → theme mapping

| Island group | BPS kode prefixes | Accent direction (proposed) | Motif direction (proposed) |
|---|---|---|---|
| Sumatera | 11–21 | Warm gold/amber (songket-inspired) | Geometric songket lattice, sparse line-art |
| Jawa | 31–36 | Deep indigo (batik-inspired) | Batik kawung/parang geometric outline, not a literal reproduction |
| Kalimantan | 61–65 | Forest green (Dayak-inspired) | Simplified spiral/hook line motif |
| Sulawesi | 71–76 | Ocean teal-turquoise (Toraja/Bugis-inspired) | Angular carving-inspired line pattern |
| Bali–Nusa Tenggara | 51–53 | Terracotta/burnt orange (ikat-inspired) | Woven ikat stripe/diamond line motif |
| Maluku | 81–82 | Spice amber-red (rempah-inspired) | Simple radiating star/clove motif |
| Papua | 91–96 | Earthy red-brown (ukiran-inspired) | Simplified Asmat/ukiran line-carving motif |

These are **directional starting points, not final art** — see §6, cultural
accuracy risk. Colors stay within the same OKLCH lightness/chroma envelope as
the current design tokens (no neon, no gradient) so contrast/accessibility
rules in `DESIGN.md` still hold.

## 4. Where the accent actually appears

Bounded, specific list — not "everywhere":
1. `PageHeader` background wash (very subtle tint, e.g. 4–6% opacity of the
   island accent over the current `--paper` background) + kicker text color.
2. Breadcrumb accent color (currently `--accent` teal, becomes island-accent
   when a province page is open).
3. One motif element: a low-opacity (8–12%) line-art watermark in the
   `PageHeader`'s empty right-hand space (where there's currently just
   whitespace next to the province name) — decorative corner treatment, never
   overlapping text or data.
4. The primary "Jelajahi" / navigate-in button on Landing page cards could
   preview the island accent per feature card — optional, low priority.
5. **Everything else is untouched**: KPI card numbers, chart colors, map
   ramps, table styling, alert colors (ok/warn/bad stay semantic, not
   island-colored), buttons stay the existing ink/teal system.

## 5. National view: "diversity"

Per your instruction, National should visually communicate the country's
diversity rather than adopt one region's theme. Concretely:
- A 7-swatch **island legend band** near the top of the national view (small
  colored chips + labels for all 7 regions), purely as a visual signal that
  "this page represents all of them," not a functional filter (though it
  could become one later — out of scope now).
- The provincial ranked table (from the National Features plan) tags each row
  with its island via a small colored dot/chip next to the province name.
- The national choropleth itself stays on the semantic teal/blue/rose data
  ramps (per §2's boundary) — island color does not appear on the map itself.

## 6. Cultural accuracy risk — needs your input

Real adat/tradition motifs (batik patterns, ikat weaving, Asmat carving, etc.)
carry specific regional and even sub-ethnic meaning. A generic AI-approximated
"batik-inspired" SVG risks looking uninformed or, worse, misattributed (e.g.,
labeling a Toraja-style motif as generic "Sulawesi," when Sulawesi itself
holds many distinct traditions — Bugis, Makassar, Toraja, Minahasa). Given
this dashboard's audience (government, donor, policy), I'd rather flag this
than ship something that reads as tokenizing.

Two ways to de-risk this, pick one (or tell me a third):
- **Option A — abstract, not literal**: use simple geometric line patterns
  (dots, lattices, chevrons) loosely evoking "handwoven/handcrafted texture"
  without naming or claiming a specific named tradition per province. Lower
  risk, less "amazing," but safe and still visually distinct per island.
- **Option B — curated per island**: I build one considered, named motif per
  island group (7 total, not 34 — one per island, not per province) with a
  short caption crediting the inspiration (e.g., "motif terinspirasi tenun
  ikat NTT") and you (or someone with domain knowledge) reviews before ship.
  More "amazing," more work, needs a human review gate I can't self-clear.

Recommendation: **Option A now, Option B as a v2** if the abstract version
lands well and you want to invest further — this also unblocks Kab/Kota
theming (which inherits its province's island) without waiting on 34
individual reviews.

## 7. Kab/Kota tab inheritance

Kab/Kota page reads its province's island the same way it already reads
`selectedKab.provinsi` — one lookup (`provKode → island`), applies the same
bounded accent list from §4 (header wash, breadcrumb, motif corner). No new
per-kab/kota logic; the theme is province-level, kab/kota just inherits it.

## 8. Technical approach

- New `src/lib/islandTheme.js`: `PROVINCE_KODE_TO_ISLAND` map (all 38 kode
  prefixes → one of 7 island ids) + `ISLAND_THEMES` (id → accent OKLCH values,
  motif SVG id, display name).
- New `src/assets/motifs/*.svg` — 7 small abstract line-art files (Option A).
- CSS: extend `:root` with `--island-accent`, `--island-accent-soft` etc.,
  set at the page-root level via a `data-island="jawa"` attribute (same
  pattern already used for `data-theme="dark"`), so components read
  `var(--island-accent)` without prop-drilling.
- `PageHeader.jsx`: accepts an optional `island` prop, applies the wash +
  motif corner when present; no visual change when absent (Infrastruktur page,
  Landing page stay neutral).
- `Breadcrumb.jsx`: reads the same `data-island` attribute for its accent
  color via CSS, no prop changes needed.
- No changes to `ProvinceKabkotMap.jsx`'s color ramps, `Chart.js` colors, or
  any `--viz-*` tokens — enforces the §2 boundary structurally, not just by
  convention.

## 9. Explicit decision needed before I build this

1. Confirm the "theme the chrome, not the data" boundary in §2 is acceptable,
   or tell me you want it to go further (and where).
2. Pick Option A or B from §6.
3. Sign off on the 7 accent-color directions in §3, or redirect any of them.

## 10. Acceptance criteria

- Selecting any province visibly shifts header accent + motif corner within
  ~1 island-appropriate palette; switching provinces within the same island
  keeps the same accent (Jawa provinces all share one theme, not 6 separate
  ones).
- Charts, map ramps, tables, and alert colors are pixel-identical in hue logic
  to the pre-theming version — only chrome changed.
- National view shows the 7-swatch diversity band, not one province's theme.
- Kab/Kota page inherits its province's island automatically.
- Dark mode still meets contrast requirements with the island accent applied
  (test both themes before merge).
