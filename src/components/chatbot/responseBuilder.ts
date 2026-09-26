// Builds the German reply text for every intent. Facts always come from the
// data (products, hours, address …); only the wording varies between variants.
//
// Language: all texts live in `de` below. To add English/Turkish later, add a
// sibling object with the same shape and register it in MESSAGES — nothing else
// in the engine has to change. (The sentence templates in openingHours.ts are
// still German-only.)
import { ADDRESS, CONTACT, DELIVERY_INFO, MAPS_URL, PARKING_INFO, PAYMENT_METHODS } from '../../data/constants';
import { CATEGORIES, PRODUCTS, getProductId, getProductName, type Product } from '../../data/products';
import { CONFIDENT, categoryProducts, getProductsByIds, hasTag, isAvailable, rootCategory, type SegmentResult } from './productSearch';
import type { ProductQuery } from './entities';
import type { BotReply, ChatContext, Entities, Intent, QuickReply } from './types';

export type Rng = () => number;
export type Lang = 'de';
export const LANG: Lang = 'de';

/** Picks one wording at random — the facts inside are identical in every variant. */
export function pick<T>(variants: readonly T[], rng: Rng): T {
  return variants[Math.floor(rng() * variants.length) % variants.length];
}

const de = {
  greeting: [
    'Hallo 😊 Wie kann ich dir helfen? Frag mich z. B. nach Produkten, Öffnungszeiten oder DHL.',
    'Hi 😊 Schön, dass du da bist! Wonach suchst du?',
    'Servus 😊 Was darf es sein? Ich kenne unser Sortiment, die Öffnungszeiten und den Weg zu uns.',
  ],
  greetingMorning: ['Guten Morgen ☀️ Wie kann ich dir helfen?', 'Guten Morgen 😊 Wonach suchst du?'],
  greetingEvening: ['Guten Abend 🌙 Wie kann ich dir helfen?', 'Guten Abend 😊 Wonach suchst du?'],
  thanks: [
    'Sehr gerne! 😊 Sag Bescheid, wenn du noch etwas wissen möchtest.',
    'Gern geschehen! 😊',
    'Kein Problem 😊 Ich bin da, falls noch was ist.',
  ],
  goodbye: ['Bis bald! 😊 Schau gern wieder vorbei.', 'Tschüss und bis später! 👋', 'Mach’s gut – wir sehen uns im Laden! 😊'],
  unknown: [
    'Das weiß ich leider nicht sicher. Frag am besten kurz unser Team vor Ort. 😊\nBei Produkten, Öffnungszeiten, Standort, DHL und Lotto helfe ich dir gern weiter.',
    'Dazu habe ich aktuell keine Information. Frag am besten kurz unser Team vor Ort. 😊\nBei Produkten, Öffnungszeiten, Standort, DHL und Lotto helfe ich dir gern weiter.',
  ],
  help:
    'Ich helfe dir gern bei:\n• Produkten – z. B. „Habt ihr blaue Takis?“ oder „Was kostet Red Bull?“\n• Öffnungszeiten – z. B. „Habt ihr gerade offen?“\n• Adresse & Route\n• DHL Paketshop & Lotto\n• Kontakt & Zahlungsarten',
  yesOne: [
    (name: string) => `Ja 😊 ${name} haben wir da.`,
    (name: string) => `Ja, ${name} haben wir aktuell im Sortiment.`,
    (name: string) => `Klar 😊 ${name} findest du bei uns.`,
    (name: string) => `Ja, ${name} haben wir.`,
  ],
  yesMany: ['Ja 😊 Wir haben aktuell:', 'Klar 😊 Das findest du bei uns:', 'Ja, da haben wir:'],
  yesThose: ['Ja 😊 Das haben wir:', 'Klar 😊 Das findest du bei uns:'],
  yesTag: ['Ja 😊 Da hätte ich was für dich:', 'Klar 😊 Das könnte dir gefallen:', 'Da passt bei uns:'],
  notFound: [
    (what: string) => `Das Produkt „${what}“ habe ich aktuell nicht in unserem Sortiment gefunden.`,
    (what: string) => `„${what}“ finde ich gerade nicht in unserem Sortiment.`,
  ],
  askTeam: 'Frag am besten kurz unser Team vor Ort, unser Angebot wechselt. 😊',
  priceMissing: 'Den aktuellen Preis habe ich leider nicht hinterlegt. Frag am besten kurz vor Ort nach. 😊',
  pricesPartlyMissing: 'Bei den anderen habe ich keinen Preis hinterlegt – frag dazu am besten kurz vor Ort nach.',
  noRecommendation: 'Dazu habe ich gerade keine Empfehlung hinterlegt. Frag am besten kurz unser Team vor Ort, die helfen dir gern weiter. 😊',
  whichProduct: 'Zu welchem Produkt meinst du das? Frag z. B. „Habt ihr Red Bull?“ 😊',
  noPhone: (address: string) => `Eine Telefonnummer habe ich leider nicht hinterlegt. Komm gern direkt vorbei: ${address}. 😊`,
  noContact: (address: string) => `Eine Telefonnummer oder E-Mail-Adresse habe ich leider nicht hinterlegt. Komm gern direkt vorbei: ${address}. 😊`,
  noPayment: 'Welche Zahlungsarten wir genau anbieten, weiß ich leider nicht sicher. Frag am besten kurz unser Team vor Ort. 😊',
  noDelivery: 'Zu einem Lieferservice habe ich keine Information. Frag am besten kurz unser Team vor Ort. 😊',
  noParking: 'Zu Parkmöglichkeiten habe ich keine Information. Frag am besten kurz unser Team vor Ort. 😊',
};

