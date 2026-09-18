import { useEffect, useState } from 'react';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { MAPS_URL } from '../data/constants';
import './Header.css';

const LINKS = [
  { href: '#services', label: 'Leistungen' },
  { href: '#new', label: 'Neue Waren' },
  { href: '#reviews', label: 'Bewertungen' },
  { href: '#location', label: 'Standort' },
];

export default function Header() {
  const { scrolled } = useScrollProgress();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`}>
      <div className="nav-inner">
        <a href="#home" className="brand" onClick={() => setMenuOpen(false)}>
          <img src="/logo.jpg" alt="Snack Point Logo" className="brand-logo" />
          <span>Snack Point</span>
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
