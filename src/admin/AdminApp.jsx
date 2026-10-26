import { useCallback, useEffect, useState } from 'react';
import { api, setCsrfToken, setUnauthorizedHandler } from './api';
import { Button, ConfirmProvider, Spinner, TextField, ToastProvider, useToast } from './ui';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Categories from './pages/Categories';
import Events from './pages/Events';
import EventForm from './pages/EventForm';
import BannersPromotions from './pages/BannersPromotions';
import Content from './pages/Content';
import MediaLibrary from './pages/MediaLibrary';
import Hours from './pages/Hours';
import Settings from './pages/Settings';
import Password from './pages/Password';
import Users from './pages/Users';
import { Icon } from './icons';

// `developer`: only for accounts with the developer role (also enforced by the API).
const NAV = [
  { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: 'produkte', label: 'Produkte', icon: 'package' },
  { path: 'kategorien', label: 'Kategorien', icon: 'folder' },
  { path: 'events', label: 'Events', icon: 'calendar' },
  { path: 'banner', label: 'Banner & Aktionen', icon: 'megaphone' },
  { path: 'medien', label: 'Medienbibliothek', icon: 'image' },
  { path: 'oeffnungszeiten', label: 'Öffnungszeiten', icon: 'clock' },
  { path: 'inhalte', label: 'Webseiteninhalte', icon: 'text', developer: true },
  { path: 'einstellungen', label: 'Einstellungen', icon: 'settings', developer: true },
  { path: 'benutzer', label: 'Benutzer', icon: 'users', developer: true },
  { path: 'passwort', label: 'Passwort ändern', icon: 'key', developer: true },
];

// Routes live in the hash (#/produkte/123), so /admin needs no server routing.
function readRoute() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { page: parts[0] ?? 'dashboard', id: parts[1] ?? null };
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

function Page({ route, isDeveloper }) {
  if (!isDeveloper && NAV.find((item) => item.path === route.page)?.developer) return <Dashboard />;
  switch (route.page) {
    case 'dashboard': return <Dashboard />;
    case 'produkte': return route.id ? <ProductForm id={route.id === 'neu' ? null : route.id} /> : <Products />;
    case 'kategorien': return <Categories />;
    case 'events': return route.id ? <EventForm id={route.id === 'neu' ? null : route.id} /> : <Events />;
    case 'banner': return <BannersPromotions />;
    case 'inhalte': return <Content />;
    case 'medien': return <MediaLibrary />;
    case 'oeffnungszeiten': return <Hours />;
    case 'einstellungen': return <Settings />;
    case 'passwort': return <Password />;
    case 'benutzer': return <Users />;
    default: return <Dashboard />;
  }
}

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      setCsrfToken(data.csrfToken);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <img src="/logo.jpg" alt="" className="login-logo" />
        <h1>SnackPoint Verwaltung</h1>
        <p className="login-sub">Bitte melde dich an.</p>
        {error && <p className="login-error" role="alert">{error}</p>}
        <TextField label="E-Mail" type="email" autoComplete="username" value={email} onChange={setEmail} required autoFocus />
        <TextField label="Passwort" type="password" autoComplete="current-password" value={password} onChange={setPassword} required />
        <Button type="submit" busy={busy} className="login-submit">Anmelden</Button>
        <a href="/" className="login-back"><Icon name="arrowLeft" size={15} /> Zur Webseite</a>
      </form>
    </div>
  );
}

function Shell({ user, onLogout }) {
  const route = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDeveloper = user.role === 'developer';
  const nav = NAV.filter((item) => isDeveloper || !item.developer);
  const current = nav.find((item) => item.path === route.page) ?? nav[0];

  useEffect(() => {
    setMenuOpen(false);
  }, [route.page, route.id]);

  return (
    <div className={`shell ${menuOpen ? 'menu-open' : ''}`}>
      <aside className="sidebar">
        <a href="#/dashboard" className="sidebar-brand">
          <img src="/logo.jpg" alt="" />
          <span>SnackPoint<small>Verwaltung</small></span>
        </a>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <a key={item.path} href={`#/${item.path}`} className={item.path === current.path ? 'is-active' : ''} aria-current={item.path === current.path ? 'page' : undefined}>
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <a href="/" target="_blank" rel="noopener noreferrer" className="sidebar-link"><Icon name="external" size={15} /> Webseite ansehen</a>
          <span className="sidebar-user" title={user.email}>{user.displayName || user.email}</span>
          <button type="button" className="sidebar-logout" onClick={onLogout}><Icon name="logout" size={16} /> Abmelden</button>
        </div>
      </aside>
      <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <div className="main">
        <header className="topbar">
          <button type="button" className="topbar-burger" onClick={() => setMenuOpen((open) => !open)} aria-label="Menü" aria-expanded={menuOpen}>
            <span /><span /><span />
          </button>
          <strong className="topbar-title"><Icon name={current.icon} /> {current.label}</strong>
        </header>
        <main className="content">
          <Page route={route} isDeveloper={isDeveloper} />
        </main>
      </div>
    </div>
  );
}

function AdminRoot() {
  const [user, setUser] = useState(undefined);
  const toast = useToast();

  useEffect(() => {
    api('/auth/me')
      .then((data) => {
        setCsrfToken(data.csrfToken);
        setUser(data.user ?? null);
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser((current) => {
        if (current) toast.error('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
        return null;
      });
    });
  }, [toast]);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // logged out locally either way
    }
    setCsrfToken('');
    setUser(null);
    window.location.hash = '';
  }, []);

  if (user === undefined) return <div className="login"><Spinner /></div>;
  if (!user) return <Login onLoggedIn={setUser} />;
  return <Shell user={user} onLogout={logout} />;
}

export default function AdminApp() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminRoot />
      </ConfirmProvider>
    </ToastProvider>
  );
}
