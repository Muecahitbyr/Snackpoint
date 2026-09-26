// Turns FACTS into replies: what the search found, what the opening hours are,
// what the data says. This file decides which facts appear in a reply and how
// they're arranged; the actual wording (and the tone) comes from messages.ts.
//
//   intent + data  →  facts  →  responseBuilder  →  wording from messages.ts
import { ADDRESS, CONTACT, DELIVERY_INFO, MAPS_URL, PARKING_INFO, PAYMENT_METHODS } from '../../data/constants';
import { CATEGORIES, PRODUCTS, getProductId, getProductName, type Product } from '../../data/products';
import type { ProductQuery } from './entities';
import { M, pick, say, type Flavor, type Rng, type Tones } from './messages';
import type { DayFact, HoursFocus, HoursQuestion, NextOpening, OpenStatus, WeekGroup } from './openingHours';
import { CONFIDENT, categoryProducts, getProductsByIds, hasTag, isAvailable, rootCategory, type SegmentResult } from './productSearch';
import type { BotReply, ChatContext, Entities, Intent, QuickReply } from './types';

export { pick, say, LANG } from './messages';
export type { Rng } from './messages';

const MAX_LIST = 8;
const MAX_FOLLOWUP_LIST = 12;
const PRODUCTS_CTA = { label: 'Alle Produkte ansehen', href: '/produkte.html' };
const ROUTE_CTA = { label: 'Route öffnen', href: MAPS_URL, external: true };
const HOURS_CTA = { label: 'Öffnungszeiten ansehen', href: '#location' };

// ---- Small helpers ------------------------------------------------------

function formatPrice(price: number): string {
  return `${price.toFixed(2).replace('.', ',')} €`;
}

const bullet = (product: Product): string => `• ${getProductName(product)}`;

function bulletList(products: Product[], limit: number): string {
  const shown = products.slice(0, limit).map(bullet);
  if (products.length > limit) shown.push('• … und weitere');
  return shown.join('\n');
}

