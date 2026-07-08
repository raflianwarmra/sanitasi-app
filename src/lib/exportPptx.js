// Browser-side PPTX generation (pptxgenjs, lazy-loaded).
// Same visual identity as the dashboard: navy ink, teal accent, restrained.

import { slugify, todayLabel } from './format';

const C = {
  ink: '1B2A41',
  ink2: '51617A',
  ink3: '8593A8',
  line: 'D9E0EA',
  bg: 'F4F7FA',
  paper: 'FFFFFF',
  teal: '0E7490',
  blue: '3455A4',
  ok: '3D8361',
  warn: 'B45309',
  rose: 'BE123C',
  muted: 'C3CDDB',
};
const FONT = 'Calibri';

function pct(v, digits = 1) {
  return v == null || isNaN(v) ? '—' : `${Number(v).toFixed(digits).replace('.', ',')}%`;
}

async function newDeck(subtitle) {
  const { default: PptxGen } = await import('pptxgenjs');
  const pptx = new PptxGen();
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.defineSlideMaster({
    title: 'MASTER',
    background: { color: C.paper },
    objects: [
      { rect: { x: 0, y: 7.08, w: '100%', h: 0.42, fill: { color: C.bg } } },
      { text: {
        text: `Sanitasi.id · ${subtitle} · dibuat ${todayLabel()}`,
        options: { x: 0.5, y: 7.08, w: 9, h: 0.42, fontFace: FONT, fontSize: 9, color: C.ink3, valign: 'middle' },
      } },
    ],
    slideNumber: { x: 12.5, y: 7.12, fontFace: FONT, fontSize: 9, color: C.ink3 },
  });
  return pptx;
}

function addTitle(slide, kicker, title) {
  slide.addText(kicker.toUpperCase(), {
    x: 0.5, y: 0.32, w: 12.3, h: 0.3,
    fontFace: FONT, fontSize: 11, color: C.teal, charSpacing: 2, bold: true,
  });
  slide.addText(title, {
    x: 0.5, y: 0.6, w: 12.3, h: 0.62,
    fontFace: FONT, fontSize: 26, color: C.ink, bold: true,
  });
}

function kpiBlock(slide, x, y, w, label, value, sub, color) {
  slide.addShape('rect', { x, y, w, h: 1.55, fill: { color: C.bg }, line: { color: C.line, width: 0.75 } });
  slide.addText(label, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.32, fontFace: FONT, fontSize: 11, color: C.ink2 });
  slide.addText(value, { x: x + 0.15, y: y + 0.4, w: w - 0.3, h: 0.65, fontFace: FONT, fontSize: 30, bold: true, color });
  if (sub) slide.addText(sub, { x: x + 0.15, y: y + 1.08, w: w - 0.3, h: 0.36, fontFace: FONT, fontSize: 10, color: C.ink3 });
}

const TBL_BASE = { fontFace: FONT, fontSize: 10, color: C.ink, valign: 'middle', border: { type: 'solid', color: C.line, pt: 0.5 } };
const TBL_HEAD = { ...TBL_BASE, bold: true, color: C.ink2, fill: { color: C.bg } };

// ═══════════════════════════════════════════════════════════════
// Province deck
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} p normalized province row (from normalizeProvinsi)
 * @param {Array} kabs kab/kota rows within the province
 * @param {Object} infra { ipal: [], iplt: [], kabsNoIPLT: [], broken: [] }
 */
