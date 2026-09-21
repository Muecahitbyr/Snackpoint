import { useMemo, useState } from 'react';
import { allProducts, PRODUCT_CATEGORIES } from '../../data/allProducts';
import { useTilt } from '../../hooks/useTilt';
import Header from '../Header';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import Reveal from '../Reveal';
import '../NewProducts.css';
import './Produkte.css';

const ALL = 'Alle';

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
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allProducts.filter((product) => {
      const matchesCategory = category === ALL || product.category === category;
      const matchesSearch =
        !term || product.title.toLowerCase().includes(term) || product.text.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

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

        <div className="produkte-controls">
          <div className="produkte-search">
            <span className="produkte-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Produkt suchen…"
              aria-label="Produkte durchsuchen"
            />
            {search && (
              <button type="button" className="produkte-search-clear" onClick={() => setSearch('')} aria-label="Suche löschen">
                ✕
              </button>
            )}
          </div>

          <div className="produkte-filters" role="group" aria-label="Nach Kategorie filtern">
            <button
              type="button"
              className={`produkte-filter-chip ${category === ALL ? 'is-active' : ''}`}
              onClick={() => setCategory(ALL)}
            >
              Alle
            </button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`produkte-filter-chip ${category === cat ? 'is-active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="product-grid produkte-grid">
            {filtered.map((product, i) => (
              <ProductCard key={product.title} product={product} delay={(i % 8) * 0.06} />
            ))}
          </div>
        ) : (
          <div className="produkte-empty">
            <p>Keine Produkte gefunden. Versuch es mit einem anderen Suchbegriff oder einer anderen Kategorie.</p>
          </div>
        )}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
