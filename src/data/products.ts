// Product data for the chat assistant. The products themselves come from
// the database (maintained in the admin panel) and are handed in by
// setChatProducts() when the page loads — see src/site/siteData.js. What
// stays here is the chat's own vocabulary: its topics and their aliases.
//
// This is not a live inventory feed: the bot words its answers accordingly
// and never claims a product is *definitely* out of range.

export interface ProductCategory {
  id: string;
  /** Display name, e.g. in "Da haben wir mehrere Bereiche: …". */
  name: string;
  /** Words a customer might use for this category ("zigaretten", "tabak"). */
  aliases: string[];
  /** Sub-category of another one: asking for "Snacks" also covers "Chips". */
  parent?: string;
}

export interface Product {
  /** Optional — derived from the name when omitted. */
  id?: string;
  brand?: string;
  /** Flavour / edition, e.g. "Blue Heat". */
  variant?: string;
  /** Display name. Defaults to "<brand> <variant>". */
  name?: string;
  category: string;
  /** Defaults to true. Set false to keep a product on record but answer "aktuell nicht da". */
  available?: boolean;
  /** Price in euros. Without one, the bot says it has no price on record. */
  price?: number;
  /** Extra names customers use ("blaue takis", "blue heat"). */
  aliases?: string[];
  /** Properties for recommendations and filters: "scharf", "sauer", "suess",
   * "salzig", "kalt", "zuckerfrei", "beliebt" (used for "Was empfehlt ihr?"). */
  tags?: string[];
}

export const CATEGORIES: ProductCategory[] = [
  { id: 'zigaretten', name: 'Zigaretten & Tabak', aliases: ['zigaretten', 'zigarette', 'tabak', 'tabakwaren', 'rauchwaren'] },
  { id: 'getraenke', name: 'Getränke', aliases: ['getraenke', 'getraenk', 'drinks', 'softdrinks', 'trinken'] },
  { id: 'energy', name: 'Energy Drinks', aliases: ['energy', 'energie'], parent: 'getraenke' },
  { id: 'snacks', name: 'Snacks', aliases: ['snacks', 'snack', 'knabberzeug', 'knabbereien'] },
  { id: 'chips', name: 'Chips & Salziges', aliases: ['chips', 'salziges', 'nachos'], parent: 'snacks' },
  { id: 'suessigkeiten', name: 'Süßigkeiten', aliases: ['suessigkeiten', 'suessigkeit', 'suess', 'naschen', 'naschzeug', 'candy'], parent: 'snacks' },
  { id: 'schokolade', name: 'Schokolade', aliases: ['schokolade', 'schoko'], parent: 'suessigkeiten' },
  { id: 'belegtes', name: 'Sandwiches & Gebäck', aliases: ['belegtes', 'imbiss', 'essen', 'mittagessen', 'fruehstueck', 'hunger'], parent: 'snacks' },
  { id: 'zeitschriften', name: 'Zeitschriften', aliases: ['zeitschriften', 'zeitungen'] },
  { id: 'guthaben', name: 'Guthabenkarten', aliases: ['guthaben', 'guthabenkarte', 'aufladen', 'prepaid', 'geschenkkarte'] },
];

/** A product as the public site API delivers it (server/lib/publicSite.js). */
export interface SiteProduct {
  id: string;
  title: string;
  brand?: string;
  price: number | null;
  availability: 'available' | 'coming_soon' | 'sold_out';
  searchTerms: string[];
  tags: string[];
  showInCatalog: boolean;
  /** Chat topic, or null when the chat shouldn't answer for this product. */
  chatCategory: string | null;
}

/** Live list (mutated in place) — the chat's search index rebuilds when it changes. */
export const PRODUCTS: Product[] = [];
let catalogVersion = 0;

export function getCatalogVersion(): number {
  return catalogVersion;
}

export function setChatProducts(siteProducts: SiteProduct[]): void {
  // Catalog products first, then the extra brand rows — the order the
  // chat lists them in.
  const ordered = [...siteProducts.filter((item) => item.showInCatalog), ...siteProducts.filter((item) => !item.showInCatalog)];
  const products = ordered
    .filter((item) => item.chatCategory)
    .map((item): Product => {
      const variant = item.brand && item.title.startsWith(`${item.brand} `) ? item.title.slice(item.brand.length + 1) : undefined;
      return {
        name: item.title,
        brand: item.brand,
        variant,
        category: item.chatCategory as string,
        available: item.availability === 'available',
        price: item.price === null ? undefined : item.price / 100,
        aliases: item.searchTerms.length ? item.searchTerms : undefined,
        tags: item.tags.length ? item.tags : undefined,
      };
    });
  PRODUCTS.splice(0, PRODUCTS.length, ...products);
  catalogVersion += 1;
}

export function getProductName(product: Product): string {
  return product.name ?? [product.brand, product.variant].filter(Boolean).join(' ');
}

export function getProductId(product: Product): string {
  return product.id ?? getProductName(product).toLowerCase();
}
