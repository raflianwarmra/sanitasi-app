// Facility detail panel — shared by the Infrastruktur page's side panel and
// the Kab/Kota page's record modal. Shows only fields present in the data;
// missing values render as em-dash, never fabricated.

import { useState } from 'react';
import { fmtNum, fmtPct } from '../lib/format';
import { utilizationPct as utilPct, statusOf, logsFor } from '../lib/infraSummary';
import LogCatatanForm from './LogCatatanForm';
import LogCatatanList from './LogCatatanList';
import Icon from './Icon';

export default function InfraDetailPanel({ infra, logs, onClose, reloadLogs }) {
  const [tab, setTab] = useState('detail');
  const related = logsFor(logs, infra);
  const status = statusOf(infra);
  const util = utilPct(infra);

  if (tab === 'addlog') {
    return (
      <LogCatatanForm
        infra={infra}
        onClose={() => setTab('catatan')}
        onSuccess={() => { reloadLogs?.(); }}
      />
    );
  }

  return (
    <div>
      <div style={{ padding: 16, paddingBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'start' }}>
          <span className="chip chip-accent">{infra.type}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup panel detail" data-autofocus style={{ margin: '-8px -8px 0 0' }}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <h3 className="text-headline" style={{ margin: '0 0 2px' }}>{infra.nama}</h3>
        <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>
          {infra.kabkot}{infra.provinsi ? ` · ${infra.provinsi}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span className="dot" style={{ background: status.color }} />
          <span style={{ fontSize: '0.78125rem', fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <div className="seg" role="group" aria-label="Pilih isi panel" style={{ display: 'flex' }}>
          {[['detail', 'Detail'], ['catatan', `Catatan (${related.length})`]].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={tab === v} onClick={() => setTab(v)} style={{ flex: 1 }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'detail' && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Kode Kab/Kota', infra.kode || '—', true],
              ['Tahun Bangun', infra.tahunBangun || '—'],
              ['Kapasitas Desain', infra.kapasitas != null ? `${fmtNum(infra.kapasitas)} m³/hari` : '—'],
              ['Kapasitas Terpakai', infra.kapasitasTerpakai != null ? `${fmtNum(infra.kapasitasTerpakai)} m³/hari` : '—'],
              ['Utilisasi', util != null ? fmtPct(util, 1) : '—'],
              [infra.type === 'IPAL' ? 'Sambungan Rumah (SR)' : 'KK Terlayani', infra.sr != null ? fmtNum(infra.sr) : '—'],
              ['Status Serah Terima', infra.statusSerah || '—'],
              ['Status Keberfungsian', infra.statusText || '—'],
            ].map(([l, v, mono]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.78125rem', borderBottom: '1px solid var(--line-2)', paddingBottom: 7 }}>
                <span style={{ color: 'var(--ink-3)' }}>{l}</span>
                <span className={mono ? 'mono' : 'num'} style={{ fontWeight: 600, fontSize: '0.75rem', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          {util != null && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ink-3)', marginBottom: 4 }}>
                <span>Utilisasi kapasitas</span>
                <span className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtPct(util, 1)}</span>
              </div>
              <div style={{ height: 6, background: 'var(--fill)', borderRadius: 999, overflow: 'hidden' }} role="img" aria-label={`Utilisasi ${fmtPct(util, 1)}`}>
                <div style={{
                  width: `${Math.min(util, 100)}%`, height: '100%', borderRadius: 4,
                  background: util < 30 ? 'var(--warn)' : 'var(--accent)',
                }} />
              </div>
              {util < 30 && (
                <div style={{ fontSize: '0.71875rem', color: 'var(--warn)', marginTop: 4 }}>
                  Utilisasi rendah — kapasitas idle besar.
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: '0.71875rem', color: 'var(--ink-3)', marginTop: 12 }}>
            Sumber: sheet {infra.type} (Google Sheets) · dimuat langsung dari data terkini.
          </div>

          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-accent" style={{ width: '100%' }} onClick={() => setTab('addlog')}>
              <Icon name="plus" size={14} />
              Tambah catatan
            </button>
          </div>
        </div>
      )}

      {tab === 'catatan' && (
        <div style={{ padding: 16 }}>
          <LogCatatanList logs={related} emptyText="Belum ada catatan untuk infrastruktur ini." />
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-accent" style={{ width: '100%' }} onClick={() => setTab('addlog')}>
              <Icon name="plus" size={14} />
              Tambah catatan baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
