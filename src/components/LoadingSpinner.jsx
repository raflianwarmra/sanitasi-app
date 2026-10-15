import Icon from './Icon';

export default function LoadingSpinner({ text = 'Memuat data…' }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 56, flexDirection: 'column', gap: 12 }}>
      <div className="spinner" aria-hidden="true" />
      <div className="text-caption">{text}</div>
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
      <div className="text-headline">Gagal memuat data</div>
      <div className="text-caption" style={{ maxWidth: 420 }}>
        {message || 'Periksa koneksi internet, lalu coba lagi.'}
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry} style={{ marginTop: 4 }}>
          <Icon name="refresh" size={13} />
          Coba lagi
        </button>
      )}
    </div>
  );
}
