import { useEffect, useRef, useState } from 'react';
import { MAPS_URL } from '../data/constants';
import { getOpenStatus } from './chatbot/openingHours';
import { useNow } from '../hooks/useNow';
import { useContent, useSite } from '../site/SiteProvider';
import AnnouncementBar from './AnnouncementBar';
import { IS_PRERENDER } from '../site/env';
import './Header.css';

// Live "open / closed" pill: on the right of the desktop bar, in the middle
// of the mobile one. Same hours data as the chatbot and the location
// section; clicking it jumps to the opening hours.
function OpenStatus() {
  const status = getOpenStatus(useNow());
  if (IS_PRERENDER) return <a href="/#location" className="nav-status">Öffnungszeiten</a>;

  return (
    <a
      href="/#location"
      className={`nav-status ${status.open ? 'is-open' : 'is-closed'}`}
      title="Öffnungszeiten ansehen"
    >
      <span className="nav-status-dot" aria-hidden="true" />
      {status.open ? 'Geöffnet' : 'Geschlossen'}
      {status.open && status.closesAt && <span className="nav-status-until"> · bis {status.closesAt}</span>}
    </a>
  );
}

// Absolute (/#services) rather than bare (#services) hashes so these links
// also work correctly from standalone pages like /produkte or
// /impressum, not just from the homepage itself.
const LINKS = [
  { href: '/#services', label: 'Leistungen' },
  { href: '/#new', label: 'Neue Waren' },
  { href: '/#reviews', label: 'Bewertungen' },
  { href: '/#location', label: 'Standort' },
];
// Only listed while events are planned — first, like the section on the page.
const EVENTS_LINK = { href: '/#events', label: 'Events' };

export default function Header() {
  const navRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const content = useContent();
  const { events } = useSite();
  const links = events.current.length ? [EVENTS_LINK, ...LINKS] : LINKS;

  useEffect(() => {
    let ticking = false;

    function update() {
      navRef.current?.classList.toggle('scrolled', window.scrollY > 40);
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <AnnouncementBar />
      <header ref={navRef} className={`nav ${menuOpen ? 'menu-open' : ''}`}>
        <div className="nav-inner">
          <a href="/#home" className="brand" onClick={() => setMenuOpen(false)}>
            <img src={content['brand.logo'] ?? '/logo.jpg'} alt={`${content['brand.name']} Logo`} className="brand-logo" />
            <span>{content['brand.name']}</span>
          </a>
          <nav className="nav-links">
            {links.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
          <OpenStatus />
          <button
            type="button"
            className={`nav-burger ${menuOpen ? 'is-open' : ''}`}
            aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className="nav-mobile-panel">
          <nav>
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <a
            className="btn btn-primary"
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            Route planen
          </a>
        </div>
      </header>
    </>
  );
}
