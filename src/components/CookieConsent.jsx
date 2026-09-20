import { useCookieConsent } from '../hooks/useCookieConsent';
import './CookieConsent.css';

export default function CookieConsent() {
  const { consent, accept, reject } = useCookieConsent();

  if (consent) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie-Einstellungen" aria-live="polite">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          Diese Website bindet eine Google-Maps-Karte ein. Dabei werden Daten (u. a. deine IP-Adresse) an
          Google übertragen. Die Karte laden wir erst, wenn du zustimmst. Mehr dazu in unserer{' '}
          <a href="/datenschutz.html">Datenschutzerklärung</a>.
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
