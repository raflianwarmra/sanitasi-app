import { useState } from 'react';
import { useTheme } from '../lib/theme';
import Icon from './Icon';

const NAV_ITEMS = [
  { label: 'Beranda', path: '/' },
  { label: 'Provinsi', path: '/provinsi' },
  { label: 'Kabupaten/Kota', path: '/kabkota' },
  { label: 'Infrastruktur', path: '/infrastruktur' },
];

export default function TopNav({ active, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <>
      <nav aria-label="Navigasi utama" style={{
        borderBottom: '1px solid var(--line)',
        background: 'var(--paper)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div className="page-wrap page-pad" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 12, paddingBottom: 12, gap: 12,
        }}>
          {/* Logo */}
          <button
            onClick={() => onNavigate('/')}
            aria-label="Dashboard Data Sanitasi — Beranda"
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 9,
              fontWeight: 700, fontSize: 15, color: 'var(--ink)', fontFamily: 'inherit',
            }}
          >
            <span style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--accent)', color: 'var(--accent-contrast)',
              display: 'grid', placeItems: 'center',
            }}>
              <Icon name="droplet" size={15} strokeWidth={2} />
            </span>
            <span>Dashboard <span style={{ color: 'var(--accent)' }}>Data Sanitasi</span></span>
          </button>

          {/* Desktop nav */}
          <div className="nav-links" style={{ display: 'flex', gap: 2 }}>
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: isActive ? 600 : 500, fontFamily: 'inherit',
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                    transition: 'background 0.15s ease-out, color 0.15s ease-out',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--paper-2)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="chip hide-mobile">Data 2025</span>
            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
              style={{
                width: 36, height: 36, border: '1px solid var(--line)', borderRadius: 7,
                background: 'var(--paper)', color: 'var(--ink-2)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            </button>

            {/* Hamburger (mobile) */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={menuOpen}
              style={{
                display: 'none',
                width: 36, height: 36, border: '1px solid var(--line)', borderRadius: 7,
                background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer',
                alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <Icon name={menuOpen ? 'x' : 'menu'} size={17} />
            </button>
          </div>
        </div>
        <div aria-hidden="true" style={{ height: 4, background: 'var(--island-accent, transparent)', transition: 'background 0.25s ease-out' }} />
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'oklch(15% 0.02 240 / 0.45)' }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            role="menu"
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 280, maxWidth: '85vw',
              background: 'var(--paper)', padding: '20px 0',
              borderLeft: '1px solid var(--line)', boxShadow: 'var(--shadow-pop)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '0 20px 16px', borderBottom: '1px solid var(--line-2)', marginBottom: 6,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                Dashboard <span style={{ color: 'var(--accent)' }}>Data Sanitasi</span>
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Tutup menu"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 6 }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.path;
              return (
                <button
                  key={item.path}
                  role="menuitem"
                  onClick={() => { onNavigate(item.path); setMenuOpen(false); }}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', textAlign: 'left',
                    padding: '14px 20px', minHeight: 48, border: 'none', cursor: 'pointer',
                    background: isActive ? 'var(--accent-soft)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--ink-2)',
                    fontSize: 14, fontWeight: isActive ? 600 : 500, fontFamily: 'inherit',
                  }}
                >
                  {item.label}
                  <Icon name="chevronRight" size={15} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