type Messages = typeof de;
const MESSAGES: Record<Lang, Messages> = { de };
const M = MESSAGES[LANG];

// ---- Small helpers ------------------------------------------------------

const MAX_LIST = 8;
const MAX_FOLLOWUP_LIST = 12;
const PRODUCTS_CTA = { label: 'Alle Produkte ansehen', href: '/produkte.html' };
const ROUTE_CTA = { label: 'Route öffnen', href: MAPS_URL, external: true };

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

// ---- Products ---------------------------------------------------------------

export interface ProductAnswer extends BotReply {
  productIds: string[];
  categoryId?: string;
  offer?: ChatContext['offer'];
}

function priceReply(products: Product[]): string {
  const available = products.filter(isAvailable);
  const priced = available.filter((product) => product.price != null);
  if (!priced.length) return M.priceMissing;
  if (priced.length === 1 && available.length === 1) return `${getProductName(priced[0])} kostet ${formatPrice(priced[0].price as number)}. 😊`;

  const lines = priced.slice(0, MAX_FOLLOWUP_LIST).map((product) => `• ${getProductName(product)} – ${formatPrice(product.price as number)}`);
  const missing = priced.length < available.length ? `\n${M.pricesPartlyMissing}` : '';
  return `Aktuell kosten:\n${lines.join('\n')}${missing}`;
}

function categoryReply(categoryId: string, rng: Rng): { text: string; offer?: ChatContext['offer'] } {
  const category = CATEGORIES.find((entry) => entry.id === categoryId);
  const all = categoryProducts(categoryId).filter(isAvailable);
  if (!category || !all.length) return { text: 'Dazu habe ich gerade nichts hinterlegt. Frag am besten kurz unser Team vor Ort. 😊' };

  if (all.length <= MAX_LIST) return { text: `${pick(M.yesMany, rng)}\n${bulletList(all, MAX_LIST)}` };

  const children = CATEGORIES.filter((child) => child.parent === categoryId);
  if (children.length >= 2) {
    return { text: `Ja 😊 Da haben wir mehrere Bereiche:\n${children.map((child) => `• ${child.name}`).join('\n')}\nFrag gern nach einem davon!` };
  }
  const names = groupNames(all).slice(0, 4);
  return {
    text: `Wir haben unter anderem ${names.join(', ')} und weitere ${category.name}. Soll ich dir alle Sorten zeigen?`,
    offer: 'list',
  };
}

function availabilityReply(products: Product[], listRequest: boolean, rng: Rng): { text: string; offer?: ChatContext['offer'] } {
  if (products.length === 1) return { text: pick(M.yesOne, rng)(getProductName(products[0])) };

  const brand = sharedBrand(products);
  if (products.length > MAX_LIST && !listRequest) {
    const names = products.slice(0, 3).map(getProductName);
    return { text: `Ja 😊 Wir haben ${products.length} Sorten, zum Beispiel ${joinNames(names)}. Soll ich dir alle zeigen?`, offer: 'list' };
  }
  const list = bulletList(products, listRequest ? MAX_FOLLOWUP_LIST : MAX_LIST);
  if (brand && !listRequest) {
    return { text: `Ja 😊 Wir haben mehrere ${brand.replace(/ /g, '-')}-Sorten:\n${list}${products.length >= 3 ? '\nMeinst du eine bestimmte?' : ''}` };
  }
  return { text: `${pick(M.yesMany, rng)}\n${list}` };
}

function notFoundReply(result: SegmentResult, rng: Rng): string {
  const suggestion = result.suggestions.length ? ` Meinst du ${joinNames(result.suggestions.map(getProductName), 'oder')}?` : '';
  return `${pick(M.notFound, rng)(result.display)}${suggestion} ${M.askTeam}`;
}

function recommendationReply(results: SegmentResult[] | undefined, rng: Rng): { text: string; ids: string[] } {
  const hits = (results ?? []).filter((result) => result.category || result.products.length);
  const tagged = hits.length === 1 && hits[0].tagOnly;

  if (tagged) {
    const picks = hits[0].products.filter(isAvailable).slice(0, 5);
    if (picks.length) return { text: `${pick(M.yesTag, rng)}\n${bulletList(picks, 5)}`, ids: picks.map(getProductId) };
  }

  const base = hits.length ? hits.flatMap((hit) => (hit.category ? categoryProducts(hit.category.id) : hit.products)) : PRODUCTS;
  const popular = base.filter((product) => isAvailable(product) && hasTag(product, 'beliebt')).slice(0, 4);
  if (!popular.length) return { text: M.noRecommendation, ids: [] };
  return { text: `Bei uns sind aktuell besonders beliebt:\n${bulletList(popular, 4)}`, ids: popular.map(getProductId) };
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
  if (lines.length) parts.push(`${pick(M.yesThose, rng)}\n${lines.join('\n')}`);
  if (missing.length) parts.push(`${missing.join(' und ')} habe ich aktuell nicht in unserem Sortiment gefunden. ${M.askTeam}`);
  return { text: parts.join('\n'), ids };
}

