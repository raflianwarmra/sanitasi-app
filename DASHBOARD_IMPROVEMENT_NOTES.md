# Dashboard Improvement Notes — Redesign 2026-07

Internal note for maintainers. Summarizes the July 2026 redesign: what the
dashboard already did well, what changed, and the assumptions behind it.

## What the dashboard already did well (pre-redesign)

- Solid data layer: Google Sheets CSV via gviz, robust CSV parser, fuzzy
  header matching (`pick`), per-sheet normalizers, 2-minute in-memory cache.
- Sensible page split (Landing / Provinsi / Kab-Kota / Infrastruktur) with
  lightweight hash routing — no router dependency needed.
- Working note-logging pipeline (Apps Script POST + optimistic cache update).
- Chart.js indicator trends, Leaflet asset map, searchable dropdowns,
  dark mode with system-preference sync.

## What needed improvement (and what was done)

| Weakness | Change |
|---|---|
| Generic "AI template" look: colored side/top border stripes, emoji glyphs (⚠ ▾ ×), mono-font overuse in labels | New design system in `src/index.css`: OKLCH tokens (navy ink / soft-blue paper / teal accent), SVG icon set (`Icon.jsx`), Inter-only typography with tabular numerals, 1px borders, restrained status colors |
| No spatial view of kab/kota in a province | **New SVG choropleth** (`ProvinceKabkotMap.jsx`) fed by pre-built geometry in `public/geo/` (see below), metric selector (Aman / Layak / BABS), hover tooltip with rank, click → detail card → kab/kota profile, threshold legend, ranked-list fallback if geometry fails |
| No export features | Client-side CSV (`lib/exportCsv.js`, semicolon + BOM for Excel-ID) on all three data tabs; PPTX generation (`lib/exportPptx.js`, pptxgenjs lazy-loaded) for Provinsi and Kab/Kota profiles |
| Weak decision support | "Isu Prioritas" panel (tanpa IPLT / unit rusak / BABS >10% / aman <5%), top-bottom-5 per map metric, utilization warnings (<30%) on Infrastruktur |
| Duplication & inline chart lifecycle | Reusable `PageHeader`, `SectionCard`, `MetricCard`, `EmptyState`, `ChartContainer` (guaranteed `chart.destroy()`), `ExportButtons`; shared `lib/format.js` |
| Fuzzy province→kab matching by name substring | Kode-prefix join (BPS 2-digit → 4-digit) with name fallback |
| Mobile rough edges | 44px touch targets, 16px inputs (no iOS zoom), single-column stacking, table horizontal scroll only, collapsing detail panel |
| Lint debt | `npm run lint` now passes with zero errors (incl. new react-hooks rules) |

## Map geometry pipeline

- `scripts/build_geo.py` merges two community boundary extracts
  (marifauzan/geojson-kabupaten-kota-indonesia — BIG TASWIL 2022, and
  azunzios/indonesia-geojson — GADM simplified with BPS `CC_2` codes) and
  joins them to the live "Akses Kabkot" sheet by kode, then name.
- Result: **514/514 kab/kota** covered, written as 38 per-province files
  `public/geo/prov-<kode>.json` (1–22 KB each, ~454 KB total), coordinates
  rounded to 4 decimals. Fetched lazily per selected province and cached.
- No shapes were invented; unmatched rows would appear in the ranked-list
  fallback (currently none).
- Rebuild when kab/kota change:
  `python3 scripts/build_geo.py <marifauzan.json> <azunzios.geojson> <kabkot.csv>`

## Files changed

- **New:** `PRODUCT.md`, `DESIGN.md`, `scripts/build_geo.py`,
  `public/geo/prov-*.json` (38), `src/lib/{format,exportCsv,exportPptx,geo,mapMetrics}.js`,
  `src/components/{Icon,PageHeader,SectionCard,MetricCard,EmptyState,ChartContainer,ExportButtons,ProvinceKabkotMap}.jsx`
- **Rewritten:** `src/index.css`, all four pages, `TopNav`, `Breadcrumb`,
  `LoadingSpinner`, `App.jsx` (adds `kode` URL param), `useSheetData.js`
  (react-hooks-lint-compliant fetch), `lib/theme.js` (+`cssVar`)
- **Removed:** `src/components/KpiCard.jsx` (superseded by `MetricCard`)
- **Dependency added:** `pptxgenjs` (dynamic import — not in the initial bundle)

## Assumptions

1. CSV exports use `;` delimiter + decimal commas + UTF-8 BOM (Indonesian
   Excel default). Google Sheets auto-detects both.
2. PPTX uses Calibri (universally available in gov environments) with the
   dashboard's navy/teal identity; charts/tables are data-driven, no screenshots.
3. Map click behaviour: first click/tap selects and shows a detail card with a
   "Buka profil" button (touch-friendly), rather than navigating instantly.
4. Choropleth thresholds are fixed policy-readable bands
   (Aman 5/10/20/30 · Layak 60/70/80/90 · BABS 1/5/10/20), not quantiles,
   so the legend means the same thing for every province.
5. Dark mode retained (already integrated); charts/map re-render with
   theme-resolved colors via `cssVar()`.
6. `src/App.css` is a pre-existing unused stub and `react-chartjs-2` /
   `leaflet` / `react-leaflet` / `@tanstack/react-router` remain unused
   pre-existing dependencies — left untouched deliberately (out of scope);
   safe to remove in a future cleanup.

## Known limitations

- Geometry reflects 2022/GADM boundaries; a few very new pemekaran areas
  share their parent's outline where the source had no separate polygon.
- Leaflet still loads from unpkg CDN at runtime (pre-existing behaviour).
- PPTX appendix tables >1 slide rely on pptxgenjs autopaging; extremely long
  province tables (e.g. 38+ rows) spill onto continuation slides by design.
