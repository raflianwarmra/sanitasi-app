import { useState } from 'react';
import Icon from './Icon';
import { toast } from '../lib/toast';

// Export action group: CSV (instant) + PPTX (async, shows progress state).
// Both confirm completion (or name the failure) with a toast.

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
      toast('Presentasi PPTX siap', { detail: 'File tersimpan di folder unduhan.' });
    } catch (e) {
      setError(e?.message || 'Gagal membuat PPTX');
      toast('PPTX gagal dibuat', { tone: 'bad', detail: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="export-buttons">
      {onCsv && (
        <button
          type="button"
          className={`btn btn-ghost ${cls}`}
          onClick={() => {
            try {
              onCsv();
              toast('CSV diunduh', { detail: 'Pemisah titik koma, siap dibuka di Excel.' });
            } catch (e) {
              toast('CSV gagal diunduh', { tone: 'bad', detail: e?.message });
            }
          }}
        >
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
      {error && <span role="alert" style={{ fontSize: '0.75rem', color: 'var(--bad)' }}>{error}</span>}
    </div>
  );
}
