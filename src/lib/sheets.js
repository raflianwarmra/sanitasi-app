// Google Sheets data layer
// Sheet ID from the user's spreadsheet
export const SHEET_ID = '1CFMj0fmiuKtHm8DGS_7zLRkaMbCL33GfkjsK-R9s9gE';

// Sheet names — these must match the exact tab names in the Google Sheet
export const SHEET_GIDS = {
  PROVINSI:    'Akses Provinsi',
  KABKOT:      'Akses Kabkot',
  KELEMBAGAAN: 'Kelembagaan Regulasi',
  IPAL:        'IPAL',
  IPLT:        'IPLT',
  LOG:         'Log Catatan Infras',
  TEAM:        'Team Member',
};

function csvUrl(sheet) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

function parseCSV(text) {
  const clean = text.replace(/^\xEF\xBB\xBF/, '');
  const rows = [];
  const lines = clean.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cells.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  // Lowercase + trim headers; keep spaces and punctuation so we can fuzzy-match them
  const headers = rows[0].map((h) => String(h).toLowerCase().trim());
  return rows.slice(1).filter((r) => r.some((c) => c && c.trim())).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    return obj;
  });
}

async function fetchSheet(sheetName) {
  const url = csvUrl(sheetName);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching "${sheetName}"`);
  const text = await res.text();
  const rows = parseCSV(text);
  return rowsToObjects(rows);
}

// ── Helpers ───────────────────────────────────────────────────

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.').replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Fuzzy pick — returns the first non-empty value where the key *contains* any of the substrings.
// Match substrings must already be lowercase. Useful for headers with units, slashes, or variants.
function pick(row, ...subs) {
  for (const sub of subs) {
    const subHasKode = sub.includes('kode');
    for (const k of Object.keys(row)) {
      // Skip "kode ..." columns unless the caller explicitly asked for kode.
      // Prevents 'kabupaten/kota' from matching the 'kode kabupaten/kota' column.
      if (!subHasKode && k.startsWith('kode')) continue;
      if (k.includes(sub) && row[k] !== '' && row[k] != null) return row[k];
    }
  }
  return '';
}

function pickNum(row, ...subs) {
  return toNum(pick(row, ...subs));
}

// ── Normalizers ──────────────────────────────────────────────

// Akses Provinsi sheet: Kode, Provinsi, Layak {2022..2025}, Aman {2022..2025, Target 2026, Target 2029}, BABS {...}
export function normalizeProvinsi(raw) {
  return raw.map((r) => ({
    kode: pick(r, 'kode'),
    provinsi: pick(r, 'provinsi'),
    layak: {
      y2022: pickNum(r, 'layak 2022'),
      y2023: pickNum(r, 'layak 2023'),
      y2024: pickNum(r, 'layak 2024'),
      y2025: pickNum(r, 'layak 2025'),
    },
    aman: {
      y2022: pickNum(r, 'aman 2022'),
      y2023: pickNum(r, 'aman 2023'),
      y2024: pickNum(r, 'aman 2024'),
      y2025: pickNum(r, 'aman 2025'),
      target2026: pickNum(r, 'aman target 2026', 'target 2026'),
      target2029: pickNum(r, 'aman target 2029', 'target 2029'),
    },
    babs: {
      y2022: pickNum(r, 'babs 2022'),
      y2023: pickNum(r, 'babs 2023'),
      y2024: pickNum(r, 'babs 2024'),
      y2025: pickNum(r, 'babs 2025'),
      target2026: pickNum(r, 'babs target 2026'),
      target2029: pickNum(r, 'babs target 2029'),
    },
    // Convenience fields for backward-compatible KPI rendering
    layak2025: pickNum(r, 'layak 2025'),
    layak2024: pickNum(r, 'layak 2024'),
    aman2025:  pickNum(r, 'aman 2025'),
    aman2024:  pickNum(r, 'aman 2024'),
    babs2025:  pickNum(r, 'babs 2025'),
    babs2024:  pickNum(r, 'babs 2024'),
    targetAman2029: pickNum(r, 'aman target 2029', 'target 2029'),
    raw: r,
  })).filter((p) => p.provinsi);
}

// Akses Kabkot sheet: Kode, Prov, Kabkot, BABS di tempat terbuka, Akses Aman, Layak
export function normalizeKabkot(raw) {
  return raw.map((r) => ({
    kode: String(pick(r, 'kode')).trim(),
    provinsi: pick(r, 'prov'),
    kabkot: pick(r, 'kabkot', 'kabupaten'),
    babs2025: pickNum(r, 'babs di tempat terbuka', 'babs'),
    aman2025: pickNum(r, 'akses aman', 'aman'),
    layak2025: pickNum(r, 'layak'),
    raw: r,
  })).filter((k) => k.kabkot);
}

// Kelembagaan Regulasi sheet
export function normalizeKelembagaan(raw) {
  return raw.map((r) => ({
    kode: String(pick(r, 'kode kabupaten', 'kode')).trim(),
    provinsi: pick(r, 'provinsi'),
    kabkot: pick(r, 'kabupaten/kota', 'kabupaten', 'kabkot'),
    statusOperator: pick(r, 'status operator'),
    namaOperator: pick(r, 'nama operator'),
    regulasiPengelolaan: pick(r, 'regulasi pengelolaan'),
    perdaPengelolaan: pick(r, 'nama perda pengelolaan', 'perda pengelolaan'),
    regulasiRetribusi: pick(r, 'regulasi retribusi'),
    perdaRetribusi: pick(r, 'nama perda retribusi', 'perda retribusi'),
    clusterTataKelola: pick(r, 'cluster tata kelola', 'cluster'),
    raw: r,
  })).filter((k) => k.kabkot || k.kode);
}

// IPAL / IPLT sheets (near-identical shape)
export function normalizeInfra(raw, type) {
  return raw.map((r, idx) => {
    const statusText = pick(r, 'status keberfungsian', 'keberfungsian', 'status');
    const status = String(statusText).toLowerCase();
    const isFunctioning = !!status && !status.includes('tidak') && !status.includes('non');
    const lat = toNum(pick(r, 'latitude', 'lat'));
    const lng = toNum(pick(r, 'longitude', 'lng', 'long'));
    const nama = pick(r, 'infrastruktur', 'nama');
    return {
      id: `${type}-${idx}`,
      type,
      kode: String(pick(r, 'kode kabupaten', 'kode')).trim(),
      nama: nama || `${type} ${idx + 1}`,
      kabkot: pick(r, 'kabupaten/kota', 'kabupaten', 'kabkot', 'kota'),
      provinsi: pick(r, 'provinsi'),
      tahunBangun: pick(r, 'tahun pembangunan', 'tahun'),
      kapasitas: pickNum(r, 'kapasitas desain', 'kapasitas'),
      kapasitasTerpakai: pickNum(r, 'kapasitas terpakai', 'terpakai'),
      idle: pickNum(r, 'idle'),
      sr: pickNum(r, type === 'IPAL' ? 'sr' : 'kk', 'sambungan'),
      statusSerah: pick(r, 'status serah terima', 'serah terima'),
      statusText,
      isFunctioning,
      lat, lng,
      raw: r,
    };
  }).filter((i) => i.nama || i.kabkot);
}

// log catatan infrastruktur sheet
export function normalizeLog(raw) {
  return raw.map((r, idx) => ({
    id: idx,
    kode: String(pick(r, 'kode kabupaten', 'kode')).trim(),
    infrastruktur: pick(r, 'infrastruktur', 'nama'),
    tanggal: pick(r, 'tanggal', 'date'),
    sumber: pick(r, 'sumber informasi', 'sumber'),
    catatan: pick(r, 'catatan', 'notes'),
    user: pick(r, 'user', 'nama'),
    timestamp: pick(r, 'timestamp'),
    raw: r,
  })).filter((l) => l.catatan || l.infrastruktur);
}

// Team Member sheet (drives the User dropdown in the catatan form)
export function normalizeTeam(raw) {
  return raw.map((r, idx) => ({
    id: idx,
    nama: pick(r, 'nama', 'name'),
    role: pick(r, 'role', 'jabatan', 'peran'),
    email: pick(r, 'email'),
    raw: r,
  })).filter((m) => m.nama);
}

// ── Main fetcher ─────────────────────────────────────────────

let cache = {};
let cacheTime = {};
const TTL = 120_000; // 2 minutes

export async function getSheetData(sheetName) {
  const now = Date.now();
  if (cache[sheetName] && now - cacheTime[sheetName] < TTL) {
    return cache[sheetName];
  }
  const raw = await fetchSheet(sheetName);
  cache[sheetName] = raw;
  cacheTime[sheetName] = now;
  return raw;
}

export function clearCache() { cache = {}; cacheTime = {}; }

// ── Write log entry ───────────────────────────────────────────
// Uses a Google Apps Script web app URL for writes (read-only via gviz).
// If VITE_SCRIPT_URL is set, POST to it; otherwise store in in-memory cache only.
export async function appendLog({ kode, infrastruktur, tanggal, sumber, catatan, user = '' }) {
  const scriptUrl = import.meta.env.VITE_SCRIPT_URL;
  const timestamp = new Date().toISOString();
  const row = {
    'kode kabupaten/kota': kode,
    infrastruktur,
    tanggal,
    'sumber informasi': sumber,
    catatan,
    user,
    timestamp,
  };

  if (scriptUrl) {
    // URLSearchParams -> application/x-www-form-urlencoded, a "simple request"
    // that skips CORS preflight and is received by Apps Script as e.parameter.
    const body = new URLSearchParams();
    body.append('sheet', SHEET_GIDS.LOG);
    Object.entries(row).forEach(([k, v]) => body.append(k, v ?? ''));
    await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', body });
    // With no-cors we cannot read the response; assume success if no throw.
  }

  // Optimistic local cache update — newly added log appears in UI immediately.
  const existing = cache[SHEET_GIDS.LOG] ?? [];
  cache[SHEET_GIDS.LOG] = [row, ...existing];
  cacheTime[SHEET_GIDS.LOG] = Date.now();

  return row;
}
