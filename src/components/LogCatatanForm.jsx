import { useState } from 'react';
import { appendLog } from '../lib/sheets';
import { useTeam } from '../hooks/useSheetData';

export default function LogCatatanForm({ infra, onClose, onSuccess }) {
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
        kode: infra.kode,
        infrastruktur: infra.nama,
        tanggal,
        sumber,
        catatan: catatan.trim(),
        user: resolvedUser,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.08em' }}>TAMBAH CATATAN</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{infra.nama}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'JetBrains Mono' }}>
            {infra.kabkot} · {infra.type}
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink-3)', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="field-label">Tanggal</label>
          <input className="input" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>

        <div>
          <label className="field-label">Sumber Informasi</label>
          <select className="input" value={sumber} onChange={(e) => setSumber(e.target.value)}>
            <option value="">— Pilih sumber —</option>
            <option value="Laporan">Laporan</option>
            <option value="Monev">Monev</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="field-label">Petugas / User</label>
          {teamLoading ? (
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>Memuat daftar Team Member…</div>
          ) : hasTeam ? (
            <>
              <select className="input" value={user} onChange={(e) => setUser(e.target.value)}>
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
                  style={{ marginTop: 6 }}
                  placeholder="Nama petugas"
                  value={userCustom}
                  onChange={(e) => setUserCustom(e.target.value)}
                />
              )}
            </>
          ) : (
            <input
              className="input"
              placeholder="Nama petugas"
              value={userCustom}
              onChange={(e) => { setUserCustom(e.target.value); setUser('__custom__'); }}
            />
          )}
        </div>

        <div>
          <label className="field-label">Catatan</label>
          <textarea
            className="input"
            rows={4}
            placeholder="Tuliskan catatan lapangan, temuan, atau tindakan..."
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--ink-3)', background: 'var(--line-2)', padding: '8px 10px', borderRadius: 4 }}>
          → Disimpan ke Google Sheet · "Log Catatan Infras"
          {!import.meta.env.VITE_SCRIPT_URL && (
            <div style={{ color: 'var(--warn)', marginTop: 4 }}>
              ⚠ VITE_SCRIPT_URL belum di-set — catatan hanya tersimpan di sesi ini.
            </div>
          )}
        </div>

        {saveError && (
          <div style={{ fontSize: 11, color: 'var(--bad)', fontFamily: 'JetBrains Mono' }}>
            Gagal menyimpan: {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button
            type="submit" className="btn btn-accent"
            disabled={!sumber || !catatan.trim() || saving}
            style={{ opacity: (!sumber || !catatan.trim() || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Catatan'}
          </button>
        </div>
      </div>
    </form>
  );
}
