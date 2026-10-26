import { useTilt } from '../../hooks/useTilt';
import { dateBadge, eventPrice, eventWhen } from './eventFormat';

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

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
        {event.image && <img src={event.image} alt="" loading="lazy" decoding="async" />}
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
        {event.location && <p className="event-location"><PinIcon /> {event.location}</p>}
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
