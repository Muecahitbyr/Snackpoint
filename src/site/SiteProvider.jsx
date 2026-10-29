import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CONTENT, REVIEWS, SERVICES, SETTINGS } from '../data/siteContent';
import { applySiteData } from '../data/siteStore';
import './SiteProvider.css';

const SiteContext = createContext(null);

// The API delivers what the admin panel manages (products, events, banners,
// promotions, opening hours); texts, contact details, services and reviews
// come from src/data/siteContent.js. Pages rendered by the Cloudflare Worker
// carry the current payload in <script id="site-data"> (worker/index.js), so
// no request is needed; otherwise the build-time HTML preloads the URL
// (<link rel="preload">) and the request is usually done when React starts.
/** The API payload plus everything that lives in code. */
export function withCodeContent(data) {
  return { ...data, content: CONTENT, settings: SETTINGS, services: SERVICES, reviews: REVIEWS };
}

function inlineSite() {
  try {
    const element = document.getElementById('site-data');
    return element ? withCodeContent(JSON.parse(element.textContent)) : null;
  } catch {
    return null;
  }
}

// A hanging API would otherwise keep the loading screen up indefinitely;
// after this the error screen offers "Erneut versuchen".
const FETCH_TIMEOUT_MS = 10000;

async function fetchSite() {
  const signal = typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined;
  const response = await fetch('/api/public/site', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return withCodeContent(await response.json());
}

/** Loads the website's content from the API, then renders the page. */
export function SiteProvider({ children }) {
  const [state, setState] = useState(() => {
    const data = inlineSite();
    if (!data) return { status: 'loading', data: null };
    applySiteData(data);
    return { status: 'ready', data };
  });
  const hasData = useRef(state.status === 'ready');

  const load = useCallback(() => {
    setState({ status: 'loading', data: null });
    fetchSite()
      .then((data) => {
        applySiteData(data);
        setState({ status: 'ready', data });
      })
      .catch(() => setState({ status: 'error', data: null }));
  }, []);

  useEffect(() => {
    if (!hasData.current) load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <div className="site-state site-state-loading" role="status">
        <img src="/logo.jpg" alt="" className="site-state-logo" />
        <span className="sr-only">Seite wird geladen…</span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="site-state" role="alert">
        <img src="/logo.jpg" alt="SnackPoint" className="site-state-logo is-static" />
        <h1 className="site-state-title">Kurze Pause.</h1>
        <p>Die Seite konnte gerade nicht geladen werden. Bitte versuch es in einem Moment noch einmal.</p>
        <button type="button" className="btn btn-primary" onClick={load}>Erneut versuchen</button>
      </div>
    );
  }

  return <SiteContext.Provider value={state.data}>{children}</SiteContext.Provider>;
}

/** Build-time prerendering (scripts/prerender.mjs): the data is already there. */
export function StaticSiteProvider({ data, children }) {
  return <SiteContext.Provider value={data}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}

/** Editable texts and images: content['hero.title'] etc. */
export function useContent() {
  return useContext(SiteContext).content;
}
