import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSite } from '../site/SiteProvider';
import './AnnouncementBar.css';

const DISMISS_KEY = 'snackpoint_banner_dismissed';
const ROTATE_MS = 6000;

// "Closed" applies until a banner is edited (its version changes).
function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Slim bar above the navigation for active banners from the admin panel
 * ("Heute Sonderaktion!"). Several banners take turns. */
export default function AnnouncementBar() {
  const banners = useSite().banners.filter((banner) => !banner.endsAt || new Date(banner.endsAt) > new Date());
  const signature = banners.map((banner) => `${banner.id}@${banner.version}`).join('|');
  const [dismissed, setDismissed] = useState(readDismissed);
  const [index, setIndex] = useState(0);
  const barRef = useRef(null);
  const visible = banners.length > 0 && dismissed !== signature;

  useEffect(() => {
    if (!visible || banners.length < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [visible, banners.length]);

  // The fixed navigation sits right below the bar (--announce-h in Header.css).
  useLayoutEffect(() => {
    const root = document.documentElement;
    const bar = barRef.current;
    if (!visible || !bar) {
      root.style.removeProperty('--announce-h');
      return undefined;
    }
    const update = () => root.style.setProperty('--announce-h', `${bar.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--announce-h');
    };
  }, [visible]);

  if (!visible) return null;
  const banner = banners[index % banners.length];

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      // storage unavailable — hide for this page view only
    }
    setDismissed(signature);
  }

  return (
    <div className={`announce announce-${banner.variant}`} ref={barRef} role="region" aria-label="Hinweis">
      <p className="announce-text" key={banner.id} aria-live="polite">
        {banner.text}
        {banner.linkUrl && (
          <a className="announce-link" href={banner.linkUrl} {...(/^https?:/i.test(banner.linkUrl) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {banner.linkLabel || 'Mehr erfahren'} →
          </a>
        )}
      </p>
      <button type="button" className="announce-close" onClick={dismiss} aria-label="Hinweis schließen">✕</button>
    </div>
  );
}
