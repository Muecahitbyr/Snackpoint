import { useCallback, useEffect, useState } from 'react';
import { useContent, useSite } from '../../site/SiteProvider';
import { IS_PRERENDER } from '../../site/env';
import Reveal from '../Reveal';
import SplitWords from '../SplitWords';
import EventDetail from './EventDetail';
import EventIcon from './EventIcons';
import { dateBadge, eventCountdown, eventDayLong, eventPrice, eventTimeRange } from './eventFormat';
import './Events.css';

const MORE_STEP = 6;
const hashFor = (event) => `#event-${event.id}`;

/** The next / featured event, big. */
function FeaturedEvent({ event, onOpen }) {
  const badge = dateBadge(event.startsAt);
  // "Morgen" etc. would be outdated in stored HTML.
  const countdown = IS_PRERENDER ? null : eventCountdown(event);
  const price = eventPrice(event);

  return (
    <article id={`event-${event.id}`} className="ev-featured" onClick={() => onOpen(event)}>
      <div className={`ev-featured-media ${event.image ? 'has-image' : ''}`}>
        {event.image ? (
          <img src={event.image} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="ev-poster" aria-hidden="true">
            <span>{badge.day}</span>
            <span>{badge.month}</span>
          </span>
        )}
        <div className="ev-date ev-date-lg" aria-hidden="true">
          <span className="ev-date-day">{badge.day}</span>
          <span className="ev-date-month">{badge.month}</span>
        </div>
      </div>
      <div className="ev-featured-body">
        <div className="ev-tags">
          {countdown && <span className="ev-countdown">{countdown}</span>}
          {event.featured && <span className="ev-tag">Highlight</span>}
        </div>
        <h3 className="ev-featured-title">{event.title}</h3>
        <ul className="ev-facts">
          <li><EventIcon name="calendar" /> {eventDayLong(event.startsAt)}</li>
          <li><EventIcon name="clock" /> {eventTimeRange(event)}</li>
          {event.location && <li><EventIcon name="pin" /> {event.location}</li>}
          {price && <li><EventIcon name="ticket" /> {price}</li>}
        </ul>
        {event.description && <p className="ev-featured-text">{event.description}</p>}
        <button type="button" className="btn btn-primary ev-btn" onClick={(e) => { e.stopPropagation(); onOpen(event); }}>
          Alle Infos <EventIcon name="arrow" />
        </button>
      </div>
    </article>
  );
}

function EventTile({ event, onOpen }) {
  const badge = dateBadge(event.startsAt);
  const countdown = IS_PRERENDER ? null : eventCountdown(event);

  return (
    <button type="button" id={`event-${event.id}`} className="ev-tile" onClick={() => onOpen(event)}>
      <span className="ev-date" aria-hidden="true">
        <span className="ev-date-day">{badge.day}</span>
        <span className="ev-date-month">{badge.month}</span>
      </span>
      <span className="ev-tile-body">
        {countdown && <span className="ev-countdown ev-countdown-sm">{countdown}</span>}
        <strong className="ev-tile-title">{event.title}</strong>
        <span className="ev-tile-meta"><EventIcon name="clock" size={14} /> {eventTimeRange(event)}</span>
        {event.location && <span className="ev-tile-meta"><EventIcon name="pin" size={14} /> {event.location}</span>}
      </span>
      <span className="ev-tile-arrow" aria-hidden="true"><EventIcon name="arrow" /></span>
    </button>
  );
}

/** Homepage section right below the hero — only rendered while events are planned. */
export default function Events() {
  const content = useContent();
  const { current } = useSite().events;
  const [open, setOpen] = useState(null);
  const [visible, setVisible] = useState(MORE_STEP);

  // #event-<id> opens that event directly (shareable link).
  useEffect(() => {
    const fromHash = () => {
      const match = current.find((event) => hashFor(event) === window.location.hash);
      if (match) setOpen(match);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [current]);

  const openEvent = useCallback((event) => {
    setOpen(event);
    window.history.replaceState(null, '', hashFor(event));
  }, []);
  const close = useCallback(() => {
    setOpen(null);
    window.history.replaceState(null, '', '#events');
  }, []);

  if (!current.length) return null;
  const [featured, ...rest] = current;
  const ticker = current.map((event) => `${event.title} · ${dateBadge(event.startsAt).day}. ${dateBadge(event.startsAt).month}`);
  const half = Array.from({ length: Math.max(3, 8 - ticker.length) }, () => ticker).flat();

  return (
    <section className="ev-section" id="events" aria-labelledby="events-title">
      <div className="ev-ticker" aria-hidden="true">
        <div className="ev-ticker-track">
          {[...half, ...half].map((text, i) => <span key={i}>{text}</span>)}
        </div>
      </div>

      <div className="ev-inner">
        <Reveal className="ev-header">
          <p className="eyebrow">{content['events.eyebrow']}</p>
          <h2 id="events-title" className="section-title ev-title"><SplitWords text={content['events.title']} /></h2>
          {content['events.text'] && <p className="ev-lead">{content['events.text']}</p>}
        </Reveal>

        <Reveal delay={0.1}>
          <FeaturedEvent event={featured} onOpen={openEvent} />
        </Reveal>

        {rest.length > 0 && (
          <div className="ev-list">
            {rest.slice(0, visible).map((event, i) => (
              <Reveal key={event.id} delay={0.05 * (i % MORE_STEP)}>
                <EventTile event={event} onOpen={openEvent} />
              </Reveal>
            ))}
          </div>
        )}
        {rest.length > visible && (
          <div className="ev-more">
            <button type="button" className="btn ev-btn ev-btn-outline" onClick={() => setVisible((n) => n + MORE_STEP)}>
              Weitere Events anzeigen ({rest.length - visible})
            </button>
          </div>
        )}
      </div>

      {open && <EventDetail event={open} onClose={close} />}
    </section>
  );
}
