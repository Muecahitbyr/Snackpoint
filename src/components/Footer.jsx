import { ADDRESS } from '../data/constants';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { useContent, useSite } from '../site/SiteProvider';
import Reveal from './Reveal';
import './Footer.css';

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', whatsapp: 'WhatsApp', google: 'Google' };

export default function Footer() {
  const { reset } = useCookieConsent();
  const content = useContent();
  const social = Object.entries(useSite().settings.social).filter(([key, url]) => url && SOCIAL_LABELS[key]);

  return (
    <footer className="footer" data-character-target="footer">
      <Reveal className="footer-inner">
        <div className="footer-brand">
          <img src={content['brand.logo'] ?? '/logo.jpg'} alt={`${content['brand.name']} Logo`} />
          <span>{content['brand.fullName']}</span>
        </div>
        <p>{ADDRESS}</p>
        {social.length > 0 && (
          <nav className="footer-legal footer-social" aria-label="Social Media">
            {social.map(([key, url], i) => (
              <span key={key} className="footer-social-item">
                {i > 0 && <span className="footer-legal-dot">·</span>}
                <a href={url} target="_blank" rel="noopener noreferrer">{SOCIAL_LABELS[key]}</a>
              </span>
            ))}
          </nav>
        )}
        <nav className="footer-legal">
          <a href="/produkte">Sortiment</a>
          <span className="footer-legal-dot">·</span>
          <a href="/impressum">Impressum</a>
          <span className="footer-legal-dot">·</span>
          <a href="/datenschutz">Datenschutz</a>
          <span className="footer-legal-dot">·</span>
          <button type="button" className="footer-legal-btn" onClick={reset}>
            Cookie-Einstellungen
          </button>
        </nav>
        <p className="footer-copy">© {new Date().getFullYear()} {content['brand.fullName']}</p>
      </Reveal>
    </footer>
  );
}
