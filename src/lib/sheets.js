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
  NASIONAL:    'Nasional',
  LADDER_NAS:  'Ladder Nasional',
  LADDER_PROV: 'Ladder Provinsi',
  LADDER_KAB:  'Ladder Kabupaten/Kota',
  BUMD:        'BUMD Air Minum',
};

// Tab name -> gid. The `/gviz/tq?tqx=out:csv` endpoint (used previously) serves
// a stale cached snapshot for this spreadsheet — entire columns (e.g. "Kapasitas
// Desain") were coming back blank even though the live sheet has values. The
// `/export?format=csv` endpoint below always returns the current, live data, but
// it needs a numeric gid rather than a sheet name.
const TAB_GIDS = {
  'Akses Provinsi':         1880935298,
  'Akses Kabkot':           256189122,
  'Kelembagaan Regulasi':   1693699103,
  'IPAL':                   1038073652,
  'IPLT':                   1156541656,
  'Log Catatan Infras':     2123970257,
  'Team Member':            1947294003,
  'Nasional':               2099105298,
  'Ladder Nasional':        1586846199,
  'Ladder Provinsi':        620466446,
  'Ladder Kabupaten/Kota':  635331547,
  // 'BUMD Air Minum': <gid>,  ← add the tab's gid (from its URL, #gid=…) once
  // the tab exists; until then it is read through the gviz-by-name fallback.
};

function csvUrl(sheet) {
  const gid = TAB_GIDS[sheet];
  if (gid != null) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  }
  // Fallback for any tab not in the gid map.
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

