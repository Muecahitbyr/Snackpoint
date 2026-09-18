import { useScrollProgress } from '../hooks/useScrollProgress';
import { MAPS_URL } from '../data/constants';
import './Header.css';

export default function Header() {
  const { scrolled } = useScrollProgress();

  return (
    <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <a href="#home" className="brand">
          <img src="/logo.jpg" alt="Snack Point Logo" className="brand-logo" />
          <span>Snack Point</span>
        </a>
        <nav className="nav-links">
          <a href="#services">Leistungen</a>
          <a href="#new">Neue Waren</a>
          <a href="#reviews">Bewertungen</a>
          <a href="#location">Standort</a>
        </nav>
        <a className="nav-cta" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          Route planen
        </a>
      </div>
    </header>
  );
}
