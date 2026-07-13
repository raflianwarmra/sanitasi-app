// Browser-side PPTX generation (pptxgenjs, lazy-loaded).
// Deck layout mirrors the web dashboard's visual language: KPI cards with
// real trend charts, rasterized choropleth + ranked-bar slides per metric,
// and dual Isu Prioritas slides (list + colored cards). Data-driven only —
// no screenshots, nothing fabricated.

import { slugify, todayLabel } from './format';
import { MAP_METRICS } from './mapMetrics';
import { renderChoroplethPng } from './mapRaster';

const C = {
  ink: '1B2A41',
  ink2: '51617A',
  ink3: '8593A8',
  line: 'D9E0EA',
  bg: 'F4F7FA',
  paper: 'FFFFFF',
  teal: '0E7490',
  tealSoft: '8CC1D1',
  blue: '3455A4',
  ok: '3D8361',
  okSoft: 'E8F2EA',
  warn: 'B45309',
  rose: 'BE123C',
  roseSoft: 'FBECEA',
  blueSoft: 'E9EEF8',
  muted: 'C3CDDB',
};
const FONT = 'Calibri';
const YEARS = [2022, 2023, 2024, 2025];

function pct(v, digits = 1) {
  return v == null || isNaN(v) ? '—' : `${Number(v).toFixed(digits).replace('.', ',')}%`;
}

const hasVal = (v) => v && String(v).trim() && !/^x$/i.test(String(v).trim());

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
        text: `Dashboard Data Sanitasi · Tim Sanitasi Bappenas · ${subtitle} · dibuat ${todayLabel()}`,
        options: { x: 0.5, y: 7.08, w: 10, h: 0.42, fontFace: FONT, fontSize: 9, color: C.ink3, valign: 'middle' },
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

// White card block, matching the dashboard's KPI card look.
function kpiBlock(slide, x, y, w, label, value, sub, color, h = 1.55) {
  slide.addShape('roundRect', { x, y, w, h, rectRadius: 0.05, fill: { color: C.paper }, line: { color: C.line, width: 1 } });
  slide.addText(label, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.32, fontFace: FONT, fontSize: 11, color: C.ink2 });
  slide.addText(value, { x: x + 0.15, y: y + 0.4, w: w - 0.3, h: 0.65, fontFace: FONT, fontSize: 30, bold: true, color });
  if (sub) slide.addText(sub, { x: x + 0.15, y: y + 1.08, w: w - 0.3, h: 0.36, fontFace: FONT, fontSize: 10, color: C.ink3 });
}

const TBL_BASE = { fontFace: FONT, fontSize: 10, color: C.ink, valign: 'middle', border: { type: 'solid', color: C.line, pt: 0.5 } };
const TBL_HEAD = { ...TBL_BASE, bold: true, color: C.ink2, fill: { color: C.bg } };

const MINI_CHART_OPTS = {
  showLegend: false, fontFace: FONT,
  catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
  valGridLine: { color: 'E5EAF1', size: 0.5 }, catGridLine: { style: 'none' },
};

// Indicator card with a native mini trend chart (web IndicatorCard analog).
function indicatorCard(pptx, slide, x, w, def) {
  const y = 1.5, h = 3.35;
  slide.addShape('roundRect', { x, y, w, h, rectRadius: 0.05, fill: { color: C.paper }, line: { color: C.line, width: 1 } });
  slide.addText(def.title, { x: x + 0.16, y: y + 0.1, w: w - 0.32, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.ink });
  slide.addText('Capaian 2025', { x: x + 0.16, y: y + 0.42, w: w - 0.32, h: 0.24, fontFace: FONT, fontSize: 9, color: C.ink3 });
  slide.addText(pct(def.current, 2), { x: x + 0.16, y: y + 0.62, w: w - 0.32, h: 0.5, fontFace: FONT, fontSize: 24, bold: true, color: def.color });
  if (def.targetLine) {
    slide.addText(def.targetLine, { x: x + 0.16, y: y + 1.12, w: w - 0.32, h: 0.24, fontFace: FONT, fontSize: 9, color: C.ink3 });
  }
  slide.addChart(def.type, def.series, {
    x: x + 0.12, y: y + 1.42, w: w - 0.24, h: h - 1.58,
    chartColors: def.chartColors,
    barGrouping: 'clustered',
    lineSize: def.type === 'line' ? 2 : undefined,
    lineSmooth: false,
    ...MINI_CHART_OPTS,
  });
}

