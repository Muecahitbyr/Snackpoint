import { ADDRESS } from '../data/constants';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" data-character-target="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/logo.jpg" alt="SnackPoint Logo" />
          <span>SnackPoint Kaufbeuren</span>
        </div>
        <p>{ADDRESS}</p>
        <p className="footer-copy">© 2026 SnackPoint Kaufbeuren</p>
      </div>
    </footer>
  );
}
