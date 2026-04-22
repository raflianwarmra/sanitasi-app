// Google Sheets data layer
// Sheet ID from the user's spreadsheet
export const SHEET_ID = '1CFMj0fmiuKtHm8DGS_7zLRkaMbCL33GfkjsK-R9s9gE';

// Sheet GIDs — update these if needed (visible in the URL when tab is selected)
export const SHEET_GIDS = {
  PROVINSI: 'PROVINSI',
  KABKOT: 'KABKOT',
  IPAL: 'IPAL',
  IPLT: 'IPLT',
  LOG: 'log infrastruktur',
};

function csvUrl(sheet) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

function parseCSV(text) {
  // Remove BOM and gviz prefix
  const clean = text.replace(/^\xEF\xBB\xBF/, '').replace(/^[\s\S]*?\r?\n/, (m) => {
    // Keep if looks like a CSV header row (no ]})
    return m.includes(']') || m.includes('}') ? '' : m;
  });

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
  const headers = rows[0].map((h) => h.toLowerCase().trim());
  return rows.slice(1).filter((r) => r.some((c) => c)).map((r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    return obj;
  });
}

async function fetchSheet(sheetName) {
  const url = csvUrl(sheetName);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${sheetName}`);
  const text = await res.text();
  const rows = parseCSV(text);
  return rowsToObjects(rows);
}

// ── Normalizers ──────────────────────────────────────────────

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function normalizeProvinsi(raw) {
  return raw.map((r) => ({
    id: r['no'] || r['id'] || '',
    provinsi: r['provinsi'] || r['nama_provinsi'] || r['nama'] || '',
    layak2024: toNum(r['layak_2024'] ?? r['akses_layak_2024'] ?? r['layak']),
    layak2023: toNum(r['layak_2023'] ?? r['akses_layak_2023']),
    aman2024:  toNum(r['aman_2024']  ?? r['akses_aman_2024']  ?? r['aman']),
    aman2023:  toNum(r['aman_2023']  ?? r['akses_aman_2023']),
    babs2024:  toNum(r['babs_2024']  ?? r['babs']),
    babs2023:  toNum(r['babs_2023']),
    targetRpjmn: toNum(r['target_rpjmn'] ?? r['target']),
    jumlahKabkot: toNum(r['jumlah_kabkot'] ?? r['kab_kota'] ?? r['n_kabkot']),
    penduduk: toNum(r['penduduk'] ?? r['jumlah_penduduk']),
    raw: r,
  })).filter((p) => p.provinsi);
}

export function normalizeKabkot(raw) {
  return raw.map((r) => ({
    id: r['no'] || r['id'] || '',
    kabkot: r['kabupaten_kota'] ?? r['kabkota'] ?? r['nama'] ?? r['kab_kota'] ?? '',
    provinsi: r['provinsi'] ?? r['nama_provinsi'] ?? '',
    layak2024: toNum(r['layak_2024'] ?? r['akses_layak_2024'] ?? r['layak']),
    aman2024:  toNum(r['aman_2024']  ?? r['akses_aman_2024']  ?? r['aman']),
    babs2024:  toNum(r['babs_2024']  ?? r['babs']),
    cluster:   r['cluster'] ?? '',
    // Kelembagaan fields
    pokja:     r['pokja'] ?? r['pokja_sanitasi'] ?? '',
    sk:        r['sk_pokja'] ?? r['sk'] ?? '',
    anggaran:  r['anggaran_apbd'] ?? r['apbd'] ?? '',
    operator:  r['operator'] ?? '',
    // Regulasi fields
    perda:     r['perda'] ?? '',
    perbup:    r['perbup'] ?? r['perwali'] ?? '',
    ssk:       r['ssk'] ?? '',
    mps:       r['mps'] ?? '',
    raw: r,
  })).filter((k) => k.kabkot);
}

export function normalizeInfra(raw, type) {
  return raw.map((r) => {
    const status = (r['keberfungsian'] ?? r['status'] ?? r['kondisi'] ?? '').toLowerCase();
    const isFunctioning = status && !status.includes('tidak');
    return {
      id: r['no'] ?? r['id'] ?? '',
      type,
      nama: r['nama'] ?? r['infrastruktur'] ?? r['nama_infrastruktur'] ?? `${type}-${r['no']}`,
      kabkot: r['kabupaten_kota'] ?? r['kabkota'] ?? r['kota'] ?? '',
      provinsi: r['provinsi'] ?? '',
      kapasitas: toNum(r['kapasitas_desain'] ?? r['kapasitas']),
      kapasitasTerpakai: toNum(r['kapasitas_terpakai'] ?? r['terpakai']),
      sr: toNum(r['sr'] ?? r['sambungan_rumah'] ?? r['kk'] ?? r['kepala_keluarga']),
      tahunBangun: r['tahun_bangun'] ?? r['tahun'] ?? '',
      tahunPenyerahan: r['tahun_penyerahan'] ?? '',
      statusText: r['keberfungsian'] ?? r['status'] ?? r['kondisi'] ?? '',
      isFunctioning,
      raw: r,
    };
  }).filter((i) => i.kabkot || i.nama);
}

export function normalizeLog(raw) {
  return raw.map((r) => ({
    id: r['no'] ?? r['id'] ?? '',
    idInfra: r['id_infra'] ?? r['infrastruktur_id'] ?? '',
    tanggal: r['tanggal'] ?? r['date'] ?? '',
    sumber: r['sumber'] ?? r['sumber_informasi'] ?? '',
    catatan: r['catatan'] ?? r['notes'] ?? '',
    user: r['user'] ?? r['nama'] ?? '',
    raw: r,
  })).filter((l) => l.idInfra || l.catatan);
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
// If VITE_SCRIPT_URL is set, POST to it; otherwise store in sessionStorage fallback.
export async function appendLog({ idInfra, tanggal, sumber, catatan, user = '' }) {
  const scriptUrl = import.meta.env.VITE_SCRIPT_URL;
  const row = { id_infra: idInfra, tanggal, sumber, catatan, user, timestamp: new Date().toISOString() };

  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet: 'log infrastruktur', row }),
    });
    if (!res.ok) throw new Error(`Script POST failed: ${res.status}`);
  }

  // Optimistic local cache update
  const existing = cache[SHEET_GIDS.LOG] ?? [];
  const newEntry = { id_infra: idInfra, tanggal, sumber, catatan, user };
  cache[SHEET_GIDS.LOG] = [newEntry, ...existing];
  cacheTime[SHEET_GIDS.LOG] = Date.now();

  return row;
}
