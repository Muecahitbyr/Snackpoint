import { useEffect, useRef, useState } from 'react';
import { ADDRESS, MAPS_URL } from '../../data/constants';
import EventIcon from './EventIcons';
import { dateBadge, downloadCalendarFile, eventCountdown, eventDayLong, eventPrice, eventTimeRange } from './eventFormat';

/** Full event view in a dialog: every detail, gallery, calendar file, route. */
export default function EventDetail({ event, onClose }) {
  const closeRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const badge = dateBadge(event.startsAt);
  const countdown = eventCountdown(event);
  const price = eventPrice(event);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') (photo ? setPhoto(null) : onClose());
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [onClose, photo]);

  return (
    <div className="ev-modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <article className="ev-dialog" role="dialog" aria-modal="true" aria-labelledby="ev-dialog-title">
        <button ref={closeRef} type="button" className="ev-dialog-close" onClick={onClose} aria-label="Schließen">
          <EventIcon name="close" size={20} />
        </button>

        <div className={`ev-dialog-media ${event.image ? 'has-image' : ''}`}>
          {event.image && <img src={event.image} alt="" />}
          <div className="ev-date ev-date-lg" aria-hidden="true">
            <span className="ev-date-day">{badge.day}</span>
            <span className="ev-date-month">{badge.month}</span>
          </div>
          {countdown && <span className="ev-countdown">{countdown}</span>}
        </div>

        <div className="ev-dialog-body">
          <h3 id="ev-dialog-title" className="ev-dialog-title">{event.title}</h3>

          <ul className="ev-facts">
            <li><EventIcon name="calendar" /> {eventDayLong(event.startsAt)}</li>
            <li><EventIcon name="clock" /> {eventTimeRange(event)}</li>
            <li><EventIcon name="pin" /> {event.location ? `${event.location} · ${ADDRESS}` : ADDRESS}</li>
            {price && <li><EventIcon name="ticket" /> {price}</li>}
          </ul>

          {event.description && <p className="ev-dialog-text">{event.description}</p>}

          {event.gallery.length > 0 && (
            <div className="ev-gallery">
              {event.gallery.map((src) => (
                <button key={src} type="button" onClick={() => setPhoto(src)} aria-label="Bild vergrößern">
                  <img src={src.replace(/\?/, '/thumb?')} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          <div className="ev-actions">
            <button type="button" className="btn btn-primary ev-btn" onClick={() => downloadCalendarFile(event, ADDRESS)}>
              <EventIcon name="download" /> In Kalender speichern
            </button>
            <a className="btn ev-btn ev-btn-outline" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              <EventIcon name="route" /> Route planen
            </a>
          </div>
        </div>
      </article>

      {photo && (
        <div className="ev-lightbox" onMouseDown={() => setPhoto(null)} role="presentation">
          <img src={photo} alt="" />
        </div>
      )}
    </div>
  );
}