export async function exportProvincePptx(p, kabs, infra) {
  const pptx = await newDeck(`Profil Provinsi ${p.provinsi}`);

  // ── Slide 1: overview ──
  let s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Profil Sanitasi Provinsi', p.provinsi);
  s.addText(`Capaian akses sanitasi 2025 dan target RPJMN · ${kabs.length} kabupaten/kota`, {
    x: 0.5, y: 1.28, w: 12.3, h: 0.35, fontFace: FONT, fontSize: 13, color: C.ink2,
  });

  kpiBlock(s, 0.5, 1.9, 4.0, 'Akses Layak (termasuk Aman) 2025', pct(p.layak?.y2025), 'Target nasional: 100%', C.blue);
  kpiBlock(s, 4.66, 1.9, 4.0, 'Akses Aman 2025', pct(p.aman?.y2025),
    `Target 2026: ${pct(p.aman?.target2026)} · 2029: ${pct(p.aman?.target2029)}`, C.teal);
  kpiBlock(s, 8.82, 1.9, 4.0, 'BABS di Tempat Terbuka 2025', pct(p.babs?.y2025),
    `Target 2026: ${pct(p.babs?.target2026)} · 2029: ${pct(p.babs?.target2029)}`, C.rose);

  // Trend mini-chart (grouped bar 2022-2025)
  const years = ['2022', '2023', '2024', '2025'];
  s.addChart('bar', [
    { name: 'Layak', labels: years, values: years.map((y) => p.layak?.[`y${y}`] ?? 0) },
    { name: 'Aman', labels: years, values: years.map((y) => p.aman?.[`y${y}`] ?? 0) },
    { name: 'BABS', labels: years, values: years.map((y) => p.babs?.[`y${y}`] ?? 0) },
  ], {
    x: 0.5, y: 3.75, w: 8.2, h: 3.1,
    chartColors: [C.blue, C.teal, C.rose],
    barGrouping: 'clustered', showLegend: true, legendPos: 'b', legendFontSize: 10,
    catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, dataLabelFontSize: 9,
    valAxisMaxVal: 100, fontFace: FONT,
  });

  // Interpretation
  const gapAman = p.aman?.target2029 != null && p.aman?.y2025 != null ? p.aman.target2029 - p.aman.y2025 : null;
  const interpretasi = [
    gapAman != null && gapAman > 0
      ? `Gap akses aman terhadap target 2029 sebesar ${pct(gapAman)}.`
      : gapAman != null ? 'Target akses aman 2029 telah tercapai.' : null,
    (p.babs?.y2025 ?? 0) > 5 ? `BABS terbuka masih ${pct(p.babs?.y2025)} — perlu percepatan.` : null,
    infra.kabsNoIPLT.length ? `${infra.kabsNoIPLT.length} kab/kota belum memiliki IPLT.` : null,
    infra.broken.length ? `${infra.broken.length} unit IPAL/IPLT tidak berfungsi.` : null,
  ].filter(Boolean);
  s.addText('CATATAN', { x: 9.0, y: 3.75, w: 3.83, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.ink3, charSpacing: 1.5 });
  s.addText(interpretasi.map((t) => ({ text: t, options: { bullet: { characterCode: '2022', indent: 10 }, breakLine: true } })), {
    x: 9.0, y: 4.05, w: 3.83, h: 2.8, fontFace: FONT, fontSize: 11, color: C.ink2, valign: 'top',
  });

  // ── Slide 2: kab/kota distribution ──
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Sebaran Kabupaten/Kota', 'Akses Aman per Kab/Kota · 2025');
  const ranked = [...kabs].sort((a, b) => (b.aman2025 ?? -1) - (a.aman2025 ?? -1));
  const chartRows = ranked.length > 18 ? [...ranked.slice(0, 9), ...ranked.slice(-9)] : ranked;
  s.addChart('bar', [{
    name: 'Akses Aman 2025',
    labels: chartRows.map((k) => k.kabkot),
    values: chartRows.map((k) => k.aman2025 ?? 0),
  }], {
    x: 0.5, y: 1.5, w: 7.9, h: 5.3, barDir: 'bar',
    chartColors: [C.teal], showLegend: false, fontFace: FONT,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
    showValue: true, dataLabelFontSize: 8, dataLabelColor: C.ink2, dataLabelFormatCode: '0.0"%"',
  });
  if (ranked.length > 18) {
    s.addText('Menampilkan 9 tertinggi dan 9 terendah.', { x: 0.5, y: 6.78, w: 7.9, h: 0.26, fontFace: FONT, fontSize: 9, color: C.ink3, italic: true });
  }

  const top3 = ranked.slice(0, 3);
  const bottom3 = ranked.filter((k) => k.aman2025 != null).slice(-3).reverse();
  s.addText('TERTINGGI', { x: 8.7, y: 1.55, w: 4.1, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.ok, charSpacing: 1.5 });
  s.addText(top3.map((k) => ({ text: `${k.kabkot} — ${pct(k.aman2025)}`, options: { bullet: { characterCode: '2022', indent: 10 }, breakLine: true } })), {
    x: 8.7, y: 1.85, w: 4.1, h: 1.1, fontFace: FONT, fontSize: 11, color: C.ink2, valign: 'top',
  });
  s.addText('TERENDAH', { x: 8.7, y: 3.1, w: 4.1, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.rose, charSpacing: 1.5 });
  s.addText(bottom3.map((k) => ({ text: `${k.kabkot} — ${pct(k.aman2025)}`, options: { bullet: { characterCode: '2022', indent: 10 }, breakLine: true } })), {
    x: 8.7, y: 3.4, w: 4.1, h: 1.1, fontFace: FONT, fontSize: 11, color: C.ink2, valign: 'top',
  });
  const babsHigh = kabs.filter((k) => (k.babs2025 ?? 0) > 10).length;
  s.addText('KESENJANGAN UTAMA', { x: 8.7, y: 4.65, w: 4.1, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.ink3, charSpacing: 1.5 });
  s.addText([
    { text: `${kabs.filter((k) => (k.aman2025 ?? 0) < 10).length} kab/kota dengan akses aman < 10%`, options: { bullet: { characterCode: '2022', indent: 10 }, breakLine: true } },
    { text: `${babsHigh} kab/kota dengan BABS terbuka > 10%`, options: { bullet: { characterCode: '2022', indent: 10 }, breakLine: true } },
  ], { x: 8.7, y: 4.95, w: 4.1, h: 1.5, fontFace: FONT, fontSize: 11, color: C.ink2, valign: 'top' });

  // ── Slide 3: infrastructure ──
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Status Infrastruktur', 'IPAL & IPLT');
  const fIpal = infra.ipal.filter((x) => x.isFunctioning).length;
  const fIplt = infra.iplt.filter((x) => x.isFunctioning).length;
  kpiBlock(s, 0.5, 1.5, 2.95, 'Unit IPAL', String(infra.ipal.length), `${fIpal} berfungsi · ${infra.ipal.length - fIpal} tidak`, C.teal);
  kpiBlock(s, 3.6, 1.5, 2.95, 'Unit IPLT', String(infra.iplt.length), `${fIplt} berfungsi · ${infra.iplt.length - fIplt} tidak`, C.blue);
  kpiBlock(s, 6.7, 1.5, 2.95, 'Kab/Kota Tanpa IPLT', String(infra.kabsNoIPLT.length), `dari ${kabs.length} kab/kota`, C.warn);
  kpiBlock(s, 9.8, 1.5, 2.95, 'Unit Tidak Berfungsi', String(infra.broken.length), 'IPAL + IPLT', C.rose);

  const noIpltText = infra.kabsNoIPLT.slice(0, 24).map((k) => k.kabkot).join(', ')
    + (infra.kabsNoIPLT.length > 24 ? `, +${infra.kabsNoIPLT.length - 24} lainnya` : '');
  s.addText('KAB/KOTA BELUM MEMILIKI IPLT', { x: 0.5, y: 3.4, w: 12.3, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.warn, charSpacing: 1.5 });
  s.addText(infra.kabsNoIPLT.length ? noIpltText : 'Seluruh kab/kota telah memiliki IPLT.', {
    x: 0.5, y: 3.7, w: 12.3, h: 0.85, fontFace: FONT, fontSize: 11, color: C.ink2, valign: 'top',
  });

  s.addText('UNIT PRIORITAS (TIDAK BERFUNGSI)', { x: 0.5, y: 4.7, w: 12.3, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: C.rose, charSpacing: 1.5 });
  if (infra.broken.length) {
    s.addTable([
      [{ text: 'Jenis', options: TBL_HEAD }, { text: 'Nama Unit', options: TBL_HEAD }, { text: 'Kab/Kota', options: TBL_HEAD }, { text: 'Tahun', options: TBL_HEAD }],
      ...infra.broken.slice(0, 6).map((u) => [
        { text: u.type, options: TBL_BASE }, { text: u.nama, options: TBL_BASE },
        { text: u.kabkot || '—', options: TBL_BASE }, { text: u.tahunBangun || '—', options: TBL_BASE },
      ]),
    ], { x: 0.5, y: 5.0, w: 12.3, colW: [1.4, 5.4, 3.9, 1.6], rowH: 0.28 });
    if (infra.broken.length > 6) {
      s.addText(`+${infra.broken.length - 6} unit lainnya — lihat dashboard.`, { x: 0.5, y: 6.85, w: 12.3, h: 0.24, fontFace: FONT, fontSize: 9, color: C.ink3, italic: true });
    }
  } else {
    s.addText('Seluruh unit tercatat berfungsi.', { x: 0.5, y: 5.0, w: 12.3, h: 0.4, fontFace: FONT, fontSize: 11, color: C.ink2 });
  }

  // ── Slide 4+: appendix table ──
  const header = ['Kabupaten/Kota', 'Akses Aman', 'Akses Layak', 'BABS Terbuka'].map((t) => ({ text: t, options: TBL_HEAD }));
  const rows = ranked.map((k) => [
    { text: k.kabkot, options: TBL_BASE },
    { text: pct(k.aman2025, 2), options: { ...TBL_BASE, align: 'right' } },
    { text: pct(k.layak2025, 2), options: { ...TBL_BASE, align: 'right' } },
    { text: pct(k.babs2025, 2), options: { ...TBL_BASE, align: 'right' } },
  ]);
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Lampiran Data', `Kab/Kota · ${p.provinsi}`);
  s.addTable([header, ...rows], {
    x: 0.5, y: 1.5, w: 12.3, colW: [6.3, 2, 2, 2], rowH: 0.26,
    autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 0.6, autoPageCharWeight: -0.3,
  });

  await pptx.writeFile({ fileName: `sanitasi-provinsi-${slugify(p.provinsi)}.pptx` });
}

