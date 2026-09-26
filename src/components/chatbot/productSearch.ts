// Product / category search over src/data/products.ts and the German reply
// text for it. Search is token-based and typo-tolerant, so "blaue takis",
// "takis blau" and "Takis Blue Heat" all find the same product.
import {
  CATEGORIES,
  PRODUCTS,
  getProductId,
  getProductName,
  type Product,
  type ProductCategory,
} from '../../data/products';
import { hasExact, isStopword, isTypoOf, normalizeMessage, stem, tokenize, tokensMatch } from './text';
import type { BotReply } from './types';

const AVAILABILITY_WORDS = [
  'habt', 'haben', 'hast', 'gibt', 'gibts', 'verkauft', 'verkaufen', 'verkauf', 'fuehrt', 'fuehren', 'bekomme', 'bekommt',
  'kaufen', 'sortiment', 'vorraetig', 'lager', 'kriege', 'kriegt',
];
const LIST_WORDS = ['welche', 'welcher', 'welches', 'welchen', 'sorten', 'sorte', 'varianten', 'variante', 'alle', 'liste', 'aufzaehlen'];
const PRICE_WORDS = ['kostet', 'kosten', 'preis', 'preise', 'wieviel', 'euro'];

const MAX_INLINE = 4;
const MAX_CATEGORY_LIST = 8;
const MAX_FOLLOWUP_LIST = 12;
const PRODUCTS_CTA = { label: 'Alle Produkte ansehen', href: '/produkte.html' };

export interface QuerySegment {
  /** What the user asked for, in their own words, fillers removed. */
  display: string;
  tokens: string[];
  stems: string[];
}

export interface ProductQuery {
  /** "Cola und Chips" → two segments, each searched on its own. */
  segments: QuerySegment[];
  /** "Welche …?", "Sorten" — the user wants the actual list. */
  listRequest: boolean;
  priceRequest: boolean;
  /** "Habt ihr …", "gibt es …" — as opposed to just naming a product. */
  availabilityAsked: boolean;
}

export interface SegmentResult {
  display: string;
  category?: ProductCategory;
  /** Products matching every word of the query (including unavailable ones). */
  products: Product[];
  /** Closest partial matches, only filled when nothing matched fully. */
  suggestions: Product[];
}

export function parseProductQuery(raw: string): ProductQuery {
  const allTokens = tokenize(raw);
  const segments: QuerySegment[] = [];

  for (const chunk of raw.split(/,|;|&|\+|\bund\b|\boder\b/i)) {
    const words = chunk.split(/\s+/).filter(Boolean);
    const shown = words.filter((word) => !isStopword(normalizeMessage(word)));
    const tokens = tokenize(chunk).filter((token) => !isStopword(token));
    if (!tokens.length) continue;
    segments.push({
      display: shown.join(' ').replace(/[?!.]+$/, ''),
      tokens,
      stems: tokens.map(stem),
    });
  }

  return {
    segments,
    listRequest: hasExact(allTokens, LIST_WORDS),
    priceRequest: hasExact(allTokens, PRICE_WORDS),
    availabilityAsked: hasExact(allTokens, AVAILABILITY_WORDS) || allTokens.some((token) => isTypoOf(token, ['habt', 'gibt'])),
  };
}

// ---- Index ------------------------------------------------------------

interface IndexedProduct {
  product: Product;
  id: string;
  name: string;
  /** Words a query can match (raw and stemmed), with brand words counting extra. */
  words: { raw: string; stem: string; brand: boolean }[];
}

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

const INDEX: IndexedProduct[] = PRODUCTS.map((product) => {
  const name = getProductName(product);
  const brandWords = product.brand ? tokenize(product.brand) : [];
  const otherText = [name, product.variant, ...(product.keywords ?? []), CATEGORY_BY_ID.get(product.category)?.name].filter(
    (part): part is string => Boolean(part)
  );
  const words = [
    ...brandWords.map((token) => ({ raw: token, stem: stem(token), brand: true })),
    ...otherText.flatMap((text) => tokenize(text)).map((token) => ({ raw: token, stem: stem(token), brand: false })),
  ];
  return { product, id: getProductId(product), name, words };
});

const CATEGORY_ALIASES = CATEGORIES.map((category) => ({
  category,
  aliases: category.aliases.map((alias) => tokenize(alias).map(stem)),
}));

