import { ADDRESS } from '../data/constants';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" data-character-target="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/logo.jpg" alt="Snack Point Logo" />
          <span>Snack Point Kaufbeuren</span>
        </div>
        <p>{ADDRESS}</p>
        <p className="footer-copy">© 2026 Snack Point Kaufbeuren</p>
      </div>
    </footer>
  );
}