export function buildProductAnswer(intent: Intent, entities: Entities, ctx: ChatContext, rng: Rng): ProductAnswer {
  const query = entities.query as ProductQuery | undefined;
  const results = entities.results ?? [];
  const finish = (text: string, ids: string[], extra: Partial<ProductAnswer> = {}): ProductAnswer => ({
    text,
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
    if (intent === 'product_price') return finish(priceReply(products), ids);
    return finish(`Aktuell haben wir:\n${bulletList(products.filter(isAvailable), MAX_FOLLOWUP_LIST)}`, ids);
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
  if (!result) return { text: pick(M.unknown, rng), productIds: [] };

  if (result.category) {
    const categoryId = result.category.id;
    if (intent === 'product_price') {
      const products = categoryProducts(categoryId);
      return finish(priceReply(products), products.filter(isAvailable).map(getProductId), { categoryId });
    }
    const { text, offer } = categoryReply(categoryId, rng);
    return finish(text, categoryProducts(categoryId).filter(isAvailable).map(getProductId), { categoryId, offer });
  }

  if (!result.products.length) return finish(notFoundReply(result, rng), [], { cta: PRODUCTS_CTA });

  const available = result.products.filter(isAvailable);
  const soldOut = result.products.filter((product) => !isAvailable(product));
  const soldOutText = soldOut.map((product) => `${getProductName(product)} ist aktuell leider nicht da.`).join(' ');
  const ids = available.map(getProductId);
  if (!available.length) return finish(soldOutText, ids);

  // Not sure enough (typo territory): ask instead of asserting.
  if (result.confidence < CONFIDENT) {
    const text =
      available.length === 1
        ? `Meinst du „${getProductName(available[0])}“? Das haben wir aktuell da. 😊`
        : `Meinst du eine dieser Sorten?\n${bulletList(available, MAX_LIST)}`;
    return finish(text, ids);
  }

  if (intent === 'product_price') return finish(priceReply(available), ids);

  const { text, offer } = availabilityReply(available, intent === 'product_variants', rng);
  return finish(soldOutText ? `${text}\n${soldOutText}` : text, ids, { offer });
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
  const variants = kind === 'morgen' ? M.greetingMorning : kind === 'abend' ? M.greetingEvening : M.greeting;
  return { text: pick(variants, rng) };
}

export const thanksReply = (rng: Rng): BotReply => ({ text: pick(M.thanks, rng) });
export const goodbyeReply = (rng: Rng): BotReply => ({ text: pick(M.goodbye, rng) });
export const unknownReply = (rng: Rng): BotReply => ({ text: pick(M.unknown, rng) });
export const helpReply = (): BotReply => ({ text: M.help });

export const addressReply = (): BotReply => ({ text: `Du findest uns in der ${ADDRESS}. 😊`, cta: ROUTE_CTA, quickReplies: quickRepliesFor('address') });
export const directionsReply = (): BotReply => ({
  text: `Wir sind in der ${ADDRESS}. Die Route findest du hier:`,
  cta: ROUTE_CTA,
  quickReplies: quickRepliesFor('directions'),
});

export function phoneReply(): BotReply {
  const text = CONTACT.phone ? `Du erreichst uns telefonisch unter ${CONTACT.phone}. 😊` : M.noPhone(ADDRESS);
  return { text, cta: CONTACT.phone ? undefined : ROUTE_CTA, quickReplies: quickRepliesFor('phone') };
}

export function contactReply(): BotReply {
  const details = [CONTACT.phone && `Telefon: ${CONTACT.phone}`, CONTACT.email && `E-Mail: ${CONTACT.email}`].filter(Boolean);
  const text = details.length ? `So erreichst du uns:\n${details.join('\n')}` : M.noContact(ADDRESS);
  return { text, cta: details.length ? undefined : ROUTE_CTA, quickReplies: quickRepliesFor('contact') };
}

export function paymentReply(): BotReply {
  const text = PAYMENT_METHODS.length ? `Bei uns kannst du bezahlen mit: ${PAYMENT_METHODS.join(', ')}. 😊` : M.noPayment;
  return { text, quickReplies: quickRepliesFor('payment_methods') };
}

export const deliveryReply = (): BotReply => ({ text: DELIVERY_INFO || M.noDelivery, quickReplies: quickRepliesFor('services') });
export const parkingReply = (): BotReply => ({ text: PARKING_INFO || M.noParking, quickReplies: quickRepliesFor('services') });