// ---- Search -------------------------------------------------------------

/** The category the whole segment names ("Zigaretten", "Energy Drinks"), if any. */
function findCategory(stems: string[], fuzzy: boolean): ProductCategory | null {
  for (const { category, aliases } of CATEGORY_ALIASES) {
    const named = aliases.some(
      (alias) =>
        alias.length === stems.length &&
        alias.every((aliasStem) => stems.some((queryStem) => tokensMatch(queryStem, aliasStem, fuzzy)))
    );
    if (named) return category;
  }
  return null;
}

/** `fuzzy` allows typos. Turn it off for messages that don't clearly ask about
 * a product, so ordinary chit-chat can't match a product by accident. */
export function searchSegment(segment: QuerySegment, fuzzy = true): SegmentResult {
  const category = findCategory(segment.stems, fuzzy);
  if (category) return { display: segment.display, category, products: [], suggestions: [] };

  const full: Product[] = [];
  let bestScore = 0;
  let best: Product[] = [];

  for (const entry of INDEX) {
    let matched = 0;
    let score = 0;
    for (const [i, queryStem] of segment.stems.entries()) {
      const queryRaw = segment.tokens[i];
      const word = entry.words.find(
        (candidate) => tokensMatch(queryStem, candidate.stem, fuzzy) || tokensMatch(queryRaw, candidate.raw, fuzzy)
      );
      if (word) {
        matched += 1;
        score += word.brand ? 1.5 : 1;
      }
    }
    if (matched === segment.stems.length) full.push(entry.product);
    else if (matched > 0 && matched / segment.stems.length >= 0.5) {
      if (score > bestScore) {
        bestScore = score;
        best = [entry.product];
      } else if (score === bestScore) best.push(entry.product);
    }
  }

  return { display: segment.display, products: full, suggestions: full.length || best.length > 3 ? [] : best };
}

export function hasHit(result: SegmentResult): boolean {
  return Boolean(result.category) || result.products.length > 0;
}

/** Products in a category including its sub-categories, direct ones first. */
function categoryProducts(categoryId: string): Product[] {
  const children = CATEGORIES.filter((category) => category.parent === categoryId);
  const direct = PRODUCTS.filter((product) => product.category === categoryId);
  return [...direct, ...children.flatMap((child) => categoryProducts(child.id))];
}

export function getProductsByIds(ids: string[]): Product[] {
  return ids.flatMap((id) => {
    const found = INDEX.find((entry) => entry.id === id);
    return found ? [found.product] : [];
  });
}

// ---- Replies ------------------------------------------------------------

const isAvailable = (product: Product) => product.available !== false;

function formatPrice(price: number): string {
  return `${price.toFixed(2).replace('.', ',')} €`;
}

function bullet(product: Product): string {
  return `• ${getProductName(product)}${product.price != null ? ` – ${formatPrice(product.price)}` : ''}`;
}

function bulletList(products: Product[], limit: number): string {
  const shown = products.slice(0, limit).map(bullet);
  if (products.length > limit) shown.push('• … und weitere');
  return shown.join('\n');
}

function notFoundText(result: SegmentResult): string {
  const suggestion = result.suggestions.length
    ? ` Ähnlich habe ich: ${result.suggestions.map(getProductName).join(', ')}.`
    : '';
  return `„${result.display}“ habe ich aktuell nicht in unserem Sortiment gefunden.${suggestion} Frag am besten kurz unser Team vor Ort, unser Angebot wechselt. 😊`;
}

function categoryAnswer(category: ProductCategory, listRequest: boolean): { text: string; ids: string[] } {
  const all = categoryProducts(category.id).filter(isAvailable);
  const ids = all.map(getProductId);
  if (!all.length) return { text: 'Dazu habe ich gerade nichts hinterlegt. Frag am besten kurz unser Team vor Ort. 😊', ids };

  const children = CATEGORIES.filter((child) => child.parent === category.id);
  if (all.length <= MAX_CATEGORY_LIST) return { text: `Ja 😊 Wir haben aktuell:\n${bulletList(all, MAX_CATEGORY_LIST)}`, ids };
  if (children.length >= 2) {
    return { text: `Ja 😊 Da haben wir mehrere Bereiche:\n${children.map((child) => `• ${child.name}`).join('\n')}\nFrag gern nach einem davon!`, ids };
  }
  if (listRequest) return { text: `Ja 😊 Wir haben aktuell:\n${bulletList(all, MAX_FOLLOWUP_LIST)}`, ids };
  return { text: `Ja 😊 Zum Beispiel:\n${bulletList(all, MAX_CATEGORY_LIST)}\nFrag gern nach einem bestimmten Produkt!`, ids };
}

