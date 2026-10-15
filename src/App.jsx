import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import TopNav from './components/TopNav';
import Landing from './pages/Landing';
import AccessGate from './components/AccessGate';
import LoadingSpinner from './components/LoadingSpinner';

// Data pages load on demand: the home page ships without Chart.js/maps.
const Provinsi = lazy(() => import('./pages/Provinsi'));
const Infrastruktur = lazy(() => import('./pages/Infrastruktur'));
const KabKota = lazy(() => import('./pages/KabKota'));

function currentPath() {
  return window.location.hash.replace(/^#/, '') || '/';
}

function pathToPage(path) {
  if (path.startsWith('/infrastruktur')) return 'infra';
  if (path.startsWith('/provinsi')) return 'provinsi';
  if (path.startsWith('/kabkota')) return 'kabkota';
  return 'landing';
}

function parseSearch(path) {
  const parts = path.split('?');
  if (parts.length < 2) return {};
  return Object.fromEntries(new URLSearchParams(parts[1]));
}

export default function App() {
  const [path, setPath] = useState(currentPath());

  useEffect(() => {
    const onHashChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const page = pathToPage(path);
  const search = parseSearch(path);

  const navigate = useCallback((to) => {
    if (currentPath() === to) {
      // Same path — force re-render anyway
      setPath(to);
    } else {
      window.location.hash = to;
    }
    window.scrollTo(0, 0);
  }, []);

  const navActive = '/' + (page === 'landing' ? '' : page === 'infra' ? 'infrastruktur' : page);

  return (
    <AccessGate>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Hash routing owns location.hash, so move focus without touching it. */}
        <a
          href="#main"
          className="skip-link"
          onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}
        >
          Lewati ke konten
        </a>
        <TopNav active={navActive} onNavigate={navigate} />

        <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <Suspense fallback={<LoadingSpinner text="Memuat halaman…" />}>
        {page === 'landing'    && <Landing onNavigate={navigate} />}
        {page === 'provinsi'   && <Provinsi onNavigate={navigate} />}
        {page === 'infra'      && <Infrastruktur onNavigate={navigate} />}
        {page === 'kabkota'    && (
          <KabKota
            onNavigate={navigate}
            initialProvinsi={search.provinsi ? decodeURIComponent(search.provinsi) : ''}
            initialKode={search.kode ? decodeURIComponent(search.kode) : ''}
          />
        )}
        </Suspense>
        </main>
      </div>
    </AccessGate>
  );
}
