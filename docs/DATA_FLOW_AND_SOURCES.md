# Data Flow & Sources — Sanitasi.id v2.0

Explains how the app reads from and writes to the single Google Sheet that powers it.

## The sheet

- **Spreadsheet:** [Tabular Infrastruktur Sanitasi](https://docs.google.com/spreadsheets/d/1CFMj0fmiuKtHm8DGS_7zLRkaMbCL33GfkjsK-R9s9gE/edit)
- **ID:** `1CFMj0fmiuKtHm8DGS_7zLRkaMbCL33GfkjsK-R9s9gE` (hard-coded in `src/lib/sheets.js`).
- **Sharing:** must be "Anyone with the link — Viewer" for the public gviz read endpoint to work. No other permission changes needed.

### Tabs consumed

| Tab name (exact)                | Purpose                                          | Normalizer                |
|---------------------------------|--------------------------------------------------|---------------------------|
| `Akses Provinsi`                | Provincial Layak/Aman/BABS 2022–2025 + targets   | `normalizeProvinsi`       |
| `Akses Kabkot`                  | Kab/Kota access percentages                      | `normalizeKabkot`         |
| `Kelembagaan Regulasi`          | Operator + Perda + Cluster Tata Kelola per kab   | `normalizeKelembagaan`    |
| `IPAL`                          | IPAL facility registry + coordinates             | `normalizeInfra('IPAL')`  |
| `IPLT`                          | IPLT facility registry + coordinates             | `normalizeInfra('IPLT')`  |
| `Log Catatan Infras`     | Field notes, user-appended via the app           | `normalizeLog`            |
| `Team Member`                   | Dropdown source for the "User" field on catatan  | `normalizeTeam`           |
| `BUMD Air Minum`                | Kinerja BUMD Air Minum per kab/kota (Kab/Kota page) | `normalizeBumd`        |
| `Anggaran PU`                   | APBD 2026 bidang PU per pemda, by sector (Provinsi + Kab/Kota pages, national view) | `normalizeAnggaran` |
| `Anggaran ALD Rinci`            | APBD 2026 ALD per pemda × sub-kegiatan            | `normalizeAnggaranAld`    |

Join key across the non-provinsi tabs is the BPS code in `Kode Kabupaten/Kota` (or `Kode` in the provinsi sheet; `Kode BPS` in the BUMD tab).

---

## BUMD Air Minum tab

Source: Bappenas "Data Kinerja BUMD AM 2024 (TB 2023)" workbook. That workbook
has title rows, repeated headers and no BPS code, so it is converted to a
clean tab rather than pasted:

```
python3 scripts/build_bumd_sheet.py "<Data Kinerja BUMD AM ...>.xlsx" BUMD_Air_Minum_TB2023.xlsx 2023
```

The script resolves **Kode BPS** for every row from `public/geo/` (the same 514
codes the dashboard uses), with an alias list for renamed regencies
(e.g. Pontianak → Mempawah, Maluku Tenggara Barat → Kepulauan Tanimbar). A
BUMD serving a whole province carries several codes separated by `;` (PAM
Jaya: `3101;3171;…;3175`, Lingkup = Provinsi). It refuses to write output if a
row is unmatched, a code crosses provinces, or a code repeats.

**Import:** in the Google Sheet, File → Import → Upload the generated .xlsx →
*Insert new sheet(s)*. Keep the tab name **`BUMD Air Minum`**. Numbers are raw
(rupiah, %, counts) — don't apply thousand-separator formats to them. The tab's
`gid` (currently `547087676`) is registered in `TAB_GIDS` in `src/lib/sheets.js`;
if the tab is ever deleted and re-imported, update that number.

| Column | Meaning |
|---|---|
| Kode BPS | join key (one or more 4-digit codes) |
| Status Kinerja / Nilai Kinerja | Sehat (> 2,8) · Kurang Sehat (2,2–2,8) · Sakit (< 2,2), scale 0–5 |
| FCR/Non FCR | Full Cost Recovery: average tariff ≥ HPP (Rp/m³) |
| Pelanggan Aktif / Total (SR) | active / active + inactive connections |
| Cakupan Pelayanan Teknis (%) | served population ÷ population **in the BUMD service area** (not the whole kab/kota) |
| Pendapatan Operasi (Rp) | accrual operating revenue (water sales + non-water operating income) |
| Tagihan / Penerimaan Rekening Air (Rp) | water bills issued / cash actually collected in the year |
| Laba Bersih Setelah Pajak (Rp) | net profit after tax |

## Anggaran PU & Anggaran ALD Rinci tabs

Source: two SIPD (Kemendagri) extracts for urusan 1.03 PU & Penataan Ruang,
kept locally in `docs/anggaran daerah/` and **never committed** (gitignored;
the APBD file is 134 MB):

| File | Sheet | Grain | Used for |
|---|---|---|---|
| `apbd_2026_pu.xlsx` | `view_apbd_2026_pu` | one row per **rincian belanja** (akun level, 568.008 rows); pemda by **name only**; no tahap column | all amounts |
| `rkpd_2026_pu.xlsx` | `view_rkpd_2026_PU` | one row per sub-kegiatan, with `kode_ddn` | only the output indicator + target per ALD sub-kegiatan |

Build the import file:

```
python3 scripts/build_anggaran_sheet.py "docs/anggaran daerah" "docs/anggaran daerah/anggaran_pu_sheet.xlsx"
```

The script streams both workbooks with the standard library (reader shared
with `scripts/aggregate_anggaran_pu.py`, ~45 s) and writes one .xlsx with both
tabs. It refuses to write output if a pemda name doesn't resolve to a Kode
BPS (matched by province + name + Kab/Kota type against `public/geo/`, with an
alias list for renamed regions such as Toba Samosir → Toba, Mamuju Utara →
Pasangkayu), a code repeats, an ALD sub-kegiatan isn't in the kelompok map,
the sector totals don't add back to the file total, or a pemda's ALD column
differs from the sum of its ALD Rinci rows. Reference totals (from the
workbooks' own pivots): PU Rp103,19 T, ALD Rp1,164 T.

Decisions (agreed with the planner, Oct 2026):

- **Sectors by program code:** 1.03.10 Jalan · 1.03.05 ALD · 1.03.03 Air Minum ·
  1.03.04 Persampahan · everything else Lainnya PU (SDA, drainase, permukiman,
  bangunan, jasa konstruksi, tata ruang, keistimewaan DIY).
- **Penunjang (1.03.01) is a separate column** and is not part of
  `Total Sektor`; shares are over the five sectors. It is ~12% of PU and mostly
  belanja pegawai.
- **Stage unknown:** the extract has no murni/perubahan column, so the UI says
  "APBD 2026 (SIPD) … tahap tidak tercantum".
- **No RKPD fallback:** pemda without APBD rows (Pemprov DKI, Kab. Pegunungan
  Arfak, Kab. Nduga; the DKI kota adm. have no budget of their own) show an
  empty state.
- **Province aggregate** = Pemprov + its kab/kota. The extract has no Belanja
  Transfer (5.4): bantuan keuangan sits outside urusan PU, so it is *missing*,
  not double counted; hibah between pemda is Rp22,9 M nationally. The UI
  carries that note.

**Anggaran PU** — one row per pemda (543: 37 Pemprov, 506 kab/kota):

| Column | Meaning |
|---|---|
| Kode BPS | 2 digits = Pemprov, 4 digits = kab/kota (dashboard codes, not Kemendagri) |
| Provinsi / Nama Pemda / Level / Tahun / Sumber | identity; Sumber = `APBD 2026 (SIPD)` |
| Jalan / ALD / Air Minum / Persampahan / Lainnya PU (Rp) | sum of `total_harga` per sector |
| Total Sektor (Rp) | sum of the five sectors |
| Penunjang (Rp) | program 1.03.01, outside Total Sektor |
| Total PU (Rp) | Total Sektor + Penunjang |

**Anggaran ALD Rinci** — one row per pemda × ALD sub-kegiatan with a nonzero
value (978 rows):

| Column | Meaning |
|---|---|
| Kode BPS / Nama Pemda / Level | join key + identity |
| Kelompok | SPALD Terpusat · SPALD Setempat · IPLT & Lumpur Tinja · Operasi & Pemeliharaan · Perencanaan & Pembinaan (mapped by sub-kegiatan code) |
| Kode Sub Kegiatan / Sub Kegiatan / SKPD | from APBD; several SKPD joined with `;` |
| Nilai (Rp) | APBD value |
| Modal / Barang & Jasa / Hibah & Bansos / Pegawai (Rp) | split by `kode_akun` (sums to Nilai) |
| DAK / DAU / PAD / Bagi Hasil / Lainnya (Rp) | split by `nama_dana`, which in the APBD is one source per line (sums to Nilai) |
| Sumber Dana | the distinct source names, largest first |
| Indikator Keluaran (RKPD) / Target (RKPD) | RKPD 2026 output for the same pemda + sub-kegiatan (planning target, not an APBD figure) |

**Import:** File → Import → Upload the generated .xlsx → *Insert new
sheet(s)*. Keep the tab names exactly **`Anggaran PU`** and **`Anggaran ALD
Rinci`**; don't apply number formats to the Rp columns. Then register each
tab's `gid` in `TAB_GIDS` in `src/lib/sheets.js`. Until a gid is registered
the app falls back to the gviz endpoint by tab name. That endpoint returns the
*first* tab when a name is missing, so both normalizers drop rows that lack
their own columns (`Nama Pemda`, `Kode Sub Kegiatan`) rather than show zeros.

Rp values are parsed with `toRp()`, which, unlike `toNum()`, reads a lone
separator before exactly three digits as a thousands separator
(`500,000` = 500000), since Rupiah amounts never carry three decimals.

### Number parsing

Sheets export *displayed* values. `toNum()` accepts `27,01`, `27.01`,
`1.470.818.051` and `1,470,818,051` (a repeated separator is a thousands
separator; with both present, the last one is the decimal mark). A lone
`8.654` is still read as a decimal — another reason the BUMD tab keeps raw
numbers.

---

## Read path (all pages, always live)

```
browser
  │
  │  GET https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=<tab>
  ▼
parseCSV()   ── in src/lib/sheets.js, handles quoted cells + BOM
  │
rowsToObjects()   ── lowercases headers, preserves spaces/punctuation
  │
normalize*()   ── fuzzy-matches real column headers (with units, slashes, etc.)
                  to stable JS object shapes
  │
useSheetData hook   ── cached 2 min in memory (TTL per sheet)
  │
page component   ── renders KPIs, maps, tables
```

- **No API key required.** The gviz export endpoint serves public sheets as CSV directly.
- **Cache:** each tab is fetched once, then reused for 2 minutes. Page navigation does not re-fetch.
- **Error path:** if a fetch fails (sheet not public, tab renamed), the normalizer returns `[]` and the page shows an `ErrorCard` with a retry button.

### Header matching

Real headers like `Kapasitas Desain (m³/hari)` and `Kode Kabupaten/Kota` contain spaces, parentheses, and slashes. Rather than rely on exact matches, `sheets.js` uses a `pick(row, ...substrings)` helper that returns the first value whose key *contains* any of the substrings. This keeps the app resilient to minor header tweaks (e.g. adding a footnote) without code changes.

---

## Write path (catatan only)

Only one user action writes to the sheet: submitting a catatan from the infrastructure detail popup.

```
LogCatatanForm  ── user fills date, sumber, user, catatan
  │
appendLog()  ── src/lib/sheets.js
  │
  ├─► POST (no-cors) to VITE_SCRIPT_URL
  │      │
  │      ▼
  │    Google Apps Script web app  ── doPost(e) appends a row
  │                                     to the "Log Catatan Infras" tab
  │
  └─► Optimistic cache update (in-memory)
        ── so the new entry appears immediately in LogCatatanList without waiting
           for gviz cache invalidation.
```

### Apps Script handler (paste this into the spreadsheet's Apps Script editor)

This version is defensive — it handles **both** form-encoded (`e.parameter`) **and** JSON (`e.postData.contents`) payloads, plus a `doGet` so you can verify the deployment in a browser.

```javascript
const DEFAULT_TAB = 'Log Catatan Infras';

function doGet(e) {
  // Visit the /exec URL in a browser to confirm the deployment is live.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tab = ss.getSheetByName(DEFAULT_TAB);
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      sheet: ss.getName(),
      defaultTab: DEFAULT_TAB,
      tabFound: !!tab,
      headers: tab ? tab.getRange(1, 1, 1, tab.getLastColumn()).getValues()[0] : null,
      rows: tab ? tab.getLastRow() : 0,
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    // Merge form-encoded params and JSON body so the client can use either.
    let params = Object.assign({}, e.parameter || {});
    if (e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        params = Object.assign({}, body.row || body, params);
        if (body.sheet) params.sheet = body.sheet;
      } catch (_) { /* not JSON, ignore */ }
    }

    const sheetName = params.sheet || DEFAULT_TAB;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tab = ss.getSheetByName(sheetName);
    if (!tab) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'tab not found: ' + sheetName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = tab.getRange(1, 1, 1, tab.getLastColumn()).getValues()[0]
      .map(h => String(h).toLowerCase().trim());
    const lowerParams = {};
    Object.keys(params).forEach(k => { lowerParams[String(k).toLowerCase().trim()] = params[k]; });
    const values = headers.map(h => lowerParams[h] ?? '');
    tab.appendRow(values);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, appended: values }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Deploy steps (one-time, and how to fix a broken deployment)

1. In the spreadsheet: **Extensions → Apps Script**.
2. Replace the entire `Code.gs` with the snippet above → **Save (⌘S)**.
3. **Deploy → Manage deployments** → pencil icon on the existing deployment → **Version: New version** → **Execute as: Me** → **Who has access: Anyone** → **Deploy**. The `/exec` URL stays the same.
   - If you don't have an existing deployment: **Deploy → New deployment → Web app**, same settings → **Deploy**.
4. **Test it in your browser:** open the `/exec` URL directly. You should see JSON like `{"ok":true,"sheet":"...","tabFound":true,"headers":[...],"rows":N}`. If you see "Halaman Tidak Ditemukan" or a Google error page, access isn't set to **Anyone** — redeploy.
5. Confirm `VITE_SCRIPT_URL` in `.env.local` matches the `/exec` URL. Restart `npm run dev`.

### Common failure modes

- **GET the URL returns "Halaman Tidak Ditemukan" / "Sorry, unable to open":** deployment access is not "Anyone" (or deployment was never created as a Web App). Redeploy with access = Anyone.
- **POST returns HTML instead of JSON in curl:** the first response is a 302 redirect that curl follows as GET. That's normal — it doesn't mean POST failed. Check the sheet for a new row.
- **doGet shows `tabFound: false`:** the sheet tab name differs from `Log Catatan Infras`. Either rename the tab or change `DEFAULT_TAB` in the script.
- **Nothing appears in the sheet, but no errors:** headers in row 1 of the tab don't match the lowercase keys the client sends. Required headers: `date`, `provinsi`, `kabupaten/kota`, `infrastruktur`, `ipal/iplt`, `user`, `sumber informasi`, `catatan`.

If `VITE_SCRIPT_URL` is not set, the app still works: catatan appear in the UI for the current session but are not saved to the sheet. The form shows a warning banner in that case.

### Why `no-cors`?

Apps Script web apps do not return CORS headers. We send `URLSearchParams` (form-encoded), which is classified as a "simple request" and avoids the preflight entirely. Combined with `mode: 'no-cors'`, the POST succeeds without touching Apps Script's CORS surface. Trade-off: the browser cannot read the response body, so we treat "no thrown error" as success and optimistically update the cache. A follow-up fetch (next page load, >2 min later) confirms the row is there.

---

## Data contract expected on the sheet side

### `Log Catatan Infras` (needs these headers in row 1, case-insensitive)

```
date | provinsi | kabupaten/kota | infrastruktur | IPAL/IPLT | user | sumber informasi | catatan
```

The Apps Script `doPost` above matches by lowercased header name and tolerates extra columns.

### `Team Member` (needs at minimum)

```
Nama | Role (optional) | Email (optional)
```

---

## Local dev

```
cd sanitasi-app
cp .env.example .env.local   # then paste your Apps Script URL
npm install
npm run dev
# open http://localhost:5173
```

For a production build: `npm run build && npm run preview`.

## Files that matter

- [src/lib/sheets.js](../src/lib/sheets.js) — all I/O, normalizers, cache, write path.
- [src/hooks/useSheetData.js](../src/hooks/useSheetData.js) — thin React wrapper around the fetch layer.
- [scripts/build_anggaran_sheet.py](../scripts/build_anggaran_sheet.py) — builds the two Anggaran tabs from the SIPD extracts.
- [src/lib/anggaran.js](../src/lib/anggaran.js) — sector list, province aggregate, ALD rank and grouping helpers.
- [src/components/LogCatatanForm.jsx](../src/components/LogCatatanForm.jsx) — the only component that writes.
- [src/components/LogCatatanList.jsx](../src/components/LogCatatanList.jsx) — read-only timeline of catatan.