function productAnswer(result: SegmentResult, query: ProductQuery): { text: string; ids: string[] } {
  const available = result.products.filter(isAvailable);
  const unavailable = result.products.filter((product) => !isAvailable(product));
  const ids = available.map(getProductId);
  const soldOut = unavailable.map((product) => `${getProductName(product)} ist aktuell leider nicht da.`).join(' ');

  if (!available.length) return { text: soldOut, ids };

  if (query.priceRequest && available.length === 1) {
    const [product] = available;
    const text =
      product.price != null
        ? `${getProductName(product)} kostet ${formatPrice(product.price)}. 😊`
        : `Ja 😊 ${getProductName(product)} haben wir da. Den Preis weiß ich leider nicht sicher, frag dafür am besten kurz im Laden.`;
    return { text, ids };
  }

  let text: string;
  if (available.length === 1) text = `Ja 😊 ${getProductName(available[0])} haben wir da.`;
  else if (available.length <= MAX_INLINE || query.listRequest) text = `Ja 😊 Wir haben aktuell:\n${bulletList(available, MAX_FOLLOWUP_LIST)}`;
  else text = `Ja 😊 Da haben wir mehrere (${available.length}). Frag gern „Welche?“, dann zähle ich sie dir auf.`;

  if (query.priceRequest && available.every((product) => product.price == null)) {
    text += '\nDie Preise weiß ich leider nicht sicher, frag dafür am besten kurz im Laden.';
  }
  return { text: soldOut ? `${text}\n${soldOut}` : text, ids };
}

/** Composes the answer for one or several searched segments. */
export function answerProductQuery(query: ProductQuery, results: SegmentResult[]): BotReply & { productIds: string[] } {
  if (results.length === 1) {
    const [result] = results;
    if (result.category) {
      const { text, ids } = categoryAnswer(result.category, query.listRequest);
      return { text, cta: PRODUCTS_CTA, productIds: ids };
    }
    if (result.products.length) {
      const { text, ids } = productAnswer(result, query);
      return { text, cta: ids.length > 1 ? PRODUCTS_CTA : undefined, productIds: ids };
    }
    return { text: notFoundText(result), cta: PRODUCTS_CTA, productIds: [] };
  }

  // Several things asked at once ("Cola und Chips"): one line per hit.
  const lines: string[] = [];
  const ids: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    if (result.category) {
      if (!seen.has(result.category.id)) lines.push(`• ${result.category.name}`);
      seen.add(result.category.id);
      ids.push(...categoryProducts(result.category.id).filter(isAvailable).map(getProductId));
      continue;
    }
    const available = result.products.filter(isAvailable);
    if (!available.length) {
      missing.push(`„${result.display}“`);
      continue;
    }
    for (const product of available.length > 2 ? [] : available) {
      if (!seen.has(getProductId(product))) lines.push(bullet(product));
      seen.add(getProductId(product));
    }
    if (available.length > 2) lines.push(`• ${result.display} (${available.length} Sorten)`);
    ids.push(...available.map(getProductId));
  }

  const parts: string[] = [];
  if (lines.length) parts.push(`Ja 😊 Das haben wir:\n${lines.join('\n')}`);
  if (missing.length) parts.push(`${missing.join(' und ')} habe ich aktuell nicht in unserem Sortiment gefunden. Frag dazu am besten kurz unser Team vor Ort. 😊`);
  return { text: parts.join('\n'), cta: PRODUCTS_CTA, productIds: ids };
}

/** "Welche?" right after a product answer: list what that answer was about. */
export function answerFollowUp(productIds: string[]): BotReply {
  const products = getProductsByIds(productIds);
  if (!products.length) {
    return { text: 'Zu welchem Produkt meinst du das? Frag z. B. „Habt ihr Red Bull?“ 😊' };
  }
  return { text: `Aktuell haben wir:\n${bulletList(products, MAX_FOLLOWUP_LIST)}`, cta: PRODUCTS_CTA };
}
