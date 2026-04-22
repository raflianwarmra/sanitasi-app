# Dashboard Features — Sanitasi.id v2.0

Reference for every page and interaction in the dashboard. Use this as the single source of truth when explaining functionality to stakeholders or when planning future changes.

## Scope

Dashboard 2.0 is a public-facing, read-mostly web app for exploring national sanitation data in Indonesia. It is a direct evolution of v1 (`sanitasi-dashboard`), rebuilt with modular pages and one new write feature (infrastructure catatan logging).

All data is fetched live from a single Google Sheet. There is no backend and no login. A single Apps Script web app is used to append rows to one sheet when users add a catatan.

---

## Pages

### 1. Landing (`/`)

- Hero with call-to-action to the three dashboards.
- Stats strip showing provinsi count, kab/kota count, total infrastruktur, and national averages of Layak/Aman.
- Three feature cards linking to Provinsi, Infrastruktur, and Kab/Kota.

### 2. Profil Provinsi (`/provinsi`)

Drives from the `Akses Provinsi` sheet.

- **Header + dropdown:** pick any of ~38 provinsi.
- **KPI strip:** Layak 2025, Aman 2025, BABS 2025 (each with YoY delta), national rank, gap to Aman 2029 target.
- **Map:** Leaflet with a bubble per provinsi, colored by Layak % (≥85 green / 70–85 amber / <70 red). Click a bubble to select.
- **Tren & Target chart:** SVG line chart showing Layak / Aman / BABS for 2022–2025, plus Aman and BABS target markers for 2026 and 2029, with dashed trajectories from 2025 to the 2029 target.
- **Ranking table:** sortable by Layak / Aman / BABS.
- CTA to jump into `/kabkota?provinsi=<name>` for the selected provinsi.

### 3. Data Infrastruktur (`/infrastruktur`)

Drives from `IPAL`, `IPLT`, and `Log Catatan Infras` sheets.

- **Filters:** IPAL / IPLT / Semua; Beroperasi / Nonaktif / Semua; free-text search.
- **Map:** one bubble per IPAL or IPLT, colored green (beroperasi) or red (nonaktif). Uses actual `Latitude`/`Longitude` from the sheet when present; otherwise falls back to a province-centered jittered position.
- **Table:** first 100 matching rows. Each row shows nama, type chip, lokasi, kapasitas, status, catatan count.
- **Detail popup (right sidebar):** opens when a map bubble **or** a table row is clicked.
  - **Tab 1 — Detail:** kode kab/kota, tahun bangun, kapasitas desain, kapasitas terpakai, utilisasi %, SR (IPAL) or KK (IPLT), status serah terima, status keberfungsian.
  - **Tab 2 — Catatan:** timeline list of all catatan previously logged against this infrastruktur (matched by kode + nama).
  - **+ Tambah Catatan button:** opens the catatan form inline.

#### Catatan form (new in 2.0)

Fields:
- **Tanggal** — native date picker, pre-filled to today, editable.
- **Sumber Informasi** — dropdown: Laporan / Monev / Lainnya.
- **Petugas / User** — dropdown populated from the `Team Member` sheet; "Lainnya (isi manual)" falls back to a free-text input. If the sheet is empty, a plain text input is shown.
- **Catatan** — textarea (required, ≥1 char).

On submit:
1. A row is POSTed to the Apps Script URL (`VITE_SCRIPT_URL`), which appends it to the `Log Catatan Infras` sheet.
2. The new row is also pushed into the in-memory cache so it appears immediately in the UI.
3. If `VITE_SCRIPT_URL` is not set, step 1 is skipped; step 2 still runs so the entry is visible during the session. A warning banner alerts the user.

### 4. Profil Kab/Kota (`/kabkota?provinsi=<optional>`)

Drives from `Akses Kabkot` (primary), joined by **`Kode Kabupaten/Kota`** (BPS code) with `Kelembagaan Regulasi`, `IPAL`, `IPLT`, and `Log Catatan Infras`.

- **Header:** provinsi filter + kab/kota dropdown + Cluster Tata Kelola chip if known.
- **Tab 1 — Akses:** KPI cards for Layak / Aman / BABS (tempat terbuka) plus composition bars.
- **Tab 2 — Infrastruktur:**
  - Summary KPIs (total / beroperasi / bermasalah).
  - Tables grouped by IPAL and IPLT, showing kapasitas, utilisasi %, tahun, status, and catatan count per unit.
  - Timeline of recent catatan for this kab/kota (all infrastruktur, unified stream).
- **Tab 3 — Kelembagaan & Regulasi:**
  - Operator card (Status Operator, Nama Operator).
  - Regulasi card with two rows (Pengelolaan ALD / Retribusi-Tarif), each showing the Ada/Belum badge and the Perda name.
  - Cluster Tata Kelola badge.
  - Mini akses ringkasan.

---

## Navigation

- Top nav: Beranda / Profil Provinsi / Data Infrastruktur / Profil Kab/Kota.
- Hash-based routing (no backend routing needed; deployable as static).
- Mobile: hamburger menu replaces top nav below 768 px.

## Design tokens

oklch-based palette with semantic names (`--ok`, `--warn`, `--bad`, `--accent`), Inter for body text, JetBrains Mono for data labels and chips, Caveat reserved for decorative use. Everything themeable via `src/index.css`.

---

## What is **not** in 2.0 (intentionally)

- No auth / multi-user. Any visitor who knows the URL can submit catatan.
- No editing or deleting existing catatan (append-only).
- No server-side pagination — gviz returns the full sheet, which is fine at current scale (~2 k rows total).
- No offline support.
