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
      <div style={{ padding: 16, borderBottom: '1px solid var(--line-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'start' }}>
          <span className="chip chip-accent">{infra.type}</span>
          <button
            onClick={onClose} aria-label="Tutup panel detail" autoFocus
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, lineHeight: 0 }}
          >
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ fontWeight: 600, fontSize: 15.5, marginBottom: 2 }}>{infra.nama}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {infra.kabkot}{infra.provinsi ? ` · ${infra.provinsi}` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span className="dot" style={{ background: status.color }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: status.color }}>{status.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line-2)' }} role="tablist">
        {[['detail', 'Detail'], ['catatan', `Catatan (${related.length})`]].map(([v, l]) => (
          <button
            key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            style={{
              padding: '10px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              background: 'transparent', border: 'none', fontFamily: 'inherit',
              color: tab === v ? 'var(--ink)' : 'var(--ink-3)',
              borderBottom: `2px solid ${tab === v ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {l}
          </button>
        ))}
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
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, borderBottom: '1px dashed var(--line-2)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>{l}</span>
                <span className={mono ? 'mono' : 'num'} style={{ fontWeight: 600, fontSize: 12, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          {util != null && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>
                <span>Utilisasi kapasitas</span>
                <span className="num" style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtPct(util, 1)}</span>
              </div>
              <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }} role="img" aria-label={`Utilisasi ${fmtPct(util, 1)}`}>
                <div style={{
                  width: `${Math.min(util, 100)}%`, height: '100%', borderRadius: 4,
                  background: util < 30 ? 'var(--warn)' : 'var(--accent)',
                }} />
              </div>
              {util < 30 && (
                <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 4 }}>
                  Utilisasi rendah — kapasitas idle besar.
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 12 }}>
            Sumber: sheet {infra.type} (Google Sheets) · dimuat langsung dari data terkini.
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => setTab('addlog')}>
              <Icon name="plus" size={14} />
              Tambah Catatan
            </button>
          </div>
        </div>
      )}

      {tab === 'catatan' && (
        <div style={{ padding: 16 }}>
          <LogCatatanList logs={related} emptyText="Belum ada catatan untuk infrastruktur ini." />
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => setTab('addlog')}>
              <Icon name="plus" size={14} />
              Tambah Catatan Baru
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
