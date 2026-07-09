// Abstract geometric motifs per island group (Option A: evocative of
// handwoven/carved textures, deliberately NOT literal reproductions of any
// named adat pattern). Rendered as a faded decorative corner in PageHeader.

const TILE = 36;

function tile(motif, c) {
  const s = TILE;
  switch (motif) {
    case 'lattice': // diagonal diamond lattice (songket-evocative)
      return (
        <>
          <path d={`M0 ${s / 2} L${s / 2} 0 L${s} ${s / 2} L${s / 2} ${s} Z`} fill="none" stroke={c} strokeWidth="1.4" />
          <circle cx={s / 2} cy={s / 2} r="2.2" fill={c} />
        </>
      );
    case 'kawung': // four-lobe circle cluster (kawung-evocative geometry)
      return (
        <>
          <circle cx={s / 4} cy={s / 4} r={s / 4 - 2} fill="none" stroke={c} strokeWidth="1.4" />
          <circle cx={(3 * s) / 4} cy={s / 4} r={s / 4 - 2} fill="none" stroke={c} strokeWidth="1.4" />
          <circle cx={s / 4} cy={(3 * s) / 4} r={s / 4 - 2} fill="none" stroke={c} strokeWidth="1.4" />
          <circle cx={(3 * s) / 4} cy={(3 * s) / 4} r={s / 4 - 2} fill="none" stroke={c} strokeWidth="1.4" />
        </>
      );
    case 'ikat': // stacked diamonds in stripes (ikat-evocative)
      return (
        <>
          <path d={`M${s / 2} 3 L${s - 5} ${s / 2} L${s / 2} ${s - 3} L5 ${s / 2} Z`} fill="none" stroke={c} strokeWidth="1.4" />
          <path d={`M${s / 2} 11 L${s - 13} ${s / 2} L${s / 2} ${s - 11} L13 ${s / 2} Z`} fill="none" stroke={c} strokeWidth="1.1" />
        </>
      );
    case 'hook': // curling hook/spiral (Dayak-evocative curve)
      return (
        <path
          d={`M6 ${s - 8} Q6 8 ${s / 2} 8 Q${s - 8} 8 ${s - 8} ${s / 2 - 2} Q${s - 8} ${s / 2 + 8} ${s / 2 + 2} ${s / 2 + 8}`}
          fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round"
        />
      );
    case 'chevron': // angular carved chevrons (Toraja-evocative angles)
      return (
        <>
          <path d={`M2 ${s / 3} L${s / 2} 6 L${s - 2} ${s / 3}`} fill="none" stroke={c} strokeWidth="1.5" />
          <path d={`M2 ${(2 * s) / 3 + 4} L${s / 2} ${s / 3 + 10} L${s - 2} ${(2 * s) / 3 + 4}`} fill="none" stroke={c} strokeWidth="1.5" />
        </>
      );
    case 'star': { // eight-point radiating star (clove/compass-evocative)
      const cx = s / 2, cy = s / 2, r1 = s / 2 - 4, r2 = 4;
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a1 = (Math.PI / 4) * i, a2 = a1 + Math.PI / 8;
        pts.push(`${cx + r1 * Math.cos(a1)},${cy + r1 * Math.sin(a1)}`);
        pts.push(`${cx + r2 * Math.cos(a2)},${cy + r2 * Math.sin(a2)}`);
      }
      return <polygon points={pts.join(' ')} fill="none" stroke={c} strokeWidth="1.3" />;
    }
    case 'carve': // parallel carved waves (ukiran-evocative lines)
      return (
        <>
          <path d={`M0 ${s / 4} Q${s / 4} ${s / 4 - 7} ${s / 2} ${s / 4} T${s} ${s / 4}`} fill="none" stroke={c} strokeWidth="1.4" />
          <path d={`M0 ${(3 * s) / 4} Q${s / 4} ${(3 * s) / 4 - 7} ${s / 2} ${(3 * s) / 4} T${s} ${(3 * s) / 4}`} fill="none" stroke={c} strokeWidth="1.4" />
        </>
      );
    default:
      return null;
  }
}

export default function IslandMotif({ island, width = 380, opacity = 0.55 }) {
  if (!island) return null;
  const pid = `motif-${island.id}`;
  return (
    <svg
      aria-hidden="true"
      width={width}
      style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, height: '100%',
        pointerEvents: 'none', opacity,
        maskImage: 'linear-gradient(to right, transparent, black 55%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 55%)',
      }}
    >
      <defs>
        <pattern id={pid} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {tile(island.motif, island.accent)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}
