import { useEffect, useMemo, useRef, useState } from 'react';
import { allProducts, PRODUCT_GROUPS, groupCategories } from '../../data/allProducts';
import { useTilt } from '../../hooks/useTilt';
import Header from '../Header';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import Reveal from '../Reveal';
import SplitWords from '../SplitWords';
import '../NewProducts.css';
import './Produkte.css';

const ALL = 'Alle';
const GROUP_BY_ID = new Map(PRODUCT_GROUPS.map((group) => [group.id, group]));

// /produkte.html#lotto opens straight on that group.
function groupFromHash() {
  const id = window.location.hash.slice(1);
  return GROUP_BY_ID.has(id) ? id : ALL;
}

function ProductCard({ product, delay }) {
  const tilt = useTilt(10);
  const ageRestricted = GROUP_BY_ID.get(product.group)?.ageRestricted;

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
        {ageRestricted && <div className="age-badge" title="Nur ab 18 Jahren">18+</div>}
        <div className="badge">{product.category}</div>
        <h3>{product.title}</h3>
        <p>{product.text}</p>
      </div>
    </Reveal>
  );
}

export default function ProduktePage() {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(groupFromHash);
  const [category, setCategory] = useState(ALL);
  const groupsRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => {
      setGroup(groupFromHash());
      setCategory(ALL);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // On phones the tab row scrolls sideways — keep the active tab in view.
  useEffect(() => {
    const row = groupsRef.current;
    const active = row?.querySelector('.is-active');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
  }, [group]);

  const selectGroup = (id) => {
    setGroup(id);
    setCategory(ALL);
    window.history.replaceState(null, '', id === ALL ? window.location.pathname : `#${id}`);
  };

  const subCategories = group === ALL ? [] : groupCategories(group);

  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = allProducts.filter((product) => {
      if (group !== ALL && product.group !== group) return false;
      if (category !== ALL && product.category !== category) return false;
      if (!term) return true;
      const groupName = GROUP_BY_ID.get(product.group)?.name ?? '';
      return [product.title, product.text, product.category, groupName].some((text) => text.toLowerCase().includes(term));
    });
    return PRODUCT_GROUPS.map((g) => ({ group: g, products: matches.filter((p) => p.group === g.id) })).filter(
      (section) => section.products.length > 0
    );
  }, [search, group, category]);

  return (
    <div className="produkte-page">
      <Header />
      <main className="produkte-main">
        <div className="produkte-header">
          <p className="eyebrow">Sortiment</p>
          <h1 className="section-title"><SplitWords text="Alle Produkte." /></h1>
          <p className="lead">
            Snacks, Getränke, Tabakwaren, Lotto und mehr — eine Auswahl aus unserem Sortiment, oft in
            mehreren Sorten und Marken. Genaue Verfügbarkeit direkt bei uns in Kaufbeuren.
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

          <div className="produkte-groups" ref={groupsRef} role="group" aria-label="Nach Bereich filtern">
            <button
              type="button"
              className={`produkte-group-tab ${group === ALL ? 'is-active' : ''}`}
              onClick={() => selectGroup(ALL)}
            >
              <span aria-hidden="true">✨</span> Alle
            </button>
            {PRODUCT_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`produkte-group-tab ${group === g.id ? 'is-active' : ''}`}
                onClick={() => selectGroup(g.id)}
              >
                <span aria-hidden="true">{g.emoji}</span> {g.name}
              </button>
            ))}
          </div>

          {subCategories.length > 1 && (
            <div className="produkte-filters" role="group" aria-label="Nach Kategorie filtern">
              {[ALL, ...subCategories].map((cat) => (
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
          )}
        </div>

        {sections.length > 0 ? (
          sections.map(({ group: g, products }) => (
            <section key={g.id} className="produkte-section" aria-labelledby={`gruppe-${g.id}`}>
              <div className="produkte-section-head">
                <h2 id={`gruppe-${g.id}`}>
                  <span aria-hidden="true">{g.emoji}</span> {g.name}
                </h2>
                <span className="produkte-section-count">{products.length}</span>
              </div>
              {g.notice && <p className="produkte-notice">{g.notice}</p>}
              <div className="product-grid produkte-grid">
                {products.map((product, i) => (
                  <ProductCard key={product.title} product={product} delay={(i % 8) * 0.06} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="produkte-empty">
            <p>Keine Produkte gefunden. Versuch es mit einem anderen Suchbegriff oder einem anderen Bereich.</p>
          </div>
        )}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
