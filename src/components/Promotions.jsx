import { useTilt } from '../hooks/useTilt';
import { useContent, useSite } from '../site/SiteProvider';
import { GRADIENTS } from './products/ProductParts';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import './NewProducts.css';
import './Promotions.css';

const UNTIL = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'numeric', timeZone: 'Europe/Berlin' });

function PromotionCard({ promotion, delay }) {
  const tilt = useTilt(10);

  return (
    <Reveal className="product-card-wrap" delay={delay}>
      <div className="product-card tilt-card" ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onMouseLeave}>
        <div className={`product-media ${promotion.gradient} ${promotion.image ? 'has-image' : ''}`.trim()}>
          {promotion.image ? <img src={promotion.image} alt={promotion.title} loading="lazy" /> : <span>{promotion.emoji || '🔥'}</span>}
        </div>
        {promotion.badge && <div className="badge">{promotion.badge}</div>}
        <h3>{promotion.title}</h3>
        {promotion.text && <p>{promotion.text}</p>}
        {(promotion.priceText || promotion.endsAt) && (
          <div className="product-details">
            {promotion.priceText && <span className="product-price">{promotion.priceText}</span>}
            {promotion.endsAt && <span className="product-info">Nur bis {UNTIL.format(new Date(promotion.endsAt))}</span>}
          </div>
        )}
      </div>
    </Reveal>
  );
}

/** Current offers from the admin panel — only rendered while there are any. */
export default function Promotions() {
  const content = useContent();
  const promotions = useSite()
    .promotions.filter((promotion) => !promotion.endsAt || new Date(promotion.endsAt) > new Date())
    .map((promotion, i) => ({ ...promotion, gradient: GRADIENTS[(i + 1) % GRADIENTS.length] }));
  if (!promotions.length) return null;

  return (
    <section className="promotions" id="aktionen">
      <Reveal className="new-header">
        <p className="eyebrow">{content['promotions.eyebrow']}</p>
        <h2 className="section-title"><SplitWords text={content['promotions.title']} /></h2>
      </Reveal>
      <div className="product-grid">
        {promotions.map((promotion, i) => (
          <PromotionCard key={promotion.id} promotion={promotion} delay={i * 0.1} />
        ))}
      </div>
    </section>
  );
}