function parseCSV(text) {
  const clean = text.replace(/^\xEF\xBB\xBF/, '');
  const rows = [];
  let cells = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (inQ && clean[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      cells.push(cur.trim()); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      cells.push(cur.trim()); cur = '';
      if (cells.some((c) => c)) rows.push(cells);
      cells = [];
    } else {
      cur += ch;
    }
  }
  if (cur || cells.length) {
    cells.push(cur.trim());
    if (cells.some((c) => c)) rows.push(cells);
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

// Locale-tolerant number parse. Sheets export *displayed* values, so a cell
// may arrive as "27,01" (id-ID), "27.01" (en-US), "1.470.818.051" (id-ID
// grouping) or "1,470,818,051" (en-US grouping). Rule: a separator that
// repeats is a thousands separator; when both appear, the last one is the
// decimal mark; a single "," or "." is a decimal mark.
export function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[^0-9.,-]/g, '');
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  if (dots && commas) {
    const decimal = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
    s = s.split(decimal === ',' ? '.' : ',').join('').replace(',', '.');
  } else if (dots > 1) {
    s = s.replace(/\./g, '');
  } else if (commas > 1) {
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }
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
      kapasitas: pickNum(r, 'kapasitas desain'),
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

// Log Catatan Infras sheet: date, provinsi, kabupaten/kota, infrastruktur, IPAL/IPLT, user, sumber informasi, catatan
export function normalizeLog(raw) {
  return raw.map((r, idx) => ({
    id: idx,
    tanggal: pick(r, 'date', 'tanggal'),
    provinsi: pick(r, 'provinsi'),
    kabkot: pick(r, 'kabupaten/kota', 'kabupaten', 'kabkot'),
    infrastruktur: pick(r, 'infrastruktur', 'nama'),
    type: pick(r, 'ipal/iplt', 'type'),
    user: pick(r, 'user'),
    sumber: pick(r, 'sumber informasi', 'sumber'),
    catatan: pick(r, 'catatan', 'notes'),
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

// Nasional sheet: rows = indicator ("Ladder" col), columns = years 2017-2025.
export const NAT_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

function yearSeries(r) {
  const out = {};
  NAT_YEARS.forEach((y) => { out[`y${y}`] = toNum(r[String(y)]); });
  return out;
}

export function normalizeNasional(raw) {
  const out = { aman: null, layak: null, babs: null };
  raw.forEach((r) => {
    const label = String(pick(r, 'ladder') || '').toLowerCase();
    if (!label) return;
    if (label.includes('layak')) out.layak = yearSeries(r);
    else if (label.includes('babs')) out.babs = yearSeries(r);
    else if (label.includes('aman')) out.aman = yearSeries(r);
  });
  return out;
}

// Ladder Nasional sheet: 6 sanitation-ladder rungs over the same years.
export function normalizeLadderNasional(raw) {
  return raw
    .map((r) => ({ label: pick(r, 'ladder'), values: yearSeries(r) }))
    .filter((x) => x.label);
}

// Ladder Provinsi / Ladder Kabupaten\u002FKota sheets: one row per area,
// columns = ladder rungs (Aman Setempat/Terpusat, Layak Sendiri/Bersama,
// Belum Layak, BABS). Only rungs present in the sheet are emitted.
function extractLadderRungs(row) {
  const keys = Object.keys(row);
  const get = (m) => {
    const k = keys.find((k2) => k2.includes(m));
    return k ? toNum(row[k]) : null;
  };
  const hasSplit = keys.some((k) => k.includes('aman setempat') || k.includes('aman terpusat'));
  const out = [];
  const push = (label, v) => { if (v != null) out.push({ label, value: v }); };
  push('Akses Aman Terpusat', get('aman terpusat'));
  push('Akses Aman Setempat', get('aman setempat'));
  if (!hasSplit) push('Akses Aman', get('akses aman'));
  push('Akses Layak Sendiri', get('layak sendiri'));
  push('Akses Layak Bersama', get('layak bersama'));
  push('Akses Belum Layak', get('belum layak'));
  push('BABS Tertutup', get('babs tertutup'));
  push('BABS di Tempat Terbuka', get('babs di tempat'));
  return out;
}

export function normalizeLadderProvinsi(raw) {
  return raw.map((r) => ({
    kode: String(pick(r, 'kode')).trim(),
    provinsi: pick(r, 'provinsi'),
    rungs: extractLadderRungs(r),
  })).filter((x) => x.kode);
}

export function normalizeLadderKabkot(raw) {
  return raw.map((r) => ({
    kode: String(pick(r, 'kode')).trim(),
    provinsi: pick(r, 'provinsi'),
    kabkot: pick(r, 'kabupaten kota', 'kabupaten/kota', 'kabkot'),
    rungs: extractLadderRungs(r),
  })).filter((x) => x.kode);
}

// BUMD Air Minum sheet (built by scripts/build_bumd_sheet.py): one row per
// BUMD; "Kode BPS" may list several kab/kota ("3101;3171;…") for a BUMD that
// serves a whole province (PAM Jaya). Rp values are raw rupiah; % are 0–100.
const BUMD_STATUS = { sehat: 'Sehat', 'kurang sehat': 'Kurang Sehat', sakit: 'Sakit' };

export function normalizeBumd(raw) {
  return raw.map((r) => {
    const statusRaw = String(pick(r, 'status kinerja')).trim().toLowerCase();
    const fcrRaw = String(pick(r, 'fcr/non fcr', 'fcr')).trim().toLowerCase().replace(/\s+/g, '');
    return {
      kodes: String(pick(r, 'kode bps', 'kode')).split(/[;,\s]+/).map((k) => k.trim()).filter(Boolean),
      provinsi: pick(r, 'provinsi'),
      kabkot: pick(r, 'kabupaten/kota', 'kabupaten'),
      nama: pick(r, 'nama bumd'),
      lingkup: pick(r, 'lingkup') || 'Kabupaten/Kota',
      tahunBuku: pick(r, 'tahun buku'),
      nilai: pickNum(r, 'nilai kinerja'),
      status: BUMD_STATUS[statusRaw] ?? null,
      fcr: fcrRaw === 'fcr' ? true : fcrRaw === 'nonfcr' ? false : null,
      tarif: pickNum(r, 'tarif rata'),
      hpp: pickNum(r, 'hpp'),
      pelangganAktif: pickNum(r, 'pelanggan aktif'),
      pelangganTotal: pickNum(r, 'pelanggan total'),
      pendudukTerlayani: pickNum(r, 'penduduk terlayani'),
      pendudukWilayah: pickNum(r, 'penduduk wilayah'),
      cakupan: pickNum(r, 'cakupan pelayanan'),
      pendapatan: pickNum(r, 'pendapatan operasi'),
      biaya: pickNum(r, 'biaya operasi'),
      laba: pickNum(r, 'laba bersih'),
      tagihan: pickNum(r, 'tagihan rekening'),
      penerimaan: pickNum(r, 'penerimaan rekening'),
      efektivitasTagih: pickNum(r, 'efektivitas penagihan'),
      nrw: pickNum(r, 'kehilangan air'),
    };
  }).filter((b) => b.kodes.length && b.nama);
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
export async function appendLog({ date, provinsi, kabkot, infrastruktur, type, user = '', sumber, catatan }) {
  const scriptUrl = import.meta.env.VITE_SCRIPT_URL;
  const row = {
    date,
    provinsi,
    'kabupaten/kota': kabkot,
    infrastruktur,
    'ipal/iplt': type,
    user,
    'sumber informasi': sumber,
    catatan,
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
