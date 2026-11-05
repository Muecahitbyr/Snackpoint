import { useState } from 'react';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { IS_PRERENDER } from '../site/env';
import './CookieConsent.css';

// The three things that need consent. Nothing else on the page sets cookies
// or contacts other servers.
const OPTIONS = [
  { id: 'maps', label: 'Google Maps', text: 'Karte im Bereich „Standort“. Daten gehen an Google.' },
  { id: 'tiktok', label: 'TikTok', text: 'Unser echtes TikTok-Profil auf der Startseite. Daten gehen an TikTok.' },
  { id: 'instagram', label: 'Instagram', text: 'Unser echtes Instagram-Profil auf der Startseite. Daten gehen an Meta.' },
];

export default function CookieConsent() {
  const { consent, accept, reject, save } = useCookieConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choice, setChoice] = useState({ maps: false, tiktok: false, instagram: false });

  // Without JavaScript the buttons can't work (and the map stays off anyway).
  if (consent || IS_PRERENDER) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie-Einstellungen" aria-live="polite">
      <div className="cookie-banner-inner">
        <p className="cookie-banner-text">
          Auf dieser Seite gibt es eine Google-Maps-Karte und unsere TikTok- und Instagram-Profile. Sobald sie
          laden, gehen Daten wie deine IP-Adresse an Google, TikTok oder Meta. Deshalb laden wir sie erst, wenn
          du zustimmst. Mehr dazu in unserer{' '}
          <a href="/datenschutz">Datenschutzerklärung</a>.
        </p>

        {settingsOpen && (
          <fieldset className="cookie-settings">
            <legend className="sr-only">Einzeln auswählen</legend>
            {OPTIONS.map((option) => (
              <label key={option.id} className="cookie-option">
                <input
                  type="checkbox"
                  checked={choice[option.id]}
                  onChange={(e) => setChoice((current) => ({ ...current, [option.id]: e.target.checked }))}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.text}</small>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <div className="cookie-banner-actions">
          <button type="button" className="btn btn-primary cookie-btn" onClick={reject}>
            Alle ablehnen
          </button>
          <button type="button" className="btn btn-primary cookie-btn" onClick={accept}>
            Alle akzeptieren
          </button>
          {settingsOpen ? (
            <button type="button" className="btn btn-ghost cookie-btn" onClick={() => save(choice)}>
              Auswahl speichern
            </button>
          ) : (
            <button type="button" className="btn btn-ghost cookie-btn" onClick={() => setSettingsOpen(true)}>
              Einstellungen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
