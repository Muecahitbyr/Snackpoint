// Product / category search over src/data/products.ts. Token-based and
// typo-tolerant, so "blaue takis", "takis blau" and "Takis Blue Heat" all find
// the same product; every result carries a confidence so the reply can be
// direct ("Ja!") or careful ("Meinst du …?").
import {
  CATEGORIES,
  PRODUCTS,
  getProductId,
  getProductName,
  type Product,
  type ProductCategory,
} from '../../data/products';
import type { QuerySegment } from './entities';
import { tokenSimilarity } from './fuzzySearch';
import { stem, tokenize } from './normalizer';

export interface SegmentResult {
  display: string;
  category?: ProductCategory;
  /** Products matching every word of the query (including unavailable ones). */
  products: Product[];
  /** 0–1: 1 for exact matches, lower the more typo tolerance was needed. */
  confidence: number;
  /** Every word of the query is a product property ("scharf", "sauer"), not a name. */
  tagOnly: boolean;
  /** Closest partial matches, only filled when nothing matched fully. */
  suggestions: Product[];
}

export const CONFIDENT = 0.8;
export const MIN_CONFIDENCE = 0.6;

// ---- Index ------------------------------------------------------------

interface IndexedWord {
  raw: string;
  stem: string;
  kind: 'brand' | 'name' | 'category' | 'tag';
}

interface IndexedProduct {
  product: Product;
  id: string;
  words: IndexedWord[];
}

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

const toWords = (texts: (string | undefined)[], kind: IndexedWord['kind']): IndexedWord[] =>
  texts.flatMap((text) => (text ? tokenize(text) : [])).map((raw) => ({ raw, stem: stem(raw), kind }));

const INDEX: IndexedProduct[] = PRODUCTS.map((product) => ({
  product,
  id: getProductId(product),
  words: [
    ...toWords([product.brand], 'brand'),
    ...toWords([getProductName(product), product.variant, ...(product.aliases ?? [])], 'name'),
    ...toWords([CATEGORY_BY_ID.get(product.category)?.name], 'category'),
    ...toWords(product.tags ?? [], 'tag'),
  ],
}));

const TAG_WORDS = INDEX.flatMap((entry) => entry.words.filter((word) => word.kind === 'tag'));

const CATEGORY_ALIASES = CATEGORIES.map((category) => ({
  category,
  aliases: category.aliases.map((alias) => tokenize(alias).map((token) => ({ raw: token, stem: stem(token) }))),
}));

// ---- Search -------------------------------------------------------------

const bestSimilarity = (raw: string, queryStem: string, word: { raw: string; stem: string }, fuzzy: boolean) =>
  Math.max(tokenSimilarity(queryStem, word.stem, fuzzy), tokenSimilarity(raw, word.raw, fuzzy));

/** The category the whole segment names ("Zigaretten", "Energy Drinks"), if any. */
function findCategory(segment: QuerySegment, fuzzy: boolean): { category: ProductCategory; confidence: number } | null {
  for (const { category, aliases } of CATEGORY_ALIASES) {
    for (const alias of aliases) {
      if (alias.length !== segment.stems.length) continue;
      const scores = alias.map((word) =>
        Math.max(0, ...segment.stems.map((queryStem, i) => bestSimilarity(segment.tokens[i], queryStem, word, fuzzy)))
      );
      if (scores.every((score) => score > 0)) return { category, confidence: Math.min(...scores) };
    }
  }
  return null;
}

/** `fuzzy` allows typos. Turn it off for messages that don't clearly ask about
 * a product, so ordinary chit-chat can't match a product by accident. */
export function searchSegment(segment: QuerySegment, fuzzy = true): SegmentResult {
  const empty = { products: [], suggestions: [], tagOnly: false };
  const named = findCategory(segment, fuzzy);
  if (named) return { display: segment.display, category: named.category, confidence: named.confidence, ...empty };

  const full: { product: Product; confidence: number }[] = [];
  let bestScore = 0;
  let best: Product[] = [];

  for (const entry of INDEX) {
    let matched = 0;
    let score = 0;
    let similaritySum = 0;
    segment.stems.forEach((queryStem, i) => {
      let top = 0;
      let kind: IndexedWord['kind'] = 'name';
      for (const word of entry.words) {
        const similarity = bestSimilarity(segment.tokens[i], queryStem, word, fuzzy);
        if (similarity > top) {
          top = similarity;
          kind = word.kind;
        }
      }
      if (top > 0) {
        matched += 1;
        similaritySum += top;
        score += kind === 'brand' ? 1.5 : kind === 'name' ? 1 : 0.4;
      }
    });
    if (matched === segment.stems.length) full.push({ product: entry.product, confidence: similaritySum / matched });
    else if (matched > 0 && matched / segment.stems.length >= 0.5 && score >= 1) {
      // (a hit on only the category name or a tag isn't worth suggesting)
      if (score > bestScore) {
        bestScore = score;
        best = [entry.product];
      } else if (score === bestScore) best.push(entry.product);
    }
  }

  const confidence = full.length ? Math.max(...full.map((hit) => hit.confidence)) : 0;
  const tagOnly =
    full.length > 0 &&
    segment.stems.every((queryStem, i) => TAG_WORDS.some((word) => bestSimilarity(segment.tokens[i], queryStem, word, fuzzy) >= CONFIDENT));

  return {
    display: segment.display,
    products: full.filter((hit) => hit.confidence >= MIN_CONFIDENCE).map((hit) => hit.product),
    confidence,
    tagOnly,
    suggestions: full.length || best.length > 3 ? [] : best,
  };
}

export function hasHit(result: SegmentResult): boolean {
  return Boolean(result.category) || result.products.length > 0;
}

export const isAvailable = (product: Product): boolean => product.available !== false;

/** Products in a category including its sub-categories, direct ones first. */
export function categoryProducts(categoryId: string): Product[] {
  const children = CATEGORIES.filter((category) => category.parent === categoryId);
  const direct = PRODUCTS.filter((product) => product.category === categoryId);
  return [...direct, ...children.flatMap((child) => categoryProducts(child.id))];
}

/** The top-level category a product belongs to ("chips" → "snacks"). */
export function rootCategory(categoryId: string): ProductCategory | undefined {
  let current = CATEGORY_BY_ID.get(categoryId);
  while (current?.parent) current = CATEGORY_BY_ID.get(current.parent);
  return current;
}

export function getProductsByIds(ids: string[]): Product[] {
  return ids.flatMap((id) => {
    const found = INDEX.find((entry) => entry.id === id);
    return found ? [found.product] : [];
  });
}

export function hasTag(product: Product, tag: string): boolean {
  return (product.tags ?? []).includes(tag);
}
