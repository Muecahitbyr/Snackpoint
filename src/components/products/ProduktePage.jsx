import { allProducts } from '../../data/allProducts';
import { useTilt } from '../../hooks/useTilt';
import Header from '../Header';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import Reveal from '../Reveal';
import '../NewProducts.css';
import './Produkte.css';

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
        <div className="badge">{product.category}</div>
        <h3>{product.title}</h3>
        <p>{product.text}</p>
      </div>
    </Reveal>
  );
}

export default function ProduktePage() {
  return (
    <div className="produkte-page">
      <Header />
      <main className="produkte-main">
        <div className="produkte-header">
          <p className="eyebrow">Sortiment</p>
          <h1 className="section-title">Alle Produkte.</h1>
          <p className="lead">
            Eine Auswahl aus unserem Sortiment — täglich frisch im Laden, oft in mehreren Sorten und
            Marken. Genaue Verfügbarkeit direkt bei uns in Kaufbeuren.
          </p>
        </div>

        <div className="product-grid produkte-grid">
          {allProducts.map((product, i) => (
            <ProductCard key={product.title} product={product} delay={(i % 8) * 0.06} />
          ))}
        </div>
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