/** "A, B und C" */
function joinNames(names: string[], last = 'und'): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${last} ${names[names.length - 1]}`;
}

/** Distinct brand-or-product names in order: Red Bull ×3 + Monster ×3 → [Red Bull, Monster]. */
function groupNames(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.brand ?? getProductName(product)))];
}

const sharedBrand = (products: Product[]): string | null => {
  const brands = new Set(products.map((product) => product.brand));
  const [only] = brands;
  return brands.size === 1 && only ? only : null;
};

/** Decides the tone: age-restricted products get matter-of-fact wording only. */
function flavorOfProducts(products: Product[]): Flavor {
  if (products.some((product) => product.category === 'zigaretten')) return 'restricted';
  if (products.length && products.every((product) => product.category === 'energy')) return 'energy';
  if (products.length && products.every((product) => rootCategory(product.category)?.id === 'snacks')) return 'snack';
  return 'generic';
}

function flavorOfCategory(categoryId: string): Flavor {
  if (categoryId === 'zigaretten') return 'restricted';
  if (categoryId === 'energy') return 'energy';
  return rootCategory(categoryId)?.id === 'snacks' ? 'snack' : 'generic';
}

// ---- Products ---------------------------------------------------------------

export interface ProductAnswer extends BotReply {
  productIds: string[];
  categoryId?: string;
  offer?: ChatContext['offer'];
}

function priceReply(products: Product[], rng: Rng): string {
  const available = products.filter(isAvailable);
  const priced = available.filter((product) => product.price != null);
  if (!priced.length) return pick(M.price.missing, rng);

  if (priced.length === 1 && available.length === 1) {
    const [product] = priced;
    const name = getProductName(product);
    const price = formatPrice(product.price as number);
    return flavorOfProducts([product]) === 'restricted' ? pick(M.price.oneRestricted, rng)(name, price) : say(M.price.one, rng)(name, price);
  }

  const lines = priced.slice(0, MAX_FOLLOWUP_LIST).map((product) => `• ${getProductName(product)} – ${formatPrice(product.price as number)}`);
  const missing = priced.length < available.length ? `\n${M.price.partlyMissing}` : '';
  return `${pick(M.price.listHeader, rng)}\n${lines.join('\n')}${missing}`;
}

function categoryReply(categoryId: string, rng: Rng): { text: string; offer?: ChatContext['offer'] } {
  const category = CATEGORIES.find((entry) => entry.id === categoryId);
  const all = categoryProducts(categoryId).filter(isAvailable);
  if (!category || !all.length) return { text: M.noProducts };

  if (all.length <= MAX_LIST) return { text: `${say(M.available.intro[flavorOfCategory(categoryId)], rng)}\n${bulletList(all, MAX_LIST)}` };

  const children = CATEGORIES.filter((child) => child.parent === categoryId);
  if (children.length >= 2) {
    return { text: `${say(M.areas, rng)}\n${children.map((child) => `• ${child.name}`).join('\n')}\n${M.areasCloser}` };
  }
  const names = groupNames(all).slice(0, 4);
  return { text: say(M.categorySummary, rng)(names.join(', '), category.name), offer: 'list' };
}

function availabilityReply(products: Product[], listRequest: boolean, rng: Rng): { text: string; offer?: ChatContext['offer'] } {
  const flavor = flavorOfProducts(products);
  if (products.length === 1) return { text: say(M.available.one[flavor], rng)(getProductName(products[0])) };

  if (products.length > MAX_LIST && !listRequest) {
    const names = products.slice(0, 3).map(getProductName);
    return { text: say(M.productSummary, rng)(products.length, joinNames(names)), offer: 'list' };
  }

  const list = bulletList(products, listRequest ? MAX_FOLLOWUP_LIST : MAX_LIST);
  const brand = sharedBrand(products);
  if (brand && !listRequest && flavor !== 'restricted') {
    const intro = say(M.available.brandMany, rng)(brand);
    const closer = products.some((product) => product.price != null)
      ? pick(M.available.closerWithPrices, rng)
      : products.length >= 3
        ? M.available.closerNoPrices
        : '';
    return { text: `${intro}\n${list}${closer ? `\n${closer}` : ''}` };
  }
  return { text: `${say(M.available.intro[flavor], rng)}\n${list}` };
}

function notFoundReply(result: SegmentResult, rng: Rng): string {
  const suggestion = result.suggestions.length ? ` ${M.didYouMean(joinNames(result.suggestions.map(getProductName), 'oder'))}` : '';
  return `${pick(M.notFound, rng)(result.display)}${suggestion} ${pick(M.askTeam, rng)}`;
}

function recommendationReply(results: SegmentResult[] | undefined, rng: Rng): { text: string; ids: string[] } {
  const hits = (results ?? []).filter((result) => result.category || result.products.length);
  const tagged = hits.length === 1 && hits[0].tagOnly;

  if (tagged) {
    const picks = hits[0].products.filter(isAvailable).slice(0, 5);
    if (picks.length) return { text: `${say(M.recommendation.byTag, rng)}\n${bulletList(picks, 5)}`, ids: picks.map(getProductId) };
  }

  // Only ever recommends products the data itself tags as "beliebt".
  const base = hits.length ? hits.flatMap((hit) => (hit.category ? categoryProducts(hit.category.id) : hit.products)) : PRODUCTS;
  const popular = base.filter((product) => isAvailable(product) && hasTag(product, 'beliebt')).slice(0, 4);
  if (!popular.length) return { text: M.recommendation.none, ids: [] };
  return { text: `${say(M.recommendation.popular, rng)}\n${bulletList(popular, 4)}`, ids: popular.map(getProductId) };
}

/** Several things asked at once ("Cola und Chips"): one line per hit. */
function multiReply(results: SegmentResult[], rng: Rng): { text: string; ids: string[] } {
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
    if (available.length > 2) lines.push(`• ${result.display} (${available.length} Sorten)`);
    else {
      for (const product of available) {
        if (!seen.has(getProductId(product))) lines.push(bullet(product));
        seen.add(getProductId(product));
      }
    }
    ids.push(...available.map(getProductId));
  }

  const parts: string[] = [];
  if (lines.length) parts.push(`${say(M.available.those, rng)}\n${lines.join('\n')}`);
  if (missing.length) parts.push(`${M.multiMissing(missing.join(' und '))} ${pick(M.askTeam, rng)}`);
  return { text: parts.join('\n'), ids };
}

export function buildProductAnswer(intent: Intent, entities: Entities, ctx: ChatContext, rng: Rng): ProductAnswer {
  const query = entities.query as ProductQuery | undefined;
  const results = entities.results ?? [];
  // Anything that mentions cigarettes/tobacco carries the 18+ note.
  const withAgeNote = (text: string, ids: string[]) =>
    getProductsByIds(ids).some((product) => product.category === 'zigaretten') ? `${text}\n${M.ageNote}` : text;
  const finish = (text: string, ids: string[], extra: Partial<ProductAnswer> = {}): ProductAnswer => ({
    text: withAgeNote(text, ids),
    cta: PRODUCTS_CTA,
    productIds: ids,
    quickReplies: quickRepliesFor(intent, { productIds: ids, offer: Boolean(extra.offer) }),
    ...extra,
  });

  // "Welche?" / "Was kosten die?" / "ja" — refers back to the last answer.
  if (entities.fromContext) {
    const products = getProductsByIds(ctx.lastProductIds ?? []);
    if (!products.length) return { text: M.whichProduct, productIds: [] };
    const ids = products.map(getProductId);
    if (intent === 'product_price') return finish(priceReply(products, rng), ids);
    return finish(`${pick(M.followUpList, rng)}\n${bulletList(products.filter(isAvailable), MAX_FOLLOWUP_LIST)}`, ids);
  }

  if (intent === 'recommendations') {
    const { text, ids } = recommendationReply(results, rng);
    return finish(text, ids);
  }

  if (results.length > 1) {
    const { text, ids } = multiReply(results, rng);
    return finish(text, ids);
  }

  const [result] = results;
  if (!result || !query) return { text: say(M.unknown, rng), productIds: [] };

  if (result.category) {
    const categoryId = result.category.id;
    if (intent === 'product_price') {
      const products = categoryProducts(categoryId);
      return finish(priceReply(products, rng), products.filter(isAvailable).map(getProductId), { categoryId });
    }
    const { text, offer } = categoryReply(categoryId, rng);
    return finish(text, categoryProducts(categoryId).filter(isAvailable).map(getProductId), { categoryId, offer });
  }

  if (!result.products.length) return finish(notFoundReply(result, rng), []);

  const available = result.products.filter(isAvailable);
  const soldOut = result.products.filter((product) => !isAvailable(product));
  const soldOutText = soldOut.map((product) => pick(M.soldOut, rng)(getProductName(product))).join(' ');
  const ids = available.map(getProductId);
  if (!available.length) return finish(soldOutText, ids);

  // Not sure enough (typo territory): ask instead of asserting.
  if (result.confidence < CONFIDENT) {
    const text =
      available.length === 1
        ? pick(M.cautious.one, rng)(getProductName(available[0]))
        : `${pick(M.cautious.many, rng)}\n${bulletList(available, MAX_LIST)}`;
    return finish(text, ids);
  }

  if (intent === 'product_price') return finish(priceReply(available, rng), ids);

  const { text, offer } = availabilityReply(available, intent === 'product_variants', rng);
  return finish(soldOutText ? `${text}\n${soldOutText}` : text, ids, { offer });
}

// ---- Opening hours (facts from openingHours.ts) ------------------------------

const nextSentence = (next: NextOpening | null): string => (next ? M.hours.next(next.when, next.time) : '');

/** "etwa 2 Stunden und 15 Minuten" */
function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    hours ? `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}` : '',
    minutes ? `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}` : '',
  ].filter(Boolean);
  return parts.length ? `etwa ${parts.join(' und ')}` : 'weniger als eine Minute';
}

/** "Habt ihr gerade offen?" — and with `remaining`, "Wie lange habt ihr noch offen?". */
export function openNowReply(status: OpenStatus, remaining: boolean, rng: Rng): BotReply {
  if (!status.open) return { text: say(M.hours.closedNow, rng)(nextSentence(status.next)), cta: HOURS_CTA };
  const until = status.closesAt as string;
  const text = remaining
    ? pick(M.hours.remaining, rng)(until, formatDuration(status.minutesLeft ?? 0))
    : say(M.hours.openNow, rng)(until);
  return { text, cta: HOURS_CTA };
}

/** "Wann macht ihr wieder auf?" */
export function reopeningReply(status: OpenStatus): BotReply {
  const text = status.open
    ? M.hours.reopeningOpen(status.closesAt as string, nextSentence(status.next))
    : M.hours.reopeningClosed(nextSentence(status.next));
  return { text: text.trim(), cta: HOURS_CTA };
}

/** Opening hours on one day — when we open, when we close, or both. */
export function dayReply(fact: DayFact, focus: HoursFocus, question: HoursQuestion, rng: Rng): BotReply {
  const { day } = fact;
  const label = day.label; // "Heute", "Morgen", "Samstag" …
  const inSentence = ['Heute', 'Morgen', 'Übermorgen'].includes(label) ? label.toLowerCase() : label;

  if (fact.closed) {
    const base = say(M.hours.closedDay, rng)(label);
    const lead = question === 'yesNo' ? pick(M.hours.no, rng) : question === 'closed' ? 'Ja, ' : '';
    const next = day.offset === 0 ? ` ${nextSentence(fact.status.next)}` : '';
    return { text: `${lead}${base}${next}`.trim(), cta: HOURS_CTA };
  }

  const { open, close } = fact as { open: string; close: string };
  if (fact.over) return { text: M.hours.over(close, nextSentence(fact.status.next)), cta: HOURS_CTA };

  let text: string;
  if (focus === 'close') {
    const tones: Tones<string> = {
      plain: M.hours.close.plain.map((variant) => variant(label, inSentence, close)),
      funny: day.offset === 0 ? M.hours.closeTodayFunny.map((variant) => variant(close)) : undefined,
    };
    text = say(tones, rng);
  } else if (focus === 'open') {
    text = fact.alreadyOpen ? M.hours.alreadyOpen(open) : pick(M.hours.open.plain, rng)(label, open);
  } else {
    text = pick(M.hours.both.plain, rng)(label, open, close);
  }

  const lead = question === 'yesNo' ? pick(M.hours.yes, rng) : question === 'closed' ? pick(M.hours.no, rng) : '';
  return { text: `${lead}${text}`, cta: HOURS_CTA };
}

/** The whole week, identical consecutive days merged. */
export function weekReply(groups: WeekGroup[], rng: Rng): BotReply {
  if (groups.length === 1) {
    const [group] = groups;
    return { text: group.closed ? M.hours.weekClosed : pick(M.hours.weekSingle, rng)(group.open, group.close), cta: HOURS_CTA };
  }
  const lines = groups.map((group) => {
    const days = group.count === 1 ? group.first : group.count === 2 ? `${group.first} & ${group.last}` : `${group.first} – ${group.last}`;
    return `• ${days}: ${group.closed ? 'geschlossen' : `${group.open} – ${group.close} Uhr`}`;
  });
  return { text: `${pick(M.hours.weekHeader, rng)}\n${lines.join('\n')}`, cta: HOURS_CTA };
}

// ---- Quick replies ----------------------------------------------------------

const QR = {
  prices: { label: 'Preise', query: 'Was kosten die?' },
  allSorts: { label: 'Alle Sorten', query: 'Welche Sorten gibt es?' },
  hours: { label: 'Öffnungszeiten', query: 'Wie sind eure Öffnungszeiten?' },
  address: { label: 'Adresse', query: 'Wo seid ihr?' },
  route: { label: 'Route', query: 'Wie komme ich zu euch?' },
  contact: { label: 'Kontakt', query: 'Wie kann ich euch erreichen?' },
  moreProducts: { label: 'Weitere Produkte', query: 'Was habt ihr im Sortiment?' },
} satisfies Record<string, QuickReply>;

const OTHER_IN_ROOT: Record<string, QuickReply> = {
  snacks: { label: 'Andere Snacks', query: 'Welche Snacks habt ihr?' },
  getraenke: { label: 'Andere Getränke', query: 'Welche Getränke habt ihr?' },
};

/** Suggested next questions for a reply, shown as chips. */
export function quickRepliesFor(intent: Intent, info: { productIds?: string[]; offer?: boolean } = {}): QuickReply[] | undefined {
  switch (intent) {
    case 'opening_hours':
    case 'open_now':
    case 'closing_time':
    case 'opening_time':
      return [QR.address, QR.route, QR.contact];
    case 'address':
      return [QR.route, QR.hours, QR.contact];
    case 'directions':
      return [QR.hours, QR.contact];
    case 'phone':
    case 'contact':
      return [QR.address, QR.hours];
    case 'payment_methods':
    case 'services':
    case 'faq':
      return [QR.hours, QR.address];
    case 'product_price':
      return info.productIds?.length ? [QR.allSorts, QR.hours, QR.address] : undefined;
    case 'product_search':
    case 'product_availability':
    case 'product_category':
    case 'product_variants':
    case 'recommendations': {
      if (!info.productIds?.length) return undefined;
      const first = getProductsByIds(info.productIds)[0];
      const other = (first && OTHER_IN_ROOT[rootCategory(first.category)?.id ?? '']) || QR.moreProducts;
      return [info.offer ? QR.allSorts : QR.prices, other, QR.hours];
    }
    default:
      return undefined;
  }
}

// ---- Everything that isn't a product ------------------------------------------

export function greetingReply(kind: Entities['greeting'], rng: Rng): BotReply {
  const tones = kind === 'morgen' ? M.greetingMorning : kind === 'abend' ? M.greetingEvening : M.greeting;
  return { text: say(tones, rng) };
}

export const thanksReply = (rng: Rng): BotReply => ({ text: say(M.thanks, rng) });
export const goodbyeReply = (rng: Rng): BotReply => ({ text: say(M.goodbye, rng) });
export const unknownReply = (rng: Rng): BotReply => ({ text: say(M.unknown, rng) });
export const helpReply = (): BotReply => ({ text: M.help });

export const addressReply = (rng: Rng): BotReply => ({
  text: pick(M.address, rng)(ADDRESS),
  cta: ROUTE_CTA,
  quickReplies: quickRepliesFor('address'),
});
export const directionsReply = (rng: Rng): BotReply => ({
  text: pick(M.directions, rng)(ADDRESS),
  cta: ROUTE_CTA,
  quickReplies: quickRepliesFor('directions'),
});

export function phoneReply(): BotReply {
  const text = CONTACT.phone ? M.phone(CONTACT.phone) : M.noPhone(ADDRESS);
  return { text, cta: CONTACT.phone ? undefined : ROUTE_CTA, quickReplies: quickRepliesFor('phone') };
}

export function contactReply(): BotReply {
  const details = [CONTACT.phone && `Telefon: ${CONTACT.phone}`, CONTACT.email && `E-Mail: ${CONTACT.email}`].filter(Boolean);
  const text = details.length ? M.contact(details.join('\n')) : M.noContact(ADDRESS);
  return { text, cta: details.length ? undefined : ROUTE_CTA, quickReplies: quickRepliesFor('contact') };
}

export function paymentReply(rng: Rng): BotReply {
  const text = PAYMENT_METHODS.length ? pick(M.payment, rng)(PAYMENT_METHODS.join(', ')) : M.noPayment;
  return { text, quickReplies: quickRepliesFor('payment_methods') };
}

export const deliveryReply = (): BotReply => ({ text: DELIVERY_INFO || M.noDelivery, quickReplies: quickRepliesFor('services') });
export const parkingReply = (): BotReply => ({ text: PARKING_INFO || M.noParking, quickReplies: quickRepliesFor('services') });
