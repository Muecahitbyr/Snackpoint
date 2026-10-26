import { useContent, useSite } from '../../site/SiteProvider';
import Reveal from '../Reveal';
import SplitWords from '../SplitWords';
import EventCard from './EventCard';
import './Events.css';

const HOME_LIMIT = 3;

/** Homepage section — only rendered while events are planned. */
export default function Events() {
  const content = useContent();
  const { current } = useSite().events;
  if (!current.length) return null;

  return (
    <section className="events" id="events">
      <Reveal className="events-header">
        <p className="eyebrow">{content['events.eyebrow']}</p>
        <h2 className="section-title"><SplitWords text={content['events.title']} /></h2>
        {content['events.text'] && <p className="lead">{content['events.text']}</p>}
      </Reveal>
      <div className="events-grid">
        {current.slice(0, HOME_LIMIT).map((event, i) => (
          <Reveal key={event.id} className="event-card-wrap" delay={i * 0.1}>
            <EventCard event={event} />
          </Reveal>
        ))}
      </div>
      <Reveal className="products-more events-more">
        <a href="/events" className="products-more-link">
          {current.length > HOME_LIMIT ? `Alle ${current.length} Events ansehen →` : 'Details zu den Events →'}
        </a>
      </Reveal>
    </section>
  );
}
