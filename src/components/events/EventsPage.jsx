import { useContent, useSite } from '../../site/SiteProvider';
import Header from '../Header';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import Reveal from '../Reveal';
import SplitWords from '../SplitWords';
import EventCard from './EventCard';
import '../NewProducts.css';
import './Events.css';

export default function EventsPage() {
  const content = useContent();
  const { current, past } = useSite().events;

  return (
    <div className="produkte-page events-page">
      <Header />
      <main className="events-main">
        <div className="events-header">
          <p className="eyebrow">{content['events.eyebrow']}</p>
          <h1 className="section-title"><SplitWords text={content['events.title']} /></h1>
          {content['events.text'] && <p className="lead">{content['events.text']}</p>}
        </div>

        {current.length > 0 ? (
          <div className="events-grid events-grid-full">
            {current.map((event, i) => (
              <Reveal key={event.id} className="event-card-wrap" delay={(i % 6) * 0.08}>
                <EventCard event={event} full />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="events-empty">
            <svg className="events-empty-icon" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p>{content['events.empty']}</p>
            <a className="btn btn-primary" href="/#location">Öffnungszeiten ansehen</a>
          </div>
        )}

        {past.length > 0 && (
          <section className="events-past" aria-labelledby="events-past-title">
            <h2 id="events-past-title" className="events-past-title">{content['events.pastTitle']}</h2>
            <div className="events-grid events-grid-full">
              {past.map((event) => (
                <EventCard key={event.id} event={event} full />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
