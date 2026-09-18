import { ADDRESS, MAPS_URL, MAPS_EMBED_URL } from '../data/constants';
import Reveal from './Reveal';
import './Location.css';

export default function Location() {
  return (
    <section className="location" id="location">
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
          <div className="info-row">
            <span className="info-icon">🕗</span>
            <div>
              <strong>Öffnungszeiten</strong>
              <p>Geschlossen · Öffnet Fr um 08:00</p>
            </div>
          </div>
          <div className="info-row">
            <span className="info-icon">⭐</span>
            <div>
              <strong>Bewertung</strong>
              <p>5.0 von 5 · 4.945 Rezensionen auf Google</p>
            </div>
          </div>
          <a className="btn btn-primary" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
            In Google Maps öffnen
          </a>
        </Reveal>
        <Reveal className="location-map" delay={0.1}>
          <iframe
            title="Standort Snack Point Kaufbeuren"
            src={MAPS_EMBED_URL}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </Reveal>
      </div>
    </section>
  );
}
