// Central product data for the chat assistant. To add a product, add a row to
// BRANDED_PRODUCTS below (or, for generic product groups, to allProducts.js —
// those are picked up automatically). Nothing else needs to change.
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
  /** Price in euros (optional). */
  price?: number;
  /** Extra search words / synonyms. */
  keywords?: string[];
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

/** Customer wording → canonical search word, applied to both the user's
 * message and the product data before matching. Regex sources; whole words only. */
export const PHRASE_SYNONYMS: [pattern: string, replacement: string][] = [
  ['blau(?:e|er|en|es|em)?', 'blue'],
  ['rot(?:e|er|en|es|em)?', 'red'],
  ['gruen(?:e|er|en|es|em)?', 'green'],
  ['gelb(?:e|er|en|es|em)?', 'yellow'],
  ['schwarz(?:e|er|en|es|em)?', 'black'],
  ['weiss(?:e|er|en|es|em)?', 'white'],
  ['red ?bulls?', 'redbull'],
  ['coca ?cola', 'cola'],
  ['kit ?kat', 'kitkat'],
  ['energy ?drinks?', 'energy'],
  ['zigis?', 'zigarette'],
  ['kippen', 'zigarette'],
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

const GENERIC_OVERRIDES: Record<string, { category?: string; keywords?: string[]; skip?: boolean }> = {
  'Fruchtgummi-Mix': { keywords: ['gummi', 'gummibärchen', 'weingummi', 'lakritz', 'bärchen'] },
  'Lutscher & Lollis': { keywords: ['lolli', 'lutscher'] },
  Kaubonbons: { keywords: ['bonbon', 'karamell', 'toffee'] },
  Marshmallows: { keywords: ['schaumzucker'] },
  'Sauer-Extrem': { keywords: ['sauer', 'saure'] },
  'Schokoriegel-Klassiker': { keywords: ['riegel'] },
  'Kekse & Gebäck': { keywords: ['keks', 'cookie', 'waffel'] },
  'Pralinen-Auswahl': { keywords: ['praline', 'konfekt'] },
  'Nuss-Schokolade': { keywords: ['tafel', 'zartbitter', 'vollmilch'] },
  'Cola & Limonaden': { keywords: ['limo', 'fanta', 'sprite', 'softdrink', 'brause'] },
  // Superseded by the branded Energy Drinks below.
  'Energy Drinks': { category: 'energy', skip: true },
  'Wasser still & medium': { keywords: ['mineralwasser', 'sprudel'] },
  'Eistee & Fruchtsäfte': { keywords: ['eistee', 'saft', 'fruchtsaft', 'schorle'] },
  'Kaffee to go': { keywords: ['coffee', 'cappuccino', 'latte', 'espresso'] },
  Kartoffelchips: { keywords: ['chips', 'paprikachips'] },
  'Nachos & Dips': { keywords: ['nacho', 'dip', 'salsa', 'tortilla'] },
  'Nüsse & Studentenfutter': { keywords: ['nuss', 'erdnuss', 'cashew', 'mandeln', 'pistazien'] },
  'Belegte Sandwiches': { keywords: ['sandwich', 'toast'] },
  Wraps: { keywords: ['wrap'] },
  Baguettes: { keywords: ['baguette', 'brötchen'] },
  'Frisches Gebäck': { keywords: ['gebäck', 'croissant', 'teilchen'] },
  'Salat to go': { keywords: ['salat'] },
  'Popcorn süß & salzig': { keywords: ['popcorn'] },
  'Eis am Stiel': { keywords: ['eis', 'eiscreme', 'speiseeis'] },
};

const GENERIC_PRODUCTS: Product[] = allProducts.flatMap((item: { title: string; category: string }) => {
  const override = GENERIC_OVERRIDES[item.title];
  if (override?.skip) return [];
  return [
    {
      name: item.title,
      category: override?.category ?? CATEGORY_BY_CATALOG_CATEGORY[item.category] ?? 'snacks',
      keywords: override?.keywords,
    },
  ];
});

// ⚠️ BEISPIELDATEN — please check against the real range before relying on
// them: the bot answers "Ja, haben wir" for every row that isn't marked
// `available: false`.
const BRANDED_PRODUCTS: Product[] = [
  // Zigaretten & Tabak
  { brand: 'Marlboro', variant: 'Red', category: 'zigaretten' },
  { brand: 'Marlboro', variant: 'Gold', category: 'zigaretten' },
  { name: 'Tabakwaren', category: 'zigaretten' },
  // Chips
  { brand: 'Takis', variant: 'Blue Heat', category: 'chips' },
  { brand: 'Takis', variant: 'Fuego', category: 'chips' },
  { brand: 'Takis', variant: 'Intense Nacho', category: 'chips' },
  // Energy Drinks
  { brand: 'Red Bull', variant: 'Original', category: 'energy' },
  { brand: 'Red Bull', variant: 'Sugarfree', category: 'energy', keywords: ['zuckerfrei'] },
  { brand: 'Red Bull', variant: 'Red Edition', category: 'energy', keywords: ['wassermelone'] },
  { brand: 'Monster', variant: 'Energy', category: 'energy' },
  { brand: 'Monster', variant: 'Ultra', category: 'energy', keywords: ['zero', 'zuckerfrei'] },
  { brand: 'Monster', variant: 'Mango Loco', category: 'energy' },
  // Sonstiges
  { name: 'Zeitschriften', category: 'zeitschriften', keywords: ['magazin', 'zeitung', 'heft'] },
];

export const PRODUCTS: Product[] = [...GENERIC_PRODUCTS, ...BRANDED_PRODUCTS];

export function getProductName(product: Product): string {
  return product.name ?? [product.brand, product.variant].filter(Boolean).join(' ');
}

export function getProductId(product: Product): string {
  return product.id ?? getProductName(product).toLowerCase();
}
