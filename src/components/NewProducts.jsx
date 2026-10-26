import { useTilt } from '../hooks/useTilt';
import { useParallax } from '../hooks/useParallax';
import { useContent, useSite } from '../site/SiteProvider';
import { AvailabilitySash, GRADIENTS, ProductDetails, ProductMedia } from './products/ProductParts';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import './NewProducts.css';

function ProductCard({ product, delay, index }) {
  const tilt = useTilt(10);

  return (
    <Reveal className="product-card-wrap" delay={delay} data-character-target={`product-${index}`}>
      <div
        className="product-card tilt-card"
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
      >
        <ProductMedia product={product} />
        <AvailabilitySash product={product} />
        {product.badge && <div className="badge">{product.badge}</div>}
        <h3>{product.title}</h3>
        <p>{product.text}</p>
        <ProductDetails product={product} />
      </div>
    </Reveal>
  );
}

export default function NewProducts() {
  // The side tag drifts sideways as the section scrolls past.
  const tagTrack = useParallax(1.4, 'x');
  const content = useContent();
  // Products marked "Auf der Startseite hervorheben" in the admin panel.
  const highlights = useSite()
    .products.filter((product) => product.isHighlight)
    .sort((a, b) => a.highlightOrder - b.highlightOrder)
    .map((product, i) => ({ ...product, gradient: GRADIENTS[i % GRADIENTS.length] }));

  return (
    <section className="new-products" id="new" data-character-target="products">
      <div className="new-products-tag-track" ref={tagTrack} aria-hidden="true">
        <span className="new-products-tag">{content['new.tag']}</span>
      </div>
      <Reveal className="new-header">
        <p className="eyebrow">{content['new.eyebrow']}</p>
        <h2 className="section-title"><SplitWords text={content['new.title']} /></h2>
        <p className="lead">{content['new.text']}</p>
      </Reveal>

      <div className="product-grid" data-character-target="products-grid">
        {highlights.map((product, i) => (
          <ProductCard key={product.id} product={product} delay={i * 0.1} index={i} />
        ))}
      </div>

      <Reveal className="products-more" delay={highlights.length * 0.1}>
        <a href="/produkte.html" className="products-more-link">
          {content['new.moreLink']}
        </a>
      </Reveal>
    </section>
  );
}
