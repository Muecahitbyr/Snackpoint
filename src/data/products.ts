// Central product data for the chat assistant — the ONE place to maintain it.
//
//   • New product: add a row to BRANDED_PRODUCTS below. Name, brand, variant,
//     aliases, tags and price are all picked up automatically; no chat rules
//     need to change. (One row per flavour/variant, e.g. one per Takis sort.)
//   • Price: the `price` field of that row.
//   • Generic product groups from the /produkte page (allProducts.js) are
//     picked up automatically; their extras are set in GENERIC_OVERRIDES.
//
// This is a static list, not a live inventory feed: the bot words its
// answers accordingly and never claims a product is *definitely* out of range.
import { allProducts } from './allProducts';

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
  { id: 'zeitschriften', name: 'Zeitschriften', aliases: [] },
];

// Generic product groups from the /produkte catalog (allProducts.js): which
// chat category they belong to, plus search words. Groups not listed here
// fall back to their title only.
const CATEGORY_BY_CATALOG_CATEGORY: Record<string, string> = {
  'Süßigkeiten': 'suessigkeiten',
  Schokolade: 'schokolade',
  'Getränke': 'getraenke',
  'Chips & Salziges': 'chips',
  'Sandwiches & Snacks': 'belegtes',
  Sonstiges: 'snacks',
};

const GENERIC_OVERRIDES: Record<string, { category?: string; aliases?: string[]; tags?: string[]; skip?: boolean }> = {
  'Fruchtgummi-Mix': { aliases: ['gummi', 'gummibärchen', 'weingummi', 'lakritz', 'bärchen'], tags: ['suess', 'beliebt'] },
  'Lutscher & Lollis': { aliases: ['lolli', 'lutscher'], tags: ['suess'] },
  Kaubonbons: { aliases: ['bonbon', 'karamell', 'toffee'], tags: ['suess'] },
  Marshmallows: { aliases: ['schaumzucker'], tags: ['suess'] },
  'Sauer-Extrem': { aliases: ['sauer', 'saure'], tags: ['sauer'] },
  'Schokoriegel-Klassiker': { aliases: ['riegel'], tags: ['suess', 'beliebt'] },
  'Kekse & Gebäck': { aliases: ['keks', 'cookie', 'waffel'], tags: ['suess'] },
  'Pralinen-Auswahl': { aliases: ['praline', 'konfekt'], tags: ['suess'] },
  'Nuss-Schokolade': { aliases: ['tafel', 'zartbitter', 'vollmilch'], tags: ['suess'] },
  'Cola & Limonaden': { aliases: ['limo', 'fanta', 'sprite', 'softdrink', 'brause'], tags: ['kalt', 'beliebt'] },
  // Superseded by the branded Energy Drinks below.
  'Energy Drinks': { category: 'energy', skip: true },
  'Wasser still & medium': { aliases: ['mineralwasser', 'sprudel'], tags: ['kalt'] },
  'Eistee & Fruchtsäfte': { aliases: ['eistee', 'saft', 'fruchtsaft', 'schorle'], tags: ['kalt'] },
  'Kaffee to go': { aliases: ['coffee', 'cappuccino', 'latte', 'espresso'], tags: ['heiss'] },
  Kartoffelchips: { aliases: ['chips', 'paprikachips'], tags: ['salzig', 'beliebt'] },
  'Nachos & Dips': { aliases: ['nacho', 'dip', 'salsa', 'tortilla'], tags: ['salzig'] },
  'Nüsse & Studentenfutter': { aliases: ['nuss', 'erdnuss', 'cashew', 'mandeln', 'pistazien'], tags: ['salzig'] },
  'Belegte Sandwiches': { aliases: ['sandwich', 'toast'] },
  Wraps: { aliases: ['wrap'] },
  Baguettes: { aliases: ['baguette', 'brötchen'] },
  'Frisches Gebäck': { aliases: ['gebäck', 'croissant', 'teilchen'] },
  'Salat to go': { aliases: ['salat'] },
  'Popcorn süß & salzig': { aliases: ['popcorn'], tags: ['suess', 'salzig'] },
  'Eis am Stiel': { aliases: ['eis', 'eiscreme', 'speiseeis'], tags: ['kalt', 'suess'] },
};

const GENERIC_PRODUCTS: Product[] = allProducts.flatMap((item: { title: string; category: string }) => {
  const override = GENERIC_OVERRIDES[item.title];
  if (override?.skip) return [];
  return [
    {
      name: item.title,
      category: override?.category ?? CATEGORY_BY_CATALOG_CATEGORY[item.category] ?? 'snacks',
      aliases: override?.aliases,
      tags: override?.tags,
    },
  ];
});

// ⚠️ BEISPIELDATEN — please check against the real range and prices before
// relying on them: the bot answers "Ja, haben wir" for every row that isn't
// marked `available: false`, and quotes a price only where one is set.
const BRANDED_PRODUCTS: Product[] = [
  // Zigaretten & Tabak
  { brand: 'Marlboro', variant: 'Red', category: 'zigaretten' },
  { brand: 'Marlboro', variant: 'Gold', category: 'zigaretten' },
  { name: 'Tabakwaren', category: 'zigaretten' },
  // Chips
  { brand: 'Takis', variant: 'Blue Heat', category: 'chips', aliases: ['blaue takis', 'takis blue'], tags: ['scharf', 'beliebt'] },
  { brand: 'Takis', variant: 'Fuego', category: 'chips', tags: ['scharf'] },
  { brand: 'Takis', variant: 'Intense Nacho', category: 'chips', tags: ['salzig', 'kaesig'] },
  // Energy Drinks
  { brand: 'Red Bull', variant: 'Original', category: 'energy', tags: ['kalt', 'beliebt'] },
  { brand: 'Red Bull', variant: 'Sugarfree', category: 'energy', aliases: ['zuckerfrei'], tags: ['kalt', 'zuckerfrei'] },
  { brand: 'Red Bull', variant: 'Red Edition', category: 'energy', aliases: ['wassermelone'], tags: ['kalt'] },
  { brand: 'Monster', variant: 'Energy', category: 'energy', tags: ['kalt', 'beliebt'] },
  { brand: 'Monster', variant: 'Ultra', category: 'energy', aliases: ['zero'], tags: ['kalt', 'zuckerfrei'] },
  { brand: 'Monster', variant: 'Mango Loco', category: 'energy', tags: ['kalt'] },
  // Sonstiges
  { name: 'Zeitschriften', category: 'zeitschriften', aliases: ['magazin', 'zeitung', 'heft'] },
];

export const PRODUCTS: Product[] = [...GENERIC_PRODUCTS, ...BRANDED_PRODUCTS];

export function getProductName(product: Product): string {
  return product.name ?? [product.brand, product.variant].filter(Boolean).join(' ');
}

export function getProductId(product: Product): string {
  return product.id ?? getProductName(product).toLowerCase();
}
