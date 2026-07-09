# Plan: National Profile in the Provinsi Tab

Status: **Draft — awaiting data source confirmation.** No implementation yet.

## 1. Objective

Add a "Nasional" option to the province selector on the Provinsi page. Selecting
it swaps the page from a single-province profile into a **national profile**:
national-level KPIs plus a provincial distribution view (choropleth of all 34
provinces + ranked table), so a user can go straight from "how is Indonesia
doing" down to "how is Jawa Timur doing" without leaving the tab.

## 2. Data source — open item

The live spreadsheet (`1CFMj0fmiuKtHm8DGS_7zLRkaMbCL33GfkjsK-R9s9gE`) currently
has exactly these 7 tabs: `IPLT`, `IPAL`, `Akses Provinsi`, `Akses Kabkot`,
`Kelembagaan Regulasi`, `Log Catatan Infras`, `Team Member`. I could not find a
national-data tab under any of the names I probed ("Nasional", "Akses
Nasional", "National", "Data Nasional", "Profil Nasional", etc.) — Google's
`gviz` CSV endpoint silently falls back to the first tab (`IPLT`) for any
unrecognized sheet name rather than erroring, so a wrong guess looks like a
200 OK with real-looking data. **I need the exact tab name (and ideally column
headers) before this can be built.**

Two ways to close this:
- You add the tab and reply with its exact name, or
- I can **derive** the national profile entirely from `Akses Provinsi` (already
  has Layak/Aman/BABS 2022–2025 + targets per province) without a dedicated
  national sheet at all — national KPIs become population-weighted or simple
  averages across the 34 rows already loaded.

Recommendation: use the **derived approach** as the default (zero new data
dependency, ships immediately), and layer in your national sheet later if it
carries something the provincial rows don't (e.g., a hand-set national target,
a curated national narrative/interpretation, or population weights for a
proper weighted average instead of a simple mean). If your new sheet exists
specifically to provide **population figures** for weighting, that's the one
piece the derived approach can't produce on its own — flag that specifically
and I'll wire it in.

## 3. Selector behavior

- Dropdown adds **"Nasional — Indonesia"** as a synthetic first entry, sorted
  above all real provinces (ties into the BPS-kode sort in the smaller-revisions
  plan — Nasional is not a kode-38xx row, it's pinned above kode `11`).
  **National becomes the default selection on page load**, per your request —
  today's default is the first alphabetical province.
- Selecting a real province behaves exactly as it does today.

## 4. National view content

**Executive band (top):**
- One-line interpretation, e.g. "Akses aman nasional 14,2% dari target 2029
  sebesar 20% — gap 5,8 poin." (mirrors the PM brief's "short interpretation
  sentence" requirement, computed from national aggregates)
- 3 KPI cards (Layak / Aman / BABS), same visual language as province KPI
  cards, values = weighted (or simple, pending §2) average across all
  provinces, same 2022–2025 trend + target chart treatment
- National infrastructure summary (Total IPAL, Total IPLT, Kab/Kota tanpa
  IPLT nationally, Unit tidak berfungsi nationally) — same 4-card row already
  used per-province, aggregated over the full `IPAL`/`IPLT` sheets instead of
  the province-filtered subset

**Provincial distribution (this is the "svg, table, and other" you asked for):**
- **New national choropleth** — colors all 34 **provinces** (not kab/kota) by
  the same 3-metric selector (Aman/Layak/BABS) already on the page. This
  requires **new geometry** I don't have yet: my `public/geo/prov-XX.json`
  files hold kab/kota shapes *within* one province, not province-level
  outlines for the whole country. I'd generate `public/geo/indonesia-provinces.json`
  from the same source repos (`marifauzan`/`azunzios`) already used for
  `scripts/build_geo.py`, dissolved to province level — same kode-based join,
  same graceful ranked-list fallback if a province's geometry is missing.
- Ranked table of all 34 provinces (same sortable-column pattern as the
  existing kab/kota table), clicking a row or a map region navigates into that
  province's normal profile (selector jumps from Nasional → that province).
- Top-5 / bottom-5 provinces per metric, same treatment as the existing
  kab/kota top/bottom-5 list.

**Isu Prioritas at national scale:** same 4 categories already computed per
province (no IPLT, non-functioning units, BABS>10%, Aman<5%) but counted
nationally, e.g. "38 kab/kota belum memiliki IPLT" instead of one province's
subset.

## 5. Diversity requirement (ties to the Design Change plan)

You asked: *"If choose national, it shows diversity."* Under the island-theming
plan (`02-design-change-island-theming.md`), each province carries an island
accent. On the national view I'd represent this as a **7-swatch island legend
band** near the top (Sumatera/Jawa/Kalimantan/Sulawesi/Bali-Nusa
Tenggara/Maluku/Papua, one accent chip each) and tag each row of the
provincial table with its island, rather than forcing one single theme across
a page that represents the whole country. Full detail lives in that doc; flagging
the dependency here so both land coherently.

## 6. Technical approach

- `lib/sheets.js`: no change if using the derived approach; add a
  `SHEET_GIDS.NATIONAL` + `normalizeNational()` only if a real national sheet
  is confirmed.
- `hooks/useSheetData.js`: add `useNational()` only if needed; otherwise
  national KPIs are computed with a `useMemo` directly from `useProvinsi()`'s
  existing 34 rows — no new fetch.
- `Provinsi.jsx`: `selectedProv` becomes `selectedProv | 'NASIONAL'`; branch
  the page body between the existing per-province render and a new
  `<NationalView>` component.
- New component `components/NationalProvinceMap.jsx` (sibling to
  `ProvinceKabkotMap.jsx`, same projection/rasterization helpers from
  `lib/geo.js`, different geometry source and click-target: provinces, not
  kab/kota).
- New `scripts/build_national_geo.py` (or extend `build_geo.py`) to produce
  the province-level GeoJSON, dissolving kab/kota shapes per province kode.
- CSV export: add a "Nasional" export producing province-level rows (same
  shape as the existing per-province kab/kota CSV, one row per province
  instead of per kab/kota).
- PPTX export: national deck reuses the same slide types as the province deck
  (overview, 3× map+bar-by-metric, isu prioritas ×2, appendix) with provinces
  as the unit instead of kab/kota — no new slide types needed once the
  province-level map image and ranked list exist.

## 7. Open questions (need your answer before build)

1. Does the national sheet exist under a name I haven't tried, or should I
   proceed with the **derived-from-`Akses Provinsi`** approach?
2. If a real national sheet exists specifically for **population weights**,
   confirm — otherwise I'll use simple (unweighted) averages across provinces
   for the national KPI numbers.
3. Any additional national-only fields you want surfaced (e.g., a hand-written
   national narrative, a national target that differs from summing provincial
   targets)?

## 8. Acceptance criteria

- "Nasional" is the default, top-most dropdown entry.
- National KPIs, infra summary, and isu-prioritas match the same visual
  language as a province page.
- National choropleth colors all 34 provinces, click navigates into that
  province's normal profile.
- CSV and PPTX export both work from the national view.
- No change to any existing province's behavior when explicitly selected.
