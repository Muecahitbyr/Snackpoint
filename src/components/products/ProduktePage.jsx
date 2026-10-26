import { useEffect, useMemo, useRef, useState } from 'react';
import { useTilt } from '../../hooks/useTilt';
import { useContent, useSite } from '../../site/SiteProvider';
import { AvailabilitySash, GRADIENTS, ProductDetails, ProductMedia } from './ProductParts';
import Header from '../Header';
import Footer from '../Footer';
import CookieConsent from '../CookieConsent';
import Reveal from '../Reveal';
import SplitWords from '../SplitWords';
import '../NewProducts.css';
import './Produkte.css';

const ALL = 'Alle';

// /produkte.html#lotto opens straight on that group.
function groupFromHash(groupById) {
  const id = window.location.hash.slice(1);
  return groupById.has(id) ? id : ALL;
}

function ProductCard({ product, delay, ageRestricted }) {
  const tilt = useTilt(10);

  return (
    <Reveal className="product-card-wrap" delay={delay}>
      <div
        className="product-card tilt-card"
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
      >
        <ProductMedia product={product} />
        <AvailabilitySash product={product} />
        {ageRestricted && <div className="age-badge" title="Nur ab 18 Jahren">18+</div>}
        <div className="badge">{product.category}</div>
        <h3>{product.title}</h3>
        <p>{product.text}</p>
        <ProductDetails product={product} />
      </div>
    </Reveal>
  );
}

export default function ProduktePage() {
  const site = useSite();
  const content = useContent();
  // Catalog in display order; the tile colour follows the position, as before.
  const { groups, groupById, catalog } = useMemo(() => {
    const catalog = site.products
      .filter((product) => product.showInCatalog)
      .map((product, i) => ({ ...product, gradient: GRADIENTS[i % GRADIENTS.length] }));
    const groups = site.groups.filter((g) => catalog.some((product) => product.group === g.id));
    return { groups, groupById: new Map(groups.map((g) => [g.id, g])), catalog };
  }, [site]);

  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(() => groupFromHash(groupById));
  const [category, setCategory] = useState(ALL);
  const groupsRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => {
      setGroup(groupFromHash(groupById));
      setCategory(ALL);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [groupById]);

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

  // Categories of the selected group that have products, in display order.
  const subCategories =
    group === ALL
      ? []
      : (groupById.get(group)?.categories ?? []).filter((name) => catalog.some((p) => p.group === group && p.category === name));

  const sections = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = catalog.filter((product) => {
      if (group !== ALL && product.group !== group) return false;
      if (category !== ALL && product.category !== category) return false;
      if (!term) return true;
      const groupName = groupById.get(product.group)?.name ?? '';
      return [product.title, product.brand ?? '', product.text, product.category, groupName].some((text) =>
        text.toLowerCase().includes(term)
      );
    });
    return groups.map((g) => ({ group: g, products: matches.filter((p) => p.group === g.id) })).filter(
      (section) => section.products.length > 0
    );
  }, [search, group, category, catalog, groups, groupById]);

  return (
    <div className="produkte-page">
      <Header />
      <main className="produkte-main">
        <div className="produkte-header">
          <p className="eyebrow">{content['products.eyebrow']}</p>
          <h1 className="section-title"><SplitWords text={content['products.title']} /></h1>
          <p className="lead">{content['products.text']}</p>
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
            {groups.map((g) => (
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
                  <ProductCard key={product.id} product={product} delay={(i % 8) * 0.06} ageRestricted={g.ageRestricted} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="produkte-empty">
            <p>Keine Produkte gefunden. Versuch es mit einem anderen Suchbegriff oder einem anderen Bereich.</p>
            {search.trim().length >= 2 && (
              <a className="btn btn-primary produkte-wish-link" href={`/?wunsch=${encodeURIComponent(search.trim())}#wunschliste`}>
                „{search.trim()}“ auf die Wunschliste setzen
              </a>
            )}
          </div>
        )}
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
