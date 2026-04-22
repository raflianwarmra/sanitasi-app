import { useState, useCallback, useEffect } from 'react';
import TopNav from './components/TopNav';
import Landing from './pages/Landing';
import Provinsi from './pages/Provinsi';
import Infrastruktur from './pages/Infrastruktur';
import KabKota from './pages/KabKota';

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav active={navActive} onNavigate={navigate} />

      {page === 'landing'    && <Landing onNavigate={navigate} />}
      {page === 'provinsi'   && <Provinsi onNavigate={navigate} />}
      {page === 'infra'      && <Infrastruktur onNavigate={navigate} />}
      {page === 'kabkota'    && <KabKota onNavigate={navigate} initialProvinsi={search.provinsi ? decodeURIComponent(search.provinsi) : ''} />}
    </div>
  );
}
