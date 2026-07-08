import Icon from './Icon';

export default function LoadingSpinner({ text = 'Memuat data…' }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 56, flexDirection: 'column', gap: 12 }}>
      <div aria-hidden="true" style={{
        width: 26, height: 26, border: '2.5px solid var(--line)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{text}</div>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

// Skeleton row set for panel-level loading (keeps layout stable).
export function SkeletonPanel({ rows = 3, height = 84 }) {
  return (
    <div style={{ display: 'grid', gap: 12 }} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function ErrorCard({ message, onRetry }) {
  return (
    <div role="alert" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
      <Icon name="alert" size={24} style={{ color: 'var(--bad)' }} />
      <div style={{ fontSize: 14, fontWeight: 600 }}>Gagal memuat data</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', maxWidth: 420 }}>
        {message || 'Periksa koneksi internet, lalu coba lagi.'}
      </div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry} style={{ marginTop: 4 }}>
          <Icon name="refresh" size={13} />
          Coba lagi
        </button>
      )}
    </div>
  );
}
