import './Legal.css';

// A deliberately minimal header for the standalone legal pages (own HTML
// entry points, see vite.config.js) — the main site's Header has in-page
// anchor links (#services etc.) that don't exist here, so this just gets
// people back to the homepage instead of reusing that nav.
export default function LegalHeader() {
  return (
    <header className="legal-header">
      <a href="/" className="legal-brand">
        <img src="/logo.jpg" alt="SnackPoint Logo" />
        <span>SnackPoint</span>
      </a>
      <a href="/" className="legal-back">← Zur Startseite</a>
    </header>
  );
}
