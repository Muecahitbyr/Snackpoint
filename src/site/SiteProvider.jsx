import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CONTENT, REVIEWS, SERVICES, SETTINGS } from '../data/siteContent';
import { applySiteData } from '../data/siteStore';
import './SiteProvider.css';

const SiteContext = createContext(null);

// The HTML pages preload this URL (<link rel="preload">), so the request is
// usually done by the time React starts. The API delivers what the admin
// panel manages (products, events, banners, promotions, opening hours);
// texts, contact details, services and reviews come from src/data/siteContent.js.
async function fetchSite() {
  const response = await fetch('/api/public/site', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return { ...data, content: CONTENT, settings: SETTINGS, services: SERVICES, reviews: REVIEWS };
}

/** Loads the website's content from the API, then renders the page. */
export function SiteProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', data: null });

  const load = useCallback(() => {
    setState({ status: 'loading', data: null });
    fetchSite()
      .then((data) => {
        applySiteData(data);
        setState({ status: 'ready', data });
      })
      .catch(() => setState({ status: 'error', data: null }));
  }, []);

  useEffect(load, [load]);

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

export function useSite() {
  return useContext(SiteContext);
}

/** Editable texts and images: content['hero.title'] etc. */
export function useContent() {
  return useContext(SiteContext).content;
}
