// Product lookup for the chat assistant ("Habt ihr Gummibärchen?", "Verkauft
// ihr Kaffee?"). Built on the same catalog the /produkte page shows, plus
// search terms per product. The catalog is an illustrative range, not a live
// inventory feed — so the bot only ever says "yes" for things it knows about
// and never claims something is *not* sold; unknown items get a "ask in store".
import { allProducts, PRODUCT_CATEGORIES } from './allProducts';
import type { ChatCTA, KnowledgeEntry } from './chatbotKnowledge';

interface ProductTerms {
  /** Product title from allProducts (or an extra item defined below). */
  title: string;
  /** Matched at the start of a word: "gummibaer" also hits "Gummibärchen". */
  terms: string[];
  /** Matched only as a whole word, for short terms that would otherwise
   * collide with longer words ("eis" vs "eistee", "preis"). */
  exact?: string[];
  /** Brand names — we carry the product group, but can't promise a brand. */
  brands?: string[];
}

interface CategoryTerms {
  category: string;
  terms: string[];
}

// Everything is normalized like user input: lowercase, umlauts spelled out.
const PRODUCT_TERMS: ProductTerms[] = [
  { title: 'Fruchtgummi-Mix', terms: ['fruchtgummi', 'gummibaer', 'gummi', 'weingummi', 'lakritz', 'bearchen', 'baerchen'], brands: ['haribo', 'trolli'] },
  { title: 'Lutscher & Lollis', terms: ['lutscher', 'lolli', 'chupa'], brands: ['chupa chups'] },
  { title: 'Kaubonbons', terms: ['kaubonbon', 'bonbon', 'karamell', 'toffee'], brands: ['werther', 'storck'] },
  { title: 'Marshmallows', terms: ['marshmallow', 'mashmallow', 'schaumzucker'] },
  { title: 'Sauer-Extrem', terms: ['sauer', 'saure'] },
  { title: 'Schokoriegel-Klassiker', terms: ['schokoriegel', 'riegel', 'snickers', 'twix', 'bounty', 'kitkat', 'kit kat'], exact: ['mars'], brands: ['snickers', 'twix', 'mars', 'bounty', 'kitkat', 'kit kat', 'duplo', 'hanuta'] },
  { title: 'Kekse & Gebäck', terms: ['keks', 'cookie', 'waffel'], brands: ['oreo', 'prinzenrolle', 'leibniz'] },
  { title: 'Pralinen-Auswahl', terms: ['praline', 'konfekt'], brands: ['ferrero', 'raffaello', 'lindt'] },
  { title: 'Nuss-Schokolade', terms: ['nussschokolade', 'nuss schokolade', 'tafel', 'zartbitter', 'vollmilch', 'schokolade'], brands: ['milka', 'ritter sport', 'lindt'] },
  { title: 'Cola & Limonaden', terms: ['cola', 'limo', 'fanta', 'sprite', 'softdrink', 'brause'], brands: ['coca cola', 'pepsi', 'fanta', 'sprite', 'mezzo mix'] },
  { title: 'Energy Drinks', terms: ['energy', 'energie', 'monster', 'red bull', 'redbull', 'rockstar'], brands: ['red bull', 'redbull', 'monster', 'rockstar'] },
  { title: 'Wasser still & medium', terms: ['wasser', 'mineralwasser', 'sprudel'], brands: ['gerolsteiner', 'volvic', 'evian'] },
  { title: 'Eistee & Fruchtsäfte', terms: ['eistee', 'eis tee', 'saft', 'fruchtsaft', 'schorle', 'multivitamin'], brands: ['lipton', 'nestea', 'capri sun', 'capri-sun'] },
  { title: 'Kaffee to go', terms: ['kaffee', 'coffee', 'cappuccino', 'latte', 'espresso'] },
  { title: 'Kartoffelchips', terms: ['chips', 'kartoffelchips', 'paprikachips'], brands: ['pringles', 'lays', 'chio', 'funny frisch'] },
  { title: 'Nachos & Dips', terms: ['nacho', 'dips', 'salsa', 'tortilla'], exact: ['dip'], brands: ['doritos'] },
  { title: 'Nüsse & Studentenfutter', terms: ['nuss', 'nuesse', 'studentenfutter', 'erdnuss', 'cashew', 'mandeln', 'pistazien'] },
  { title: 'Belegte Sandwiches', terms: ['sandwich', 'belegt', 'toast'] },
  { title: 'Wraps', terms: ['wrap'] },
  { title: 'Baguettes', terms: ['baguette', 'brotchen', 'broetchen'] },
  { title: 'Frisches Gebäck', terms: ['gebaeck', 'croissant', 'teilchen', 'gebaeckstueck'] },
  { title: 'Salat to go', terms: ['salat'] },
  { title: 'Popcorn süß & salzig', terms: ['popcorn'] },
  { title: 'Eis am Stiel', terms: ['eiscreme', 'speiseeis', 'stieleis', 'eis am stiel', 'wassereis', 'magnum', 'cornetto'], exact: ['eis'] },
];

// Things the site says the shop sells, but that aren't part of the snack
// catalog on /produkte.
const EXTRA_PRODUCTS: Record<string, { emoji: string; text: string }> = {
  Zeitschriften: { emoji: '📰', text: 'Zeitschriften und Magazine findest du bei uns im Kiosk.' },
};
const EXTRA_TERMS: ProductTerms[] = [
  { title: 'Zeitschriften', terms: ['zeitschrift', 'magazin', 'zeitung', 'bravo', 'spiegel'], exact: ['heft', 'hefte'] },
];

