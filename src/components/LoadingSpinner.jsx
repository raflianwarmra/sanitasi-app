export default function LoadingSpinner({ text = 'Memuat data...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, flexDirection: 'column', gap: 12 }}>
      <div style={{
        width: 28, height: 28, border: '2px solid var(--line)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>{text}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function ErrorCard({ message, onRetry }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div className="chip chip-bad">Gagal memuat data</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{message}</div>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry} style={{ fontSize: 12 }}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
