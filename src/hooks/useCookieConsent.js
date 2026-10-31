import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'snackpoint_cookie_consent';
// Separate, so the earlier Maps-only consent doesn't cover the TikTok embed.
const SOCIAL_KEY = 'snackpoint_social_consent';
const EVENT_NAME = 'snackpoint-consent-changed';

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
const readConsent = () => read(STORAGE_KEY);

function store(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private browsing / storage disabled — state still updates for this session
  }
}

/** Shared consent state, kept in sync across every mounted instance (the
 * banner, the Maps embed gate, the footer's "Cookie-Einstellungen" link) via
 * a window event + localStorage — no context/provider needed for a single
 * flag. 'accepted' | 'rejected' | null (not yet decided). `social` is the
 * consent for the TikTok profile embed: given with the banner's "Akzeptieren"
 * or the button in the TikTok phone. */
export function useCookieConsent() {
  const [consent, setConsent] = useState(readConsent);
  const [social, setSocial] = useState(() => read(SOCIAL_KEY) === 'accepted');

  useEffect(() => {
    function handleChange() {
      setConsent(readConsent());
      setSocial(read(SOCIAL_KEY) === 'accepted');
    }
    window.addEventListener(EVENT_NAME, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const write = useCallback((value, socialValue) => {
    if (value !== undefined) store(STORAGE_KEY, value);
    if (socialValue !== undefined) store(SOCIAL_KEY, socialValue);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  // Banner: everything at once. Single buttons: only what they load.
  const accept = useCallback(() => write('accepted', 'accepted'), [write]);
  const acceptMaps = useCallback(() => write('accepted'), [write]);
  const acceptSocial = useCallback(() => write(undefined, 'accepted'), [write]);
  const reject = useCallback(() => write('rejected', null), [write]);
  const reset = useCallback(() => write(null, null), [write]);

  return { consent, social, accept, acceptMaps, acceptSocial, reject, reset };
}
