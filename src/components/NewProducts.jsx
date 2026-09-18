import { newProducts } from '../data/newProducts';
import Reveal from './Reveal';
import './NewProducts.css';

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
          <Reveal key={product.title} className="product-card" delay={i * 0.1}>
            <div className={`product-media ${product.gradient}`}>
              <span>{product.emoji}</span>
            </div>
            <div className="badge">{product.badge}</div>
            <h3>{product.title}</h3>
            <p>{product.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