// ═══════════════════════════════════════════════════════════════
// Kab/kota deck
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} kab normalized kabkot row
 * @param {Object|null} kel kelembagaan row
 * @param {string|null} clusterInfo e.g. "F — Tata Kelola Lengkap"
 * @param {Array} infra IPAL+IPLT rows for this kab
 * @param {Array} logs catatan rows for this kab
 */
export async function exportKabkotaPptx(kab, kel, clusterInfo, infra, logs) {
  const pptx = await newDeck(`Profil ${kab.kabkot}`);

  // ── Slide 1: overview ──
  let s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, `Profil Sanitasi Kabupaten/Kota · ${kab.provinsi}`, kab.kabkot);
  s.addText(`Kode BPS ${kab.kode}${clusterInfo ? ` · Cluster Tata Kelola ${clusterInfo}` : ''}`, {
    x: 0.5, y: 1.28, w: 12.3, h: 0.35, fontFace: FONT, fontSize: 13, color: C.ink2,
  });
  kpiBlock(s, 0.5, 1.95, 4.0, 'Akses Layak (termasuk Aman) 2025', pct(kab.layak2025), null, C.blue);
  kpiBlock(s, 4.66, 1.95, 4.0, 'Akses Aman 2025', pct(kab.aman2025), null, C.teal);
  kpiBlock(s, 8.82, 1.95, 4.0, 'BABS di Tempat Terbuka 2025', pct(kab.babs2025), null, C.rose);

  // Sanitation ladder as a single stacked bar
  const aman = kab.aman2025 ?? 0;
  const layakNon = Math.max(0, (kab.layak2025 ?? 0) - aman);
  const babs = kab.babs2025 ?? 0;
  const sisa = Math.max(0, 100 - aman - layakNon - babs);
  s.addChart('bar', [
    { name: 'Akses Aman', labels: ['Komposisi 2025'], values: [aman] },
    { name: 'Layak (non-Aman)', labels: ['Komposisi 2025'], values: [layakNon] },
    { name: 'Dasar / Belum Layak', labels: ['Komposisi 2025'], values: [sisa] },
    { name: 'BABS Terbuka', labels: ['Komposisi 2025'], values: [babs] },
  ], {
    x: 0.5, y: 3.85, w: 12.3, h: 2.9, barDir: 'bar', barGrouping: 'stacked',
    chartColors: [C.teal, C.blue, C.muted, C.rose], fontFace: FONT,
    showLegend: true, legendPos: 'b', legendFontSize: 10,
    valAxisMaxVal: 100, catAxisHidden: true, valAxisLabelFontSize: 9,
    showValue: true, dataLabelFontSize: 9, dataLabelColor: 'FFFFFF', dataLabelFormatCode: '0.0"%"',
  });

  // ── Slide 2: kelembagaan ──
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Kelembagaan & Regulasi', kab.kabkot);
  const has = (v) => v && String(v).trim() && !/^x$/i.test(String(v).trim());
  const kelRows = kel ? [
    ['Status Operator', kel.statusOperator || '—'],
    ['Nama Operator', kel.namaOperator || '—'],
    ['Regulasi Pengelolaan ALD', has(kel.regulasiPengelolaan) ? (kel.perdaPengelolaan || 'Ada') : 'Belum ada'],
    ['Regulasi Retribusi / Tarif', has(kel.regulasiRetribusi) ? (kel.perdaRetribusi || 'Ada') : 'Belum ada'],
    ['Cluster Tata Kelola', clusterInfo || kel.clusterTataKelola || '—'],
  ] : [];
  if (kel) {
    s.addTable([
      [{ text: 'Aspek', options: TBL_HEAD }, { text: 'Status', options: TBL_HEAD }],
      ...kelRows.map(([a, b]) => [{ text: a, options: { ...TBL_BASE, bold: true } }, { text: b, options: TBL_BASE }]),
    ], { x: 0.5, y: 1.6, w: 12.3, colW: [4.3, 8], rowH: 0.5 });
    s.addText(
      'Cluster tata kelola mengelompokkan kesiapan kelembagaan sanitasi daerah dari A (perlu intervensi menyeluruh) hingga F (tata kelola lengkap), berdasarkan status operator dan kelengkapan regulasi.',
      { x: 0.5, y: 4.9, w: 12.3, h: 0.8, fontFace: FONT, fontSize: 11, color: C.ink2, italic: true },
    );
  } else {
    s.addText('Data kelembagaan untuk kab/kota ini belum tersedia pada sheet "Kelembagaan Regulasi".', {
      x: 0.5, y: 1.8, w: 12.3, h: 0.5, fontFace: FONT, fontSize: 12, color: C.ink3, italic: true,
    });
  }

  // ── Slide 3: infrastructure ──
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Profil Infrastruktur', `IPAL & IPLT · ${kab.kabkot}`);
  if (infra.length) {
    const header = ['Jenis', 'Nama Unit', 'Kapasitas (m³/hari)', 'Utilisasi', 'Status', 'Catatan'].map((t) => ({ text: t, options: TBL_HEAD }));
    const rows = infra.map((u) => {
      const util = u.kapasitas && u.kapasitasTerpakai ? (u.kapasitasTerpakai / u.kapasitas) * 100 : null;
      const nLogs = logs.filter((l) => (l.infrastruktur || '').toLowerCase() === (u.nama || '').toLowerCase()).length;
      return [
        { text: u.type, options: TBL_BASE },
        { text: u.nama, options: TBL_BASE },
        { text: u.kapasitas != null ? String(u.kapasitas) : '—', options: { ...TBL_BASE, align: 'right' } },
        { text: util != null ? pct(util, 1) : '—', options: { ...TBL_BASE, align: 'right' } },
        { text: u.isFunctioning ? 'Berfungsi' : 'Tidak berfungsi', options: { ...TBL_BASE, color: u.isFunctioning ? C.ok : C.rose, bold: true } },
        { text: nLogs ? `${nLogs}` : '—', options: { ...TBL_BASE, align: 'center' } },
      ];
    });
    s.addTable([header, ...rows], {
      x: 0.5, y: 1.6, w: 12.3, colW: [1.2, 4.6, 2.2, 1.6, 1.9, 0.8], rowH: 0.32,
      autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 0.6,
    });
  } else {
    s.addText('Belum ada data IPAL/IPLT tercatat untuk kab/kota ini.', {
      x: 0.5, y: 1.8, w: 12.3, h: 0.5, fontFace: FONT, fontSize: 12, color: C.ink3, italic: true,
    });
  }

  // ── Slide 4: notes ──
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Catatan Lapangan', kab.kabkot);
  const recent = logs.slice(0, 8);
  if (recent.length) {
    const header = ['Tanggal', 'Infrastruktur', 'Sumber', 'Catatan'].map((t) => ({ text: t, options: TBL_HEAD }));
    const rows = recent.map((l) => [
      { text: l.tanggal || '—', options: TBL_BASE },
      { text: l.infrastruktur || '—', options: TBL_BASE },
      { text: l.sumber || '—', options: TBL_BASE },
      { text: l.catatan || '—', options: TBL_BASE },
    ]);
    s.addTable([header, ...rows], {
      x: 0.5, y: 1.6, w: 12.3, colW: [1.5, 2.8, 1.9, 6.1], rowH: 0.5,
      autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 0.6,
    });
  } else {
    s.addText('Belum ada catatan lapangan untuk kab/kota ini. Catatan dapat ditambahkan melalui tab Infrastruktur pada dashboard.', {
      x: 0.5, y: 1.8, w: 12.3, h: 0.6, fontFace: FONT, fontSize: 12, color: C.ink3, italic: true,
    });
  }

  await pptx.writeFile({ fileName: `sanitasi-kabkota-${slugify(kab.kabkot)}.pptx` });
}
