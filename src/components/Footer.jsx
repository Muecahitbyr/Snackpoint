import { ADDRESS } from '../data/constants';
import { useCookieConsent } from '../hooks/useCookieConsent';
import './Footer.css';

export default function Footer() {
  const { reset } = useCookieConsent();

  return (
    <footer className="footer" data-character-target="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/logo.jpg" alt="SnackPoint Logo" />
          <span>SnackPoint Kaufbeuren</span>
        </div>
        <p>{ADDRESS}</p>
        <nav className="footer-legal">
          <a href="/impressum.html">Impressum</a>
          <span className="footer-legal-dot">·</span>
          <a href="/datenschutz.html">Datenschutz</a>
          <span className="footer-legal-dot">·</span>
          <button type="button" className="footer-legal-btn" onClick={reset}>
            Cookie-Einstellungen
          </button>
        </nav>
        <p className="footer-copy">© 2026 SnackPoint Kaufbeuren</p>
      </div>
    </footer>
  );
}
