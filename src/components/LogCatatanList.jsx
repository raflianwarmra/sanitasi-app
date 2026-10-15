export default function LogCatatanList({ logs, emptyText = 'Belum ada catatan.' }) {
  if (!logs || logs.length === 0) {
    return <div className="text-caption" style={{ padding: '10px 0' }}>{emptyText}</div>;
  }

  const sorted = [...logs].sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));

  return (
    <ol tabIndex={0} aria-label={`${sorted.length} catatan lapangan`} style={{ position: 'relative', listStyle: 'none', margin: 0, paddingLeft: 24, maxHeight: 320, overflowY: 'auto', borderRadius: 10 }} className="no-scrollbar">
      <span aria-hidden="true" style={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, borderRadius: 1, background: 'var(--line)' }} />
      {sorted.map((log, i) => (
        <li key={i} style={{ position: 'relative', paddingBottom: 10 }}>
          <span aria-hidden="true" style={{
            position: 'absolute', left: -20, top: 12,
            width: 10, height: 10, borderRadius: '50%',
            background: 'var(--paper)', border: '2px solid var(--accent)',
          }} />
          <div className="inset inset-sm">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
              <span className="num" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{log.tanggal || '—'}</span>
              {log.sumber && <span className="chip chip-accent">{log.sumber}</span>}
              {log.user && <span className="text-caption2" style={{ marginLeft: 'auto' }}>oleh {log.user}</span>}
            </div>
            <div className="text-body">{log.catatan}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
