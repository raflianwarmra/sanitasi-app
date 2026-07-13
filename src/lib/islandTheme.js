// Island/regional theming — accents the CHROME (header wash, kicker, motif),
// never the DATA (charts, map ramps, tables keep semantic colors).
// See docs/plans/02-design-change-island-theming.md for the boundary rationale.

export const ISLANDS = {
  sumatera: {
    id: 'sumatera', name: 'Sumatera', motif: 'lattice',
    accent: 'oklch(52% 0.115 75)', soft: 'oklch(94% 0.04 80)',
    note: 'Aksen emas songket',
  },
  jawa: {
    id: 'jawa', name: 'Jawa', motif: 'kawung',
    accent: 'oklch(45% 0.09 285)', soft: 'oklch(93.5% 0.03 285)',
    note: 'Aksen indigo batik',
  },
  balinusra: {
    id: 'balinusra', name: 'Bali–Nusa Tenggara', motif: 'ikat',
    accent: 'oklch(54% 0.125 45)', soft: 'oklch(94% 0.04 45)',
    note: 'Aksen terakota tenun ikat',
  },
  kalimantan: {
    id: 'kalimantan', name: 'Kalimantan', motif: 'hook',
    accent: 'oklch(48% 0.095 150)', soft: 'oklch(93.5% 0.035 150)',
    note: 'Aksen hijau hutan',
  },
  sulawesi: {
    id: 'sulawesi', name: 'Sulawesi', motif: 'chevron',
    accent: 'oklch(51% 0.1 195)', soft: 'oklch(93.5% 0.035 195)',
    note: 'Aksen toska pesisir',
  },
  maluku: {
    id: 'maluku', name: 'Maluku', motif: 'star',
    accent: 'oklch(52% 0.135 30)', soft: 'oklch(94% 0.035 30)',
    note: 'Aksen merah rempah',
  },
  papua: {
    id: 'papua', name: 'Papua', motif: 'carve',
    accent: 'oklch(47% 0.09 45)', soft: 'oklch(93.5% 0.03 50)',
    note: 'Aksen cokelat ukiran',
  },
};

// BPS 2-digit province kode prefix -> island id.
const PREFIX_TO_ISLAND = {
  11: 'sumatera', 12: 'sumatera', 13: 'sumatera', 14: 'sumatera', 15: 'sumatera',
  16: 'sumatera', 17: 'sumatera', 18: 'sumatera', 19: 'sumatera', 21: 'sumatera',
  31: 'jawa', 32: 'jawa', 33: 'jawa', 34: 'jawa', 35: 'jawa', 36: 'jawa',
  51: 'balinusra', 52: 'balinusra', 53: 'balinusra',
  61: 'kalimantan', 62: 'kalimantan', 63: 'kalimantan', 64: 'kalimantan', 65: 'kalimantan',
  71: 'sulawesi', 72: 'sulawesi', 73: 'sulawesi', 74: 'sulawesi', 75: 'sulawesi', 76: 'sulawesi',
  81: 'maluku', 82: 'maluku',
  91: 'papua', 92: 'papua', 94: 'papua', 95: 'papua', 96: 'papua', 97: 'papua',
};

export function islandOf(provKode) {
  const prefix = Number(String(provKode ?? '').trim().slice(0, 2));
  const id = PREFIX_TO_ISLAND[prefix];
  return id ? ISLANDS[id] : null;
}

// ── Motif tiles as CSS background data-URIs ──
// Used as the hero container's actual background-image (no absolutely
// positioned overlay), so no clipping/stacking risk. Stroke opacity is
// baked in; color defaults to the island accent.
const T = 36; // tile size
const TILE_SVG = {
  lattice: (c) => `<path d="M0 ${T / 2} L${T / 2} 0 L${T} ${T / 2} L${T / 2} ${T} Z" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${T / 2}" cy="${T / 2}" r="2.2" fill="${c}"/>`,
  kawung: (c) => [[9, 9], [27, 9], [9, 27], [27, 27]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${c}" stroke-width="1.4"/>`).join(''),
  ikat: (c) => `<path d="M${T / 2} 3 L${T - 5} ${T / 2} L${T / 2} ${T - 3} L5 ${T / 2} Z" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M${T / 2} 11 L${T - 13} ${T / 2} L${T / 2} ${T - 11} L13 ${T / 2} Z" fill="none" stroke="${c}" stroke-width="1.1"/>`,
  hook: (c) => `<path d="M6 ${T - 8} Q6 8 ${T / 2} 8 Q${T - 8} 8 ${T - 8} ${T / 2 - 2} Q${T - 8} ${T / 2 + 8} ${T / 2 + 2} ${T / 2 + 8}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`,
  chevron: (c) => `<path d="M2 ${T / 3} L${T / 2} 6 L${T - 2} ${T / 3}" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M2 ${(2 * T) / 3 + 4} L${T / 2} ${T / 3 + 10} L${T - 2} ${(2 * T) / 3 + 4}" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  star: (c) => {
    const cx = T / 2, cy = T / 2, r1 = T / 2 - 4, r2 = 4;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a1 = (Math.PI / 4) * i, a2 = a1 + Math.PI / 8;
      pts.push(`${(cx + r1 * Math.cos(a1)).toFixed(1)},${(cy + r1 * Math.sin(a1)).toFixed(1)}`);
      pts.push(`${(cx + r2 * Math.cos(a2)).toFixed(1)},${(cy + r2 * Math.sin(a2)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="none" stroke="${c}" stroke-width="1.3"/>`;
  },
  carve: (c) => `<path d="M0 ${T / 4} Q${T / 4} ${T / 4 - 7} ${T / 2} ${T / 4} T${T} ${T / 4}" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M0 ${(3 * T) / 4} Q${T / 4} ${(3 * T) / 4 - 7} ${T / 2} ${(3 * T) / 4} T${T} ${(3 * T) / 4}" fill="none" stroke="${c}" stroke-width="1.4"/>`,
};

export function motifTileUri(island, opacity = 0.4) {
  const tile = TILE_SVG[island.motif]?.(island.accent);
  if (!tile) return 'none';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}"><g opacity="${opacity}">${tile}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
