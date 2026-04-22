export default function LogCatatanList({ logs, emptyText = 'Belum ada catatan.' }) {
  if (!logs || logs.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', padding: '12px 0' }}>
        {emptyText}
      </div>
    );
  }

  const sorted = [...logs].sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));

  return (
    <div style={{ position: 'relative', paddingLeft: 26, maxHeight: 320, overflowY: 'auto' }} className="no-scrollbar">
      <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--line)' }} />
      {sorted.map((log, i) => (
        <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
          <div style={{
            position: 'absolute', left: -22, top: 3,
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--paper)', border: '2px solid var(--accent)',
          }} />
          <div className="card" style={{ padding: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600 }}>{log.tanggal || '—'}</span>
              {log.sumber && <span className="chip chip-accent" style={{ fontSize: 10 }}>{log.sumber}</span>}
              {log.user && <span style={{ fontSize: 10, color: 'var(--ink-3)', marginLeft: 'auto', fontFamily: 'JetBrains Mono' }}>oleh {log.user}</span>}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink)' }}>{log.catatan}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
