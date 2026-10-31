import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'snackpoint_cookie_consent';
// One consent per embedded profile, separate from the earlier Maps-only one.
// (The TikTok key keeps its first name, so consents already given stay valid.)
const EMBED_KEYS = { tiktok: 'snackpoint_social_consent', instagram: 'snackpoint_instagram_consent' };
const readEmbeds = () =>
  Object.fromEntries(Object.entries(EMBED_KEYS).map(([name, key]) => [name, read(key) === 'accepted']));
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
 * flag. 'accepted' | 'rejected' | null (not yet decided). `embeds` holds the
 * consent per embedded profile ({ tiktok, instagram }): given all at once with
 * the banner's "Akzeptieren", or one by one with the button in each phone. */
export function useCookieConsent() {
  const [consent, setConsent] = useState(readConsent);
  const [embeds, setEmbeds] = useState(() => readEmbeds());

  useEffect(() => {
    function handleChange() {
      setConsent(readConsent());
      setEmbeds(readEmbeds());
    }
    window.addEventListener(EVENT_NAME, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  // value: Maps/banner decision; embedValue goes to the listed embeds.
  const write = useCallback((value, embedValue, names = Object.keys(EMBED_KEYS)) => {
    if (value !== undefined) store(STORAGE_KEY, value);
    if (embedValue !== undefined) names.forEach((name) => store(EMBED_KEYS[name], embedValue));
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  // Banner: everything at once. Single buttons: only what they load.
  const accept = useCallback(() => write('accepted', 'accepted'), [write]);
  const acceptMaps = useCallback(() => write('accepted'), [write]);
  const acceptEmbed = useCallback((name) => write(undefined, 'accepted', [name]), [write]);
  const reject = useCallback(() => write('rejected', null), [write]);
  const reset = useCallback(() => write(null, null), [write]);

  return { consent, embeds, accept, acceptMaps, acceptEmbed, reject, reset };
}
