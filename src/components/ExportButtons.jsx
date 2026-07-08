import { useState } from 'react';
import Icon from './Icon';

// Export action group: CSV (instant) + PPTX (async, shows progress state).

export default function ExportButtons({ onCsv, onPptx, csvLabel = 'Unduh CSV', pptxLabel = 'Buat PPTX', size = 'sm' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const cls = size === 'sm' ? 'btn-sm' : '';

  const handlePptx = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onPptx();
    } catch (e) {
      setError(e?.message || 'Gagal membuat PPTX');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {onCsv && (
        <button type="button" className={`btn btn-ghost ${cls}`} onClick={onCsv}>
          <Icon name="download" size={14} />
          {csvLabel}
        </button>
      )}
      {onPptx && (
        <button type="button" className={`btn btn-secondary ${cls}`} onClick={handlePptx} disabled={busy} aria-busy={busy}>
          <Icon name="presentation" size={14} />
          {busy ? 'Menyusun…' : pptxLabel}
        </button>
      )}
      {error && <span role="alert" style={{ fontSize: 11.5, color: 'var(--bad)' }}>{error}</span>}
    </div>
  );
}
