import './TickerBadge.css';

// Ticker sash across a card. The text is repeated in two identical halves
// so the CSS translateX(-50%) loop is seamless; screen readers get it once.
const BADGE_REPEATS = 6;

export default function TickerBadge({ text, dark = false }) {
  const half = Array.from({ length: BADGE_REPEATS }, (_, i) => (
    <span key={i} className="service-badge-item">{text}</span>
  ));

  return (
    <div className={`service-badge ${dark ? 'is-dark' : ''}`.trim()}>
      <span className="sr-only">{text}</span>
      <div className="service-badge-track" aria-hidden="true">
        {half}
        {half}
      </div>
    </div>
  );
}