const CATEGORY_TERMS: CategoryTerms[] = [
  { category: 'Süßigkeiten', terms: ['suessigkeit', 'suess', 'naschen', 'naschkram', 'candy'] },
  { category: 'Schokolade', terms: ['schoko'] },
  { category: 'Getränke', terms: ['getraenk', 'trinken', 'drink'] },
  { category: 'Chips & Salziges', terms: ['salziges', 'herzhaft', 'knabber'] },
  { category: 'Sandwiches & Snacks', terms: ['fruehstueck', 'mittagessen', 'essen', 'hunger'] },
];

// Phrases that mean "do you have / sell X?" — used to answer honestly when we
// don't recognise X, instead of the generic fallback.
const AVAILABILITY_PHRASES = [
  'habt ihr', 'haben sie', 'gibt es', 'gibt s', 'verkauft ihr', 'verkaufen sie',
  'fuehrt ihr', 'fuehren sie', 'bekomme ich', 'bekommt man', 'kann man kaufen',
  'im sortiment', 'habt ihr auch', 'gibts',
];

const PRODUCTS_CTA: ChatCTA = { label: 'Alle Produkte ansehen', href: '/produkte.html' };
const LOCATION_CTA: ChatCTA = { label: 'Standort ansehen', href: '#location' };
const MAX_LISTED = 4;

function hasWord(paddedInput: string, term: string, exact: boolean): boolean {
  return paddedInput.includes(exact ? ` ${term} ` : ` ${term}`);
}

interface ProductHit {
  title: string;
  emoji: string;
  text: string;
  score: number;
  /** The brand the user asked for, if they named one. */
  brand?: string;
}

function findProducts(paddedInput: string): ProductHit[] {
  const catalog = new Map(allProducts.map((p) => [p.title, p]));
  const hits: ProductHit[] = [];

  for (const def of [...PRODUCT_TERMS, ...EXTRA_TERMS]) {
    let score = 0;
    for (const term of def.terms) if (hasWord(paddedInput, term, false)) score = Math.max(score, term.length);
    for (const term of def.exact ?? []) if (hasWord(paddedInput, term, true)) score = Math.max(score, term.length);
    const brand = def.brands?.find((b) => hasWord(paddedInput, b, false));
    if (brand) score = Math.max(score, brand.length);
    if (!score) continue;

    const item = catalog.get(def.title) ?? EXTRA_PRODUCTS[def.title];
    if (!item) continue;
    hits.push({ title: def.title, emoji: item.emoji, text: item.text, score, brand });
  }

  return hits.sort((a, b) => b.score - a.score);
}

function findCategory(paddedInput: string): string | null {
  for (const def of CATEGORY_TERMS) {
    if (def.terms.some((term) => hasWord(paddedInput, term, false))) return def.category;
  }
  return null;
}

function titleCase(text: string): string {
  return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

function productEntry(hits: ProductHit[]): KnowledgeEntry {
  const shown = hits.slice(0, MAX_LISTED);
  const branded = shown.filter((h) => h.brand);

  const getResponse = () => {
    // A named brand isn't a promise — only claim the product group, then add
    // the "ask in store" note below.
    let reply: string;
    if (branded.length) {
      reply = `Passend dazu haben wir:\n${shown.map((h) => `${h.emoji} ${h.title} – ${h.text}`).join('\n')}`;
    } else if (shown.length === 1) {
      const [hit] = shown;
      reply = `Ja! ${hit.emoji} ${hit.title}: ${hit.text}`;
    } else {
      reply = `Ja, das findest du bei uns:\n${shown.map((h) => `${h.emoji} ${h.title} – ${h.text}`).join('\n')}`;
    }
    if (branded.length) {
      const names = [...new Set(branded.map((h) => titleCase(h.brand as string)))].join(', ');
      reply += `\n\nOb genau ${names} gerade vorrätig ist, kann ich dir nicht garantieren — frag dafür am besten kurz im Laden nach.`;
    }
    return reply;
  };

  return { id: 'produkt-suche', keywords: [], getResponse, cta: branded.length ? LOCATION_CTA : PRODUCTS_CTA };
}

function categoryEntry(category: string): KnowledgeEntry {
  const items = allProducts.filter((p) => p.category === category);
  return {
    id: `kategorie-${category}`,
    keywords: [],
    getResponse: () =>
      `Ja, in der Kategorie „${category}" haben wir zum Beispiel:\n${items
        .map((p) => `${p.emoji} ${p.title}`)
        .join('\n')}`,
    cta: PRODUCTS_CTA,
  };
}

const UNKNOWN_PRODUCT_ENTRY: KnowledgeEntry = {
  id: 'produkt-unbekannt',
  keywords: [],
  getResponse: () =>
    'Da bin ich mir leider nicht sicher — mein Überblick deckt nicht jeden einzelnen Artikel ab. Am besten fragst du kurz direkt bei uns im Laden nach oder schaust dir die Produktübersicht an.',
  cta: PRODUCTS_CTA,
};

/** `normalizedInput` must already be normalized (see chatbotUtils). Returns a
 * product/category answer, or null when the message isn't about a product we
 * recognise. */
export function matchProduct(normalizedInput: string): KnowledgeEntry | null {
  const padded = ` ${normalizedInput} `;

  const hits = findProducts(padded);
  if (hits.length) return productEntry(hits);

  const category = findCategory(padded);
  if (category && PRODUCT_CATEGORIES.includes(category)) return categoryEntry(category);

  return null;
}

/** "Habt ihr X?" where X isn't known — better an honest "ask in store" than
 * the generic fallback. Only used after all other matchers came up empty. */
export function matchUnknownProductQuestion(normalizedInput: string): KnowledgeEntry | null {
  const padded = ` ${normalizedInput} `;
  return AVAILABILITY_PHRASES.some((phrase) => padded.includes(` ${phrase} `)) ? UNKNOWN_PRODUCT_ENTRY : null;
}
