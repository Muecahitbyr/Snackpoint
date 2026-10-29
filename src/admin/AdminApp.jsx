import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setCsrfToken, setUnauthorizedHandler } from './api';
import { Button, ConfirmProvider, Spinner, TextField, ToastProvider, useToast } from './ui';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Categories from './pages/Categories';
import Events from './pages/Events';
import EventForm from './pages/EventForm';
import BannersPromotions from './pages/BannersPromotions';
import MediaLibrary from './pages/MediaLibrary';
import Hours from './pages/Hours';
import Protocol from './pages/Protocol';
import Password from './pages/Password';
import Users from './pages/Users';
import Wishes from './pages/Wishes';
import Homepage from './pages/Homepage';
import { Icon } from './icons';

// `developer`: only for accounts with the developer role (also enforced by the API).
const NAV = [
  { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: 'produkte', label: 'Produkte', icon: 'package' },
  { path: 'startseite', label: 'Startseite', icon: 'star' },
  { path: 'kategorien', label: 'Kategorien', icon: 'folder' },
  { path: 'events', label: 'Events', icon: 'calendar' },
  { path: 'banner', label: 'Banner & Aktionen', icon: 'megaphone' },
  { path: 'wuensche', label: 'Produktwünsche', icon: 'message' },
  { path: 'medien', label: 'Medienbibliothek', icon: 'image' },
  { path: 'oeffnungszeiten', label: 'Öffnungszeiten', icon: 'clock' },
  { path: 'protokoll', label: 'Protokoll', icon: 'activity', developer: true },
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
  if (!isDeveloper && NAV.find((item) => item.path === route.page)?.developer) return <Dashboard isDeveloper={isDeveloper} />;
  switch (route.page) {
    case 'dashboard': return <Dashboard isDeveloper={isDeveloper} />;
    case 'produkte': return route.id ? <ProductForm id={route.id === 'neu' ? null : route.id} /> : <Products />;
    case 'startseite': return <Homepage />;
    case 'kategorien': return <Categories />;
    case 'events': return route.id ? <EventForm id={route.id === 'neu' ? null : route.id} /> : <Events />;
    case 'banner': return <BannersPromotions />;
    case 'wuensche': return <Wishes />;
    case 'medien': return <MediaLibrary />;
    case 'oeffnungszeiten': return <Hours />;
    case 'protokoll': return <Protocol />;
    case 'passwort': return <Password />;
    case 'benutzer': return <Users />;
    default: return <Dashboard isDeveloper={isDeveloper} />;
  }
}

/** Cloudflare Turnstile bot check — only when the server has keys for it. */
function useTurnstile(containerRef) {
  const [siteKey, setSiteKey] = useState(null);
  const [token, setToken] = useState('');
  const widget = useRef(null);

  useEffect(() => {
    api('/auth/config').then((data) => setSiteKey(data.turnstileSiteKey)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!siteKey) return undefined;
    const render = () => {
      if (!containerRef.current || widget.current !== null) return;
      widget.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        language: 'de',
        callback: setToken,
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      });
    };
    if (window.turnstile) render();
    else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return undefined;
  }, [siteKey, containerRef]);

  const reset = useCallback(() => {
    if (widget.current !== null) window.turnstile?.reset(widget.current);
    setToken('');
  }, []);

  return { enabled: Boolean(siteKey), token, reset };
}

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const turnstileRef = useRef(null);
  const turnstile = useTurnstile(turnstileRef);

  async function submit(e) {
    e.preventDefault();
    if (turnstile.enabled && !turnstile.token) {
      setError('Bitte warte kurz, bis die Sicherheitsprüfung abgeschlossen ist.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password, turnstileToken: turnstile.token || undefined } });
      setCsrfToken(data.csrfToken);
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message);
      setPassword('');
      turnstile.reset();
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
        {turnstile.enabled && <div className="login-turnstile" ref={turnstileRef} />}
        <Button type="submit" busy={busy} className="login-submit">Anmelden</Button>
        <a href="/" className="login-back"><Icon name="arrowLeft" size={15} /> Zur Webseite</a>
      </form>
    </div>
  );
}

/** Shown while a developer looks at the panel as an owner account. */
function ImpersonationBar({ user }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function back() {
    setBusy(true);
    try {
      const result = await api('/auth/impersonation/end', { method: 'POST' });
      setCsrfToken(result.csrfToken);
      window.location.hash = '#/benutzer';
      window.location.reload();
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="hint-bar impersonation-bar" role="status">
      <span>
        <Icon name="users" size={16} /> Du bist als <strong>{user.displayName || user.email}</strong> (Inhaber) angemeldet.
        Änderungen werden unter deinem Namen protokolliert.
      </span>
      <Button size="small" busy={busy} onClick={back}>Zurück zu meinem Konto</Button>
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
          {user.impersonatedBy && <ImpersonationBar user={user} />}
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
