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

Join key across the non-provinsi tabs is the BPS code in `Kode Kabupaten/Kota` (or `Kode` in the provinsi sheet).

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
- [src/components/LogCatatanForm.jsx](../src/components/LogCatatanForm.jsx) — the only component that writes.
- [src/components/LogCatatanList.jsx](../src/components/LogCatatanList.jsx) — read-only timeline of catatan.
