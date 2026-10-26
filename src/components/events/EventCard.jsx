import { useTilt } from '../../hooks/useTilt';
import { dateBadge, eventPrice, eventWhen } from './eventFormat';

export default function EventCard({ event, full = false }) {
  const tilt = useTilt(6);
  const badge = dateBadge(event.startsAt);
  const price = eventPrice(event);

  return (
    <article
      className={`event-card tilt-card ${event.featured ? 'is-featured' : ''} ${event.isPast ? 'is-past' : ''}`}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
    >
      <div className={`event-media ${event.image ? 'has-image' : ''}`}>
        {event.image ? <img src={event.image} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">🎉</span>}
        <div className="event-date" aria-hidden="true">
          <span className="event-date-day">{badge.day}</span>
          <span className="event-date-month">{badge.month}</span>
        </div>
        {event.featured && !event.isPast && <div className="badge">HIGHLIGHT</div>}
        {event.isPast && <div className="badge">VORBEI</div>}
      </div>
      <div className="event-body">
        <p className="event-when">{eventWhen(event)}</p>
        <h3>{event.title}</h3>
        {event.location && <p className="event-location">📍 {event.location}</p>}
        {event.description && <p className={`event-text ${full ? '' : 'is-clamped'}`}>{event.description}</p>}
        {price && <p className="event-price">{price}</p>}
        {full && event.gallery.length > 0 && (
          <div className="event-gallery">
            {event.gallery.map((src) => (
              <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                <img src={src.replace(/\?/, '/thumb?')} alt="" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
