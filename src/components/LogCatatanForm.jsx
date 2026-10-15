import { useId, useState } from 'react';
import { appendLog } from '../lib/sheets';
import { useTeam } from '../hooks/useSheetData';
import Icon from './Icon';
import { toast } from '../lib/toast';

export default function LogCatatanForm({ infra, onClose, onSuccess }) {
  const fid = useId();
  const { data: team, loading: teamLoading } = useTeam();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(todayIso);
  const [sumber, setSumber] = useState('');
  const [catatan, setCatatan] = useState('');
  const [user, setUser] = useState('');
  const [userCustom, setUserCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const resolvedUser = user === '__custom__' ? userCustom.trim() : user;
  const hasTeam = team.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sumber || !catatan.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await appendLog({
        date: tanggal,
        provinsi: infra.provinsi,
        kabkot: infra.kabkot,
        infrastruktur: infra.nama,
        type: infra.type,
        user: resolvedUser,
        sumber,
        catatan: catatan.trim(),
      });
      onSuccess?.();
      toast('Catatan tersimpan', { detail: import.meta.env.VITE_SCRIPT_URL ? 'Dikirim ke Google Sheet.' : 'Hanya untuk sesi ini (VITE_SCRIPT_URL belum di-set).' });
      onClose();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="text-headline" style={{ margin: 0 }}>Tambah catatan</h3>
          <div className="text-caption" style={{ marginTop: 2 }}>
            {infra.nama} · {infra.kabkot} · {infra.type}
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup form catatan" style={{ margin: '-6px -8px 0 0' }}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="field-label" htmlFor={`${fid}-tgl`}>Tanggal</label>
          <input id={`${fid}-tgl`} className="input" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>

        <div>
          <label className="field-label" htmlFor={`${fid}-sumber`}>Sumber informasi <span aria-hidden="true" style={{ color: 'var(--bad)' }}>*</span></label>
          <select id={`${fid}-sumber`} required className="input" value={sumber} onChange={(e) => setSumber(e.target.value)}>
            <option value="">— Pilih sumber —</option>
            <option value="Laporan">Laporan</option>
            <option value="Monev">Monev</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor={`${fid}-user`}>Petugas</label>
          {teamLoading ? (
            <div className="text-caption">Memuat daftar Team Member…</div>
          ) : hasTeam ? (
            <>
              <select id={`${fid}-user`} className="input" value={user} onChange={(e) => setUser(e.target.value)}>
                <option value="">— Pilih dari Team Member —</option>
                {team.map((m) => (
                  <option key={m.id} value={m.nama}>
                    {m.nama}{m.role ? ` · ${m.role}` : ''}
                  </option>
                ))}
                <option value="__custom__">Lainnya (isi manual)</option>
              </select>
              {user === '__custom__' && (
                <input
                  className="input"
                  aria-label="Nama petugas"
                  style={{ marginTop: 6 }}
                  placeholder="Nama petugas"
                  value={userCustom}
                  onChange={(e) => setUserCustom(e.target.value)}
                />
              )}
            </>
          ) : (
            <input
              id={`${fid}-user`}
              className="input"
              placeholder="Nama petugas"
              value={userCustom}
              onChange={(e) => { setUserCustom(e.target.value); setUser('__custom__'); }}
            />
          )}
        </div>

        <div>
          <label className="field-label" htmlFor={`${fid}-catatan`}>Catatan <span aria-hidden="true" style={{ color: 'var(--bad)' }}>*</span></label>
          <textarea
            id={`${fid}-catatan`}
            required
            className="input"
            rows={4}
            placeholder="Tuliskan catatan lapangan, temuan, atau tindakan..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="inset inset-sm text-caption">
          Disimpan ke Google Sheet, tab "Log Catatan Infras".
          {!import.meta.env.VITE_SCRIPT_URL && (
            <div style={{ color: 'var(--warn)', marginTop: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <Icon name="alert" size={13} style={{ marginTop: 2 }} />
              VITE_SCRIPT_URL belum di-set: catatan hanya tersimpan di sesi ini.
            </div>
          )}
        </div>

        {saveError && (
          <div role="alert" className="text-caption" style={{ color: 'var(--bad)' }}>
            Gagal menyimpan: {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button
            type="submit" className="btn btn-accent"
            disabled={!sumber || !catatan.trim() || saving}
            aria-busy={saving}
          >
            {saving ? 'Menyimpan…' : 'Simpan catatan'}
          </button>
        </div>
      </div>
    </form>
  );
}
