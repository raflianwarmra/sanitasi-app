import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../lib/theme';
import { usePresence, useFocusTrap } from '../hooks/useOverlay';
import Icon from './Icon';

const NAV_ITEMS = [
  { label: 'Beranda', path: '/' },
  { label: 'Provinsi', path: '/provinsi' },
  { label: 'Kabupaten/Kota', path: '/kabkota' },
  { label: 'Infrastruktur', path: '/infrastruktur' },
];

// Translucent chrome: content scrolls underneath; the hairline + soft edge
// shadow appear only once content actually sits under the bar.
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}

export default function TopNav({ active, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const scrolled = useScrolled();
  const sheet = usePresence(menuOpen);
  const sheetRef = useRef(null);
  useFocusTrap(sheetRef, menuOpen, () => setMenuOpen(false));

  return (
    <>
      <nav aria-label="Navigasi utama" className="topnav" data-scrolled={scrolled}>
        <div className="page-wrap page-pad" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10, paddingBottom: 10, gap: 12,
        }}>
          <button
            type="button"
            className="press"
            onClick={() => onNavigate('/')}
            aria-label="Dashboard Data Sanitasi, ke Beranda"
            style={{
              background: 'transparent', border: 'none', padding: '4px 6px 4px 0', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, borderRadius: 10,
              font: 'inherit', fontWeight: 650, fontSize: '0.9375rem', letterSpacing: '-0.012em', color: 'var(--ink)',
              transition: 'transform var(--dur-press) var(--ease-out)',
            }}
          >
            <span className="app-mark" aria-hidden="true"><Icon name="droplet" size={15} strokeWidth={2} /></span>
            <span>Data Sanitasi</span>
          </button>

          <div className="nav-links" style={{ display: 'flex', gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                type="button"
                className="nav-item"
                onClick={() => onNavigate(item.path)}
                aria-current={active === item.path ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              type="button"
              className="icon-btn"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
            </button>
            <button
              type="button"
              className="icon-btn mobile-menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              style={{ display: 'none', color: 'var(--ink)' }}
            >
              <Icon name="menu" size={19} />
            </button>
          </div>
        </div>
      </nav>

      {sheet.mounted && (
        <>
          <div className="scrim" data-state={sheet.state} onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div
            ref={sheetRef}
            className="sheet-right"
            data-state={sheet.state}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
          >
            <div style={{
              padding: '14px 12px 12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span className="text-headline">Menu</span>
              <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Tutup menu">
                <Icon name="x" size={19} />
              </button>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: '0 12px', display: 'grid', gap: 2 }}>
              {NAV_ITEMS.map((item) => {
                const isActive = active === item.path;
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      className="list-row"
                      onClick={() => { onNavigate(item.path); setMenuOpen(false); }}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        minHeight: 48, padding: '12px 12px', fontSize: '0.9375rem',
                        fontWeight: isActive ? 600 : 500,
                        background: isActive ? 'var(--accent-soft)' : undefined,
                        color: isActive ? 'var(--accent-strong)' : 'var(--ink)',
                      }}
                    >
                      {item.label}
                      <Icon name="chevronRight" size={15} style={{ color: 'var(--ink-3)' }} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
