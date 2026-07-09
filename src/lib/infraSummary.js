// Shared analytics for the Infrastruktur tab: executive summary, composite
// risk scoring, and kab/kota coverage gaps. Kept out of the component so the
// same numbers can feed exports later.

export function utilizationPct(infra) {
  if (!infra.kapasitas || infra.kapasitasTerpakai == null) return null;
  return (infra.kapasitasTerpakai / infra.kapasitas) * 100;
}

export function computeInfraExecutiveSummary(infraList) {
  const total = infraList.length;
  const functioning = infraList.filter((i) => i.isFunctioning).length;
  const lowUtil = infraList.filter((i) => {
    const u = utilizationPct(i);
    return u != null && u < 30;
  }).length;
  return {
    total,
    functioning,
    notFunctioning: total - functioning,
    pctFunctioning: total ? (functioning / total) * 100 : null,
    lowUtil,
  };
}

// Kab/kota with zero recorded units of a type ('IPAL' | 'IPLT').
export function coverageGaps(kabkotList, infraList, type) {
  const have = new Set(infraList.filter((i) => i.type === type).map((i) => String(i.kode)));
  return kabkotList.filter((k) => !have.has(String(k.kode)));
}

const SIX_MONTHS_MS = 183 * 24 * 3600 * 1000;
const CURRENT_YEAR = new Date().getFullYear();

// Composite risk score. Non-functioning dominates; low utilization, stale
// notes, and old build year add weight. Returns { score, reasons[] }.
export function riskOf(infra, logsForUnit) {
  const reasons = [];
  let score = 0;
  if (!infra.isFunctioning) { score += 3; reasons.push('Tidak berfungsi'); }
  const u = utilizationPct(infra);
  if (u != null && u < 30) { score += 2; reasons.push(`Utilisasi ${Math.round(u)}%`); }
  const latest = (logsForUnit ?? [])
    .map((l) => Date.parse(l.tanggal))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];
  if (!latest || Date.now() - latest > SIX_MONTHS_MS) {
    score += 1; reasons.push('Tanpa catatan 6 bulan');
  }
  const year = parseInt(infra.tahunBangun, 10);
  if (!Number.isNaN(year) && CURRENT_YEAR - year > 15) {
    score += 1; reasons.push(`Dibangun ${year}`);
  }
  return { score, reasons };
}

export function rankByRisk(infraList, logsFor, limit = 8) {
  return infraList
    .map((infra) => ({ infra, ...riskOf(infra, logsFor(infra)) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
