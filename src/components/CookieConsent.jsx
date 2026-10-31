import { useCookieConsent } from '../hooks/useCookieConsent';
import { IS_PRERENDER } from '../site/env';
import './CookieConsent.css';

export default function CookieConsent() {
  const { consent, accept, reject } = useCookieConsent();

  // Without JavaScript the buttons can't work (and the map stays off anyway).
  if (consent || IS_PRERENDER) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie-Einstellungen" aria-live="polite">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          Diese Website bindet eine Google-Maps-Karte sowie unsere TikTok- und Instagram-Profile ein. Dabei
          werden Daten (u. a. deine IP-Adresse) an Google, TikTok bzw. Meta übertragen. Wir laden sie erst, wenn
          du zustimmst. Mehr dazu in unserer{' '}
          <a href="/datenschutz">Datenschutzerklärung</a>.
        </p>
        <div className="cookie-banner-actions">
          <button type="button" className="btn btn-ghost cookie-btn" onClick={reject}>
            Nur notwendige
          </button>
          <button type="button" className="btn btn-primary cookie-btn" onClick={accept}>
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
