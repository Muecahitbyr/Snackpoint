import TickerBadge from '../TickerBadge';

// Pieces shared by the product cards on the homepage ("Frisch im Regal")
// and /produkte: picture or emoji tile, availability sash, price & details.

export const GRADIENTS = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

const PRICE = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const formatPrice = (cents) => PRICE.format(cents / 100);

export function ProductMedia({ product }) {
  return (
    <div className={`product-media ${product.gradient} ${product.image ? 'has-image' : ''}`.trim()}>
      {product.image ? <img src={product.image} alt={product.title} loading="lazy" decoding="async" /> : <span>{product.emoji}</span>}
    </div>
  );
}

const AVAILABILITY_SASH = {
  coming_soon: { text: 'BALD VERFÜGBAR', dark: false },
  sold_out: { text: 'AUSVERKAUFT', dark: true },
};

export function AvailabilitySash({ product }) {
  const sash = AVAILABILITY_SASH[product.availability];
  return sash ? <TickerBadge text={sash.text} dark={sash.dark} /> : null;
}

/** Price, allergens and extra info — only what's filled in. */
export function ProductDetails({ product }) {
  if (product.price === null && !product.allergens && !product.info) return null;
  return (
    <div className="product-details">
      {product.price !== null && <span className="product-price">{formatPrice(product.price)}</span>}
      {product.info && <span className="product-info">{product.info}</span>}
      {product.allergens && <span className="product-info">Allergene: {product.allergens}</span>}
    </div>
  );
}
