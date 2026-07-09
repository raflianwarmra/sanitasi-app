# Plan: Smaller Revisions

Status: **Draft — low risk, ready to implement once approved.**

Two independent, low-risk changes. No new data sources, no new components.

## 1. Choropleth thresholds for Akses Layak

**Current** (`src/lib/mapMetrics.js`):
```js
layak: { key: 'layak2025', label: 'Akses Layak', thresholds: [60, 70, 80, 90], ... }
```
5 bands: `<60 / 60–70 / 70–80 / 80–90 / ≥90`

**Requested:**
```js
layak: { key: 'layak2025', label: 'Akses Layak', thresholds: [20, 50, 80, 90], ... }
```
5 bands: `<20 / 20–50 / 50–80 / 80–90 / ≥90`

This is a one-array-literal change. The legend (`legendLabels()` in
`ProvinceKabkotMap.jsx`) and the map fill logic (`bandOf()`) both already
derive from the `thresholds` array, so no other code changes — labels and
colors update automatically. Same treatment needs to apply anywhere else a
Layak legend gets rendered once the PPTX map slides exist (`exportPptx.js`
map-slide work), so I'll make sure that code pulls from the same
`MAP_METRICS` source rather than a hardcoded copy.

Also worth flagging: `Akses Aman` (`[5,10,20,30]`) and `BABS` (`[1,5,10,20]`)
thresholds are untouched unless you want those revisited too — not requested,
leaving as-is.

## 2. Province dropdown sort order

**Current** (`src/pages/Provinsi.jsx`):
```js
const sorted = useMemo(
  () => [...provinces].sort((a, b) => a.provinsi.localeCompare(b.provinsi, 'id')),
  [provinces],
);
```
Alphabetical (Aceh, Bali, Banten, Bengkulu, …).

**Requested:** sort by BPS `kode` ascending (11 Aceh, 12 Sumatera Utara, 13
Sumatera Barat, … 94 Papua, 95 Papua Selatan, …) — this is actually the
country's conventional province ordering (roughly geographic, west to east)
and matches how the source spreadsheet itself is already ordered.

```js
const sorted = useMemo(
  () => [...provinces].sort((a, b) => Number(a.kode) - Number(b.kode)),
  [provinces],
);
```

**Dependency on the National Features plan:** "the national should be at the
very top and become the default option" requires the synthetic "Nasional"
entry described in `01-national-features.md`. These two changes are
sequenced together in practice — I'd ship the kode-sort immediately (useful
on its own, zero dependency), then the "Nasional pinned at top + default
selected" behavior lands as part of the national-view work since it needs the
national branch to exist before defaulting to it makes sense.

## 3. Files touched (when approved)

- `src/lib/mapMetrics.js` — threshold array
- `src/pages/Provinsi.jsx` — sort comparator (kode-only part, independent)
- `src/lib/exportPptx.js` — map-slide legend must read live thresholds, not a
  hardcoded copy (applies once the PPTX map slides from the earlier PPT
  revision plan are built)

## 4. Acceptance criteria

- Layak map legend reads `<20% / 20–50% / 50–80% / 80–90% / ≥90%`.
- Province dropdown lists provinces in BPS kode order (11 → 96).
- No regression to the existing name-based kab/kota-within-province matching
  (`kabsInProv`), which already keys off `provKode` prefix, not sort order.