function legendRow(slide, x, y, metricDef) {
  const t = metricDef.thresholds;
  const labels = [`< ${t[0]}%`, `${t[0]}–${t[1]}%`, `${t[1]}–${t[2]}%`, `${t[2]}–${t[3]}%`, `≥ ${t[3]}%`];
  let cx = x;
  labels.forEach((lbl, i) => {
    slide.addShape('rect', { x: cx, y, w: 0.18, h: 0.18, fill: { color: metricDef.ramp[i].replace('#', '') }, line: { color: C.line, width: 0.5 } });
    slide.addText(lbl, { x: cx + 0.22, y: y - 0.05, w: 1.05, h: 0.28, fontFace: FONT, fontSize: 8.5, color: C.ink2 });
    cx += 1.28;
  });
}

// ═══════════════════════════════════════════════════════════════
// Province / National deck (7 slides)
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} p normalized province row (kode 'ID' => national)
 * @param {Array} kabs kab/kota rows (or province rows for national)
 * @param {Object} infra { ipal, iplt, kabsNoIPLT, broken }
 * @param {Object} [opts] { kelembagaan: [] } rows scoped to this deck
 */
export async function exportProvincePptx(p, kabs, infra, opts = {}) {
  const isNational = String(p.kode) === 'ID';
  const unitLabel = isNational ? 'provinsi' : 'kab/kota';
  const pptx = await newDeck(`Profil ${isNational ? 'Nasional' : `Provinsi ${p.provinsi}`}`);

  // ── Slide 1: overview — KPI cards w/ trend charts + infra row ──
  let s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, isNational ? 'Profil Sanitasi Nasional' : 'Profil Sanitasi Provinsi', p.provinsi);

  const histAman = YEARS.map((y) => p.aman?.[`y${y}`]);
  const histBabs = YEARS.map((y) => p.babs?.[`y${y}`]);
  const tLabels = [...YEARS.map(String), 'T-2026', 'T-2029'];

  indicatorCard(pptx, s, 0.5, 4.0, {
    title: 'Akses Layak (termasuk Aman)', current: p.layak?.y2025, color: C.blue,
    targetLine: 'Target nasional: 100%', type: 'bar',
    chartColors: [C.blue],
    series: [{ name: 'Layak', labels: YEARS.map(String), values: YEARS.map((y) => p.layak?.[`y${y}`] ?? 0) }],
  });
  indicatorCard(pptx, s, 4.66, 4.0, {
    title: 'Akses Aman', current: p.aman?.y2025, color: C.teal,
    targetLine: `Target 2026: ${pct(p.aman?.target2026)} · 2029: ${pct(p.aman?.target2029)}`,
    type: 'bar', chartColors: [C.teal, C.tealSoft],
    series: [
      { name: 'Capaian', labels: tLabels, values: [...histAman, null, null] },
      { name: 'Target', labels: tLabels, values: [null, null, null, null, p.aman?.target2026, p.aman?.target2029] },
    ],
  });
  indicatorCard(pptx, s, 8.82, 4.0, {
    title: 'BABS di Tempat Terbuka', current: p.babs?.y2025, color: C.rose,
    targetLine: `Target 2026: ${pct(p.babs?.target2026)} · 2029: ${pct(p.babs?.target2029)}`,
    type: 'line', chartColors: [C.rose, 'EA9285'],
    series: [
      { name: 'Capaian', labels: tLabels, values: [...histBabs, null, null] },
      { name: 'Proyeksi target', labels: tLabels, values: [null, null, null, p.babs?.y2025, p.babs?.target2026, p.babs?.target2029] },
    ],
  });

  const fIpal = infra.ipal.filter((x) => x.isFunctioning).length;
  const fIplt = infra.iplt.filter((x) => x.isFunctioning).length;
  kpiBlock(s, 0.5, 5.1, 2.95, 'Unit IPAL', String(infra.ipal.length), `${fIpal} berfungsi · ${infra.ipal.length - fIpal} tidak`, C.teal);
  kpiBlock(s, 3.6, 5.1, 2.95, 'Unit IPLT', String(infra.iplt.length), `${fIplt} berfungsi · ${infra.iplt.length - fIplt} tidak`, C.blue);
  kpiBlock(s, 6.7, 5.1, 2.95, 'Kab/Kota Tanpa IPLT', String(infra.kabsNoIPLT.length), `dari ${kabs.length} ${unitLabel}`, C.warn);
  kpiBlock(s, 9.8, 5.1, 2.95, 'Unit Tidak Berfungsi', String(infra.broken.length), 'IPAL + IPLT', C.rose);

  // ── Slides 2-4: choropleth + ranked bars, one per metric ──
  for (const metricDef of [MAP_METRICS.aman, MAP_METRICS.layak, MAP_METRICS.babs]) {
    s = pptx.addSlide({ masterName: 'MASTER' });
    addTitle(s, `Sebaran ${metricDef.label} ${isNational ? 'Provinsi' : 'Kabupaten/Kota'} · 2025`, p.provinsi);

    const raster = await renderChoroplethPng({ provKode: String(p.kode), rows: kabs, metricDef });
    if (raster) {
      const w = 6.4, h = w * (raster.height / raster.width);
      s.addImage({ data: raster.png, x: 0.5, y: 1.7, w, h: Math.min(h, 4.4) });
      legendRow(s, 0.55, 6.35, metricDef);
    } else {
      s.addText('Peta tidak tersedia — geometri wilayah tidak dapat dimuat.', {
        x: 0.5, y: 3.2, w: 6.4, h: 0.6, fontFace: FONT, fontSize: 12, color: C.ink3, italic: true, align: 'center',
      });
    }

    const ranked = [...kabs]
      .filter((k) => k[metricDef.key] != null)
      .sort((a, b) => (metricDef.higherBetter
        ? (a[metricDef.key] ?? 0) - (b[metricDef.key] ?? 0)
        : (b[metricDef.key] ?? 0) - (a[metricDef.key] ?? 0)));
    const chartRows = ranked.length > 18 ? [...ranked.slice(0, 9), ...ranked.slice(-9)] : ranked;
    s.addChart('bar', [{
      name: metricDef.label,
      labels: chartRows.map((k) => k.kabkot),
      values: chartRows.map((k) => k[metricDef.key] ?? 0),
    }], {
      x: 7.15, y: 1.5, w: 5.65, h: 5.2, barDir: 'bar',
      chartColors: [metricDef.ramp[4].replace('#', '')], showLegend: false, fontFace: FONT,
      catAxisLabelFontSize: 8.5, valAxisLabelFontSize: 8.5,
      showValue: true, dataLabelFontSize: 8, dataLabelColor: C.ink2, dataLabelFormatCode: '0.0"%"',
    });
    if (ranked.length > 18) {
      s.addText('Menampilkan 9 tertinggi dan 9 terendah.', { x: 7.15, y: 6.72, w: 5.65, h: 0.26, fontFace: FONT, fontSize: 9, color: C.ink3, italic: true });
    }
  }

  // ── Slide 5: Isu Prioritas — list style ──
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, p.provinsi, 'Isu Prioritas');
  s.addText(`${unitLabel.toUpperCase()} BELUM MEMILIKI IPLT (${infra.kabsNoIPLT.length})`, {
    x: 0.5, y: 1.5, w: 12.3, h: 0.3, fontFace: FONT, fontSize: 10.5, bold: true, color: C.warn, charSpacing: 1.5,
  });
  if (infra.kabsNoIPLT.length) {
    const names = infra.kabsNoIPLT.map((k) => k.kabkot);
    const per = Math.ceil(names.length / 3);
    [names.slice(0, per), names.slice(per, per * 2), names.slice(per * 2)].forEach((chunk, i) => {
      if (!chunk.length) return;
      s.addText(chunk.map((n) => ({ text: n, options: { bullet: { characterCode: '2022', indent: 10 }, breakLine: true } })), {
        x: 0.5 + i * 4.2, y: 1.85, w: 4.0, h: 2.2, fontFace: FONT, fontSize: 10.5, color: C.ink2, valign: 'top',
      });
    });
  } else {
    s.addText(`Seluruh ${unitLabel} telah memiliki IPLT.`, { x: 0.5, y: 1.85, w: 12.3, h: 0.4, fontFace: FONT, fontSize: 11, color: C.ink2 });
  }

  s.addText(`UNIT TIDAK BERFUNGSI (${infra.broken.length})`, {
    x: 0.5, y: 4.25, w: 12.3, h: 0.3, fontFace: FONT, fontSize: 10.5, bold: true, color: C.rose, charSpacing: 1.5,
  });
  if (infra.broken.length) {
    s.addTable([
      [{ text: 'Jenis', options: TBL_HEAD }, { text: 'Nama Unit', options: TBL_HEAD }, { text: 'Kab/Kota', options: TBL_HEAD }, { text: 'Tahun', options: TBL_HEAD }],
      ...infra.broken.slice(0, 6).map((u) => [
        { text: u.type, options: TBL_BASE }, { text: u.nama, options: TBL_BASE },
        { text: u.kabkot || '—', options: TBL_BASE }, { text: u.tahunBangun || '—', options: TBL_BASE },
      ]),
    ], { x: 0.5, y: 4.58, w: 12.3, colW: [1.4, 5.4, 3.9, 1.6], rowH: 0.28 });
    if (infra.broken.length > 6) {
      s.addText(`+${infra.broken.length - 6} unit lainnya — lihat dashboard.`, { x: 0.5, y: 6.75, w: 12.3, h: 0.24, fontFace: FONT, fontSize: 9, color: C.ink3, italic: true });
    }
  } else {
    s.addText('Seluruh unit tercatat berfungsi.', { x: 0.5, y: 4.58, w: 12.3, h: 0.4, fontFace: FONT, fontSize: 11, color: C.ink2 });
  }

  // ── Slide 6: Isu Prioritas — colored card style ──
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, p.provinsi, 'Isu Prioritas');
  const kel = opts.kelembagaan ?? [];
  const kelByKode = new Map(kel.map((k) => [String(k.kode), k]));
  const babsHigh = kabs.filter((k) => (k.babs2025 ?? 0) > 10)
    .sort((a, b) => (b.babs2025 ?? 0) - (a.babs2025 ?? 0));
  const noOperator = kel.length
    ? kabs.filter((k) => { const r = kelByKode.get(String(k.kode)); return !r || !hasVal(r.statusOperator); })
    : null;
  const noRegulasi = kel.length
    ? kabs.filter((k) => { const r = kelByKode.get(String(k.kode)); return !r || !hasVal(r.regulasiPengelolaan); })
    : null;

  const columns = [
    { title: `${unitLabel} dengan BABS > 10%`, color: C.rose, fill: C.roseSoft, items: babsHigh.map((k) => `${k.kabkot} · ${pct(k.babs2025)}`) },
    { title: `${unitLabel} belum memiliki operator`, color: C.ok, fill: C.okSoft, items: noOperator?.map((k) => k.kabkot) ?? null },
    { title: `${unitLabel} belum memiliki regulasi pengelolaan ALD`, color: C.blue, fill: C.blueSoft, items: noRegulasi?.map((k) => k.kabkot) ?? null },
  ];
  columns.forEach((col, i) => {
    const x = 0.5 + i * 4.32, w = 4.1;
    s.addText(`${col.title.toUpperCase()}${col.items ? ` (${col.items.length})` : ''}`, {
      x, y: 1.5, w, h: 0.62, fontFace: FONT, fontSize: 10.5, bold: true, color: col.color, charSpacing: 1, valign: 'top',
    });
    s.addShape('rect', { x, y: 2.2, w, h: 4.55, fill: { color: col.fill } });
    if (col.items === null) {
      s.addText('Data kelembagaan belum tersedia.', { x: x + 0.2, y: 2.4, w: w - 0.4, h: 0.5, fontFace: FONT, fontSize: 10.5, color: C.ink3, italic: true });
    } else if (!col.items.length) {
      s.addText('Tidak ada — seluruh wilayah memenuhi.', { x: x + 0.2, y: 2.4, w: w - 0.4, h: 0.5, fontFace: FONT, fontSize: 10.5, color: C.ink2, italic: true });
    } else {
      const shown = col.items.slice(0, 24);
      const extra = col.items.length - shown.length;
      s.addText([
        ...shown.map((n) => ({ text: n, options: { bullet: { characterCode: '2022', indent: 10 }, breakLine: true } })),
        ...(extra > 0 ? [{ text: `+${extra} lainnya`, options: { italic: true, breakLine: true } }] : []),
      ], { x: x + 0.15, y: 2.35, w: w - 0.3, h: 4.3, fontFace: FONT, fontSize: 10, color: C.ink, valign: 'top' });
    }
  });

  // ── Slide 7: appendix table ──
  const rankedAll = [...kabs].sort((a, b) => (b.aman2025 ?? -1) - (a.aman2025 ?? -1));
  const header = [isNational ? 'Provinsi' : 'Kabupaten/Kota', 'Akses Aman', 'Akses Layak', 'BABS Terbuka'].map((t) => ({ text: t, options: TBL_HEAD }));
  const rows = rankedAll.map((k) => [
    { text: k.kabkot, options: TBL_BASE },
    { text: pct(k.aman2025, 2), options: { ...TBL_BASE, align: 'right' } },
    { text: pct(k.layak2025, 2), options: { ...TBL_BASE, align: 'right' } },
    { text: pct(k.babs2025, 2), options: { ...TBL_BASE, align: 'right' } },
  ]);
  s = pptx.addSlide({ masterName: 'MASTER' });
  addTitle(s, 'Lampiran Data', p.provinsi);
  s.addTable([header, ...rows], {
    x: 0.5, y: 1.5, w: 12.3, colW: [6.3, 2, 2, 2], rowH: 0.26,
    autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 0.6, autoPageCharWeight: -0.3,
  });

  await pptx.writeFile({ fileName: `sanitasi-${isNational ? 'nasional-indonesia' : `provinsi-${slugify(p.provinsi)}`}.pptx` });
}

// ═══════════════════════════════════════════════════════════════
// Kab/kota deck (4 slides, dashboard-card visual language)
// ═══════════════════════════════════════════════════════════════

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
  if (kel) {
    const kelRows = [
      ['Status Operator', kel.statusOperator || '—'],
      ['Nama Operator', kel.namaOperator || '—'],
      ['Regulasi Pengelolaan ALD', hasVal(kel.regulasiPengelolaan) ? (kel.perdaPengelolaan || 'Ada') : 'Belum ada'],
      ['Regulasi Retribusi / Tarif', hasVal(kel.regulasiRetribusi) ? (kel.perdaRetribusi || 'Ada') : 'Belum ada'],
      ['Cluster Tata Kelola', clusterInfo || kel.clusterTataKelola || '—'],
    ];
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
