import { ADDRESS, MAPS_URL, MAPS_EMBED_URL } from '../data/constants';
import { OPENING_HOURS, getTodayHours } from '../data/hours';
import { useCookieConsent } from '../hooks/useCookieConsent';
import Reveal from './Reveal';
import './Location.css';

function OpeningHoursTable() {
  const today = getTodayHours();

  return (
    <div className="hours-table" data-character-target="hours">
      {OPENING_HOURS.map((entry) => {
        const isToday = today !== null && entry.jsDay === today.jsDay;
        return (
          <div key={entry.day} className={`hours-row ${isToday ? 'is-today' : ''}`}>
            <span className="hours-day">{entry.day}</span>
            <span className="hours-time">
              {entry.closed ? 'Geschlossen' : `${entry.open} – ${entry.close}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Location() {
  const { consent, accept } = useCookieConsent();

  return (
    <section className="location" id="location" data-character-target="location">
      <div className="location-inner">
        <Reveal className="location-info">
          <p className="eyebrow">Standort</p>
          <h2>Besuch uns.</h2>
          <div className="info-row">
            <span className="info-icon">📍</span>
            <div>
              <strong>Adresse</strong>
              <p>{ADDRESS}</p>
            </div>
          </div>

          <div className="info-row info-row-hours">
            <span className="info-icon">🕗</span>
            <div className="hours-block">
              <strong>Öffnungszeiten</strong>
              <OpeningHoursTable />
            </div>
          </div>

          <div className="info-row">
            <span className="info-icon">⭐</span>
            <div>
              <strong>Bewertung</strong>
              <p>5.0 von 5 · 4.945 Rezensionen auf Google</p>
            </div>
          </div>
          <a
            className="btn btn-primary"
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-character-target="route"
          >
            In Google Maps öffnen
          </a>
        </Reveal>
        <Reveal className="location-map" delay={0.1} data-character-target="map">
          {consent === 'accepted' ? (
            <iframe
              title="Standort SnackPoint Kaufbeuren"
              src={MAPS_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="map-placeholder">
              <span className="map-placeholder-icon">🗺️</span>
              <p>
                Beim Laden der Karte werden Daten an Google übertragen. Wir zeigen sie erst nach deiner
                Zustimmung.
              </p>
              <button type="button" className="btn btn-primary" onClick={accept}>
                Karte laden
              </button>
              <a className="map-placeholder-link" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
                Direkt in Google Maps öffnen
              </a>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
