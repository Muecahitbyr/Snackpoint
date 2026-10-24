import { newProducts } from '../data/newProducts';
import { useTilt } from '../hooks/useTilt';
import { useParallax } from '../hooks/useParallax';
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
        <div className={`product-media ${product.gradient}`}>
          <span>{product.emoji}</span>
        </div>
        <div className="badge">{product.badge}</div>
        <h3>{product.title}</h3>
        <p>{product.text}</p>
      </div>
    </Reveal>
  );
}

export default function NewProducts() {
  // The side tag drifts sideways as the section scrolls past.
  const tagTrack = useParallax(1.4, 'x');

  return (
    <section className="new-products" id="new" data-character-target="products">
      <div className="new-products-tag-track" ref={tagTrack} aria-hidden="true">
        <span className="new-products-tag">Snacks</span>
      </div>
      <Reveal className="new-header">
        <p className="eyebrow">Neu eingetroffen</p>
        <h2 className="section-title"><SplitWords text="Frisch im Regal." /></h2>
        <p className="lead">
          Jede Woche neue Süßigkeiten-Trends aus aller Welt — von internationalen Klassikern bis zu
          den heißesten Newcomern.
        </p>
      </Reveal>

      <div className="product-grid" data-character-target="products-grid">
        {newProducts.map((product, i) => (
          <ProductCard key={product.title} product={product} delay={i * 0.1} index={i} />
        ))}
      </div>

      <Reveal className="products-more" delay={newProducts.length * 0.1}>
        <a href="/produkte.html" className="products-more-link">
          Hier klicken, um alle Produkte zu sehen →
        </a>
      </Reveal>
    </section>
  );
}
