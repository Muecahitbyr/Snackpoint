import { useEffect, useRef, useState } from 'react';
import { MAPS_URL } from '../data/constants';
import './Header.css';

// Absolute (/#services) rather than bare (#services) hashes so these links
// also work correctly from standalone pages like /produkte.html or
// /impressum.html, not just from the homepage itself.
const LINKS = [
  { href: '/#services', label: 'Leistungen' },
  { href: '/#new', label: 'Neue Waren' },
  { href: '/#reviews', label: 'Bewertungen' },
  { href: '/#location', label: 'Standort' },
];

export default function Header() {
  const navRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header ref={navRef} className={`nav ${menuOpen ? 'menu-open' : ''}`}>
      <div className="nav-inner">
        <a href="/#home" className="brand" onClick={() => setMenuOpen(false)}>
          <img src="/logo.jpg" alt="SnackPoint Logo" className="brand-logo" />
          <span>SnackPoint</span>
        </a>
        <nav className="nav-links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <a className="nav-cta" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          Route planen
        </a>
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
          {LINKS.map((link) => (
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
  );
}
