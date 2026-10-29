import { ADDRESS, MAPS_URL, MAPS_EMBED_URL } from '../data/constants';
import { OPENING_HOURS, SPECIAL_HOURS, hoursOn, upcomingSpecialHours } from '../data/hours';
import { getOpenStatus } from './chatbot/openingHours';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { useNow } from '../hooks/useNow';
import { useMagnetic } from '../hooks/useMagnetic';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import { useContent, useSite } from '../site/SiteProvider';
import { IS_PRERENDER } from '../site/env';
import './Location.css';

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
// "08:00" → "08", "08:30" stays "08:30" — for the compact day tiles.
const shortTime = (time) => (time.endsWith(':00') ? time.slice(0, 2) : time);
// "2026-12-24" → "Do., 24.12."
const DAY_LABEL = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const dayLabel = (date) => DAY_LABEL.format(new Date(`${date}T00:00:00Z`));

/** Today on a 0–24 h bar: the open stretch highlighted, a marker at "now". */
function TodayTimeline({ open, close, now }) {
  const start = toMinutes(open);
  const end = toMinutes(close);
  if (end <= start) return null; // overnight hours don't fit a single-day bar
  const pct = (minutes) => `${(minutes / 1440) * 100}%`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="hours-timeline" aria-hidden="true">
      <div className="hours-timeline-track">
        <div className="hours-timeline-open" style={{ left: pct(start), width: pct(end - start) }} />
        <div className="hours-timeline-now" style={{ left: pct(nowMinutes) }}>
          <span>Jetzt</span>
        </div>
      </div>
      <div className="hours-timeline-labels">
        <span>0</span><span>6</span><span>12</span><span>18</span><span>24 Uhr</span>
      </div>
    </div>
  );
}

function OpeningHours() {
  const now = useNow();
  const status = getOpenStatus(now);
  const today = IS_PRERENDER ? null : OPENING_HOURS.find((entry) => entry.jsDay === now.getDay()) ?? null;
  // Today's actual hours (a holiday or short day overrides the weekly plan).
  const todayHours = IS_PRERENDER ? null : hoursOn(now);
  // The API only sends upcoming days; the browser drops the ones that have passed since.
  const specials = (IS_PRERENDER ? SPECIAL_HOURS : upcomingSpecialHours(now, 60)).slice(0, 5);
  const first = OPENING_HOURS[0];
  const sameEveryDay = OPENING_HOURS.length > 0 && OPENING_HOURS.every(
    (entry) => !entry.closed && entry.open === first.open && entry.close === first.close
  );

  let statusText;
  if (status.open) statusText = `Jetzt geöffnet · bis ${status.closesAt} Uhr`;
  else if (status.next) statusText = `Geschlossen · öffnet ${status.next.when} um ${status.next.time} Uhr`;
  else statusText = 'Geschlossen';

  return (
    <div className="hours" data-character-target="hours">
      {!IS_PRERENDER && (
        <p className={`hours-status ${status.open ? 'is-open' : 'is-closed'}`}>
          <span className="hours-status-dot" aria-hidden="true" />
          {statusText}
        </p>
      )}

      {sameEveryDay && (
        <p className="hours-summary">
          Täglich <span>{shortTime(first.open)} – {shortTime(first.close)} Uhr</span>
        </p>
      )}

      <ul className="hours-days">
        {OPENING_HOURS.map((entry, i) => (
          <li
            key={entry.day}
            className={`hours-day ${today?.jsDay === entry.jsDay ? 'is-today' : ''}`}
            style={{ '--i': i }}
          >
            <span className="hours-day-name" aria-hidden="true">{entry.day.slice(0, 2)}</span>
            <span className="hours-day-time" aria-hidden="true">
              {entry.closed ? 'zu' : `${shortTime(entry.open)}–${shortTime(entry.close)}`}
            </span>
            <span className="sr-only">
              {entry.day}: {entry.closed ? 'geschlossen' : `${entry.open} bis ${entry.close} Uhr`}
            </span>
          </li>
        ))}
      </ul>

      {specials.length > 0 && (
        <ul className="hours-special" aria-label="Abweichende Öffnungszeiten">
          {specials.map((entry) => (
            <li key={entry.date}>
              <strong>{dayLabel(entry.date)}</strong>
              <span>
                {entry.closed ? 'geschlossen' : `${shortTime(entry.open)}–${shortTime(entry.close)} Uhr`}
                {entry.note ? ` · ${entry.note}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}

      {todayHours && !todayHours.closed && <TodayTimeline open={todayHours.open} close={todayHours.close} now={now} />}
    </div>
  );
}

export default function Location() {
  const { consent, accept } = useCookieConsent();
  const mapsButton = useMagnetic();
  const content = useContent();
  const { contact, rating } = useSite().settings;

  return (
    <section className="location" id="location" data-character-target="location">
      <div className="location-inner">
        <Reveal className="location-info">
          <p className="eyebrow">{content['location.eyebrow']}</p>
          <h2><SplitWords text={content['location.title']} /></h2>
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
              <OpeningHours />
            </div>
          </div>

          {(contact.phone || contact.email) && (
            <div className="info-row">
              <span className="info-icon">📞</span>
              <div>
                <strong>Kontakt</strong>
                {contact.phone && <p><a href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}>{contact.phone}</a></p>}
                {contact.email && <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
              </div>
            </div>
          )}

          <div className="info-row">
            <span className="info-icon">⭐</span>
            <div>
              <strong>Bewertung</strong>
              <p>{rating.value} von 5 · {rating.count} Rezensionen auf Google</p>
            </div>
          </div>
          <a
            className="btn btn-primary"
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-character-target="route"
            ref={mapsButton.ref}
            onMouseMove={mapsButton.onMouseMove}
            onMouseLeave={mapsButton.onMouseLeave}
          >
            {content['location.mapsButton']}
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
