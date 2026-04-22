import { useState, useCallback } from 'react';
import TopNav from './components/TopNav';
import Landing from './pages/Landing';
import Provinsi from './pages/Provinsi';
import Infrastruktur from './pages/Infrastruktur';
import KabKota from './pages/KabKota';

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
  const [path, setPath] = useState(window.location.hash.replace('#', '') || '/');
  const page = pathToPage(path);
  const search = parseSearch(path);

  const navigate = useCallback((to) => {
    window.location.hash = to;
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  const navPath = '/' + page.replace('landing', '').replace('infra', 'infrastruktur');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopNav active={navPath} onNavigate={navigate} />

      {page === 'landing'    && <Landing onNavigate={navigate} />}
      {page === 'provinsi'   && <Provinsi onNavigate={navigate} />}
      {page === 'infra'      && <Infrastruktur onNavigate={navigate} />}
      {page === 'kabkota'    && <KabKota onNavigate={navigate} initialProvinsi={search.provinsi ? decodeURIComponent(search.provinsi) : ''} />}
    </div>
  );
}
