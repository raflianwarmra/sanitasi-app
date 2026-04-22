import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Beranda', path: '/' },
  { label: 'Profil Provinsi', path: '/provinsi' },
  { label: 'Data Infrastruktur', path: '/infrastruktur' },
  { label: 'Profil Kab/Kota', path: '/kabkota' },
];

export default function TopNav({ active, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1.5px solid var(--line)',
        background: 'var(--paper)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        {/* Logo */}
        <button
          className="btn-ghost"
          onClick={() => onNavigate('/')}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 15 }}
        >
          <div style={{
            width: 26, height: 26, border: '1.5px solid var(--ink)', borderRadius: 6,
            display: 'grid', placeItems: 'center',
            fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600,
          }}>S</div>
          <span>Sanitasi<span style={{ color: 'var(--accent)' }}>.id</span></span>
        </button>

        {/* Desktop nav */}
        <div className="nav-links" style={{ display: 'flex', gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              style={{
                padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                background: active === item.path ? 'var(--ink)' : 'transparent',
                color: active === item.path ? 'var(--paper)' : 'var(--ink-2)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (active !== item.path) e.currentTarget.style.background = 'var(--line-2)'; }}
              onMouseLeave={(e) => { if (active !== item.path) e.currentTarget.style.background = 'transparent'; }}
            >
              {item.label}
              {item.path === '/kabkota' && (
                <span className="chip chip-accent" style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px' }}>BARU</span>
              )}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="chip hide-mobile">2025 · Q1</span>

          {/* Hamburger (mobile) */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'none',
              width: 36, height: 36, border: '1.5px solid var(--ink)', borderRadius: 6,
              background: 'transparent', cursor: 'pointer',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            {[0,1,2].map((i) => (
              <div key={i} style={{ width: 14, height: 1.5, background: 'var(--ink)' }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.3)',
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 260,
              background: 'var(--ink)', color: 'var(--paper)', padding: '24px 0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '0 20px 20px', borderBottom: '1px solid oklch(35% 0.01 250)', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Sanitasi<span style={{ color: 'var(--accent)' }}>.id</span>
              </div>
            </div>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => { onNavigate(item.path); setMenuOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '13px 20px', border: 'none', cursor: 'pointer',
                  background: active === item.path ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active === item.path ? 'var(--paper)' : 'oklch(80% 0.01 250)',
                  fontSize: 14, fontWeight: active === item.path ? 700 : 500, fontFamily: 'inherit',
                  borderBottom: '1px solid oklch(35% 0.01 250)',
                }}
              >
                {item.label}
                {item.path === '/kabkota' && <span className="chip chip-accent" style={{ marginLeft: 8, fontSize: 9 }}>BARU</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
