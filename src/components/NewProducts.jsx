import { newProducts } from '../data/newProducts';
import { useTilt } from '../hooks/useTilt';
import Reveal from './Reveal';
import './NewProducts.css';

function ProductCard({ product, delay }) {
  const tilt = useTilt(10);

  return (
    <Reveal className="product-card-wrap" delay={delay}>
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
  return (
    <section className="new-products" id="new">
      <Reveal className="new-header">
        <p className="eyebrow">Neu eingetroffen</p>
        <h2 className="section-title">Frisch im Regal.</h2>
        <p className="lead">
          Jede Woche neue Süßigkeiten-Trends aus aller Welt — von internationalen Klassikern bis zu
          den heißesten Newcomern.
        </p>
      </Reveal>

      <div className="product-grid">
        {newProducts.map((product, i) => (
          <ProductCard key={product.title} product={product} delay={i * 0.1} />
        ))}
      </div>
    </section>
  );
}
