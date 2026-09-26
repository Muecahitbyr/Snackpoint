// Static topics and canned texts for the SnackPoint chat assistant — no
// external AI API. Products live in ./products, opening hours in ./hours and
// the address in ./constants; the chat logic (src/components/chatbot) reads
// them from there, so each fact is maintained in exactly one place.

export interface ChatCTA {
  label: string;
  href: string;
  external?: boolean;
}

export interface KnowledgeEntry {
  id: string;
  /** Lowercase keyword/phrase fragments (umlauts written out, e.g. "oeffnungszeit")
   * — matched against user input normalized the same way (see text.ts). */
  keywords: string[];
  getResponse: () => string;
  cta?: ChatCTA;
}

export interface QuickAction {
  id: string;
  label: string;
  /** Sent through the chat logic as if the user had typed it. */
  query: string;
}

/** Topics without product data behind them: the range in general, DHL, Lotto. */
export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'sortiment',
    keywords: [
      'sortiment', 'angebot', 'was gibt es', 'was habt ihr', 'was verkauft ihr', 'produkte', 'artikel',
      'auswahl', 'alles unter einem dach', 'was bietet ihr', 'was fuehrt ihr',
    ],
    getResponse: () =>
      'Bei SnackPoint gibt es alles unter einem Dach: Süßigkeiten, Snacks, Getränke, Zeitschriften, Tabakwaren, Lotto und einen DHL Paketshop. Frag mich gern nach einem bestimmten Produkt! 😊',
    cta: { label: 'Alle Produkte ansehen', href: '/produkte.html' },
  },
  {
    id: 'dhl',
    keywords: ['dhl', 'paket', 'post', 'versand', 'paketshop', 'abholen', 'abgeben', 'paeckchen', 'päckchen'],
    getResponse: () =>
      'Wir sind auch DHL Paketshop. Du kannst bei uns Pakete abgeben oder abholen — schnell und ohne Warteschlangen im Postamt.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'lotto',
    keywords: ['lotto', 'toto', 'tipp', 'tippschein', 'gewinn', 'glueck', 'glück', 'spielen'],
    getResponse: () => 'Bei SnackPoint kannst du auch Lotto spielen — Tippscheine abgeben und Gewinne prüfen.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-sortiment', label: 'Was gibt es im Laden?', query: 'Was habt ihr im Sortiment?' },
  { id: 'qa-hours', label: 'Öffnungszeiten', query: 'Wie sind eure Öffnungszeiten?' },
  { id: 'qa-dhl', label: 'DHL Paketshop', query: 'DHL Paketshop' },
  { id: 'qa-lotto', label: 'Lotto', query: 'Lotto' },
  { id: 'qa-tabak', label: 'Zigaretten & Tabak', query: 'Habt ihr Zigaretten?' },
  { id: 'qa-standort', label: 'Standort', query: 'Wo seid ihr?' },
];

export const GREETING_MESSAGE =
  'Hallo! Ich bin der SnackPoint Assistent. Frag mich gern, ob wir ein Produkt führen (z. B. „Habt ihr blaue Takis?“), wann wir geöffnet haben oder wo du uns findest — tippe einfach los.';

export const FALLBACK_MESSAGE =
  'Das weiß ich leider gerade nicht sicher. Frag am besten kurz unser Team vor Ort. 😊\nBei Produkten, Öffnungszeiten, Standort, DHL und Lotto helfe ich dir gern weiter.';
