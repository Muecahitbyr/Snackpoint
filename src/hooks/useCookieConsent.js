import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'snackpoint_cookie_consent';
const EVENT_NAME = 'snackpoint-consent-changed';

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Shared consent state, kept in sync across every mounted instance (the
 * banner, the Maps embed gate, the footer's "Cookie-Einstellungen" link) via
 * a window event + localStorage — no context/provider needed for a single
 * flag. 'accepted' | 'rejected' | null (not yet decided). */
export function useCookieConsent() {
  const [consent, setConsent] = useState(readConsent);

  useEffect(() => {
    function handleChange() {
      setConsent(readConsent());
    }
    window.addEventListener(EVENT_NAME, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const write = useCallback((value) => {
    try {
      if (value === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // private browsing / storage disabled — state still updates for this session
    }
    setConsent(value);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const accept = useCallback(() => write('accepted'), [write]);
  const reject = useCallback(() => write('rejected'), [write]);
  const reset = useCallback(() => write(null), [write]);

  return { consent, accept, reject, reset };
}
