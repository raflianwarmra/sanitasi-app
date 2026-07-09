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
