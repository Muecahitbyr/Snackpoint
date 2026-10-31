// Static topics and canned texts for the SnackPoint chat assistant — no
// external AI API. Products, opening hours, address and services come from
// the database via ./products, ./hours, ./constants and ./siteStore; the chat
// logic (src/components/chatbot) reads them from there, so each fact is
// maintained in exactly one place (the admin panel).
import { ADDRESS } from './constants';
import { getSite } from './siteStore';

export interface ChatCTA {
  label: string;
  href: string;
  external?: boolean;
}

export interface KnowledgeEntry {
  id: string;
  /** 'service' (default): part of the shop's offer. 'faq': a general question. */
  kind?: 'service' | 'faq';
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

/** Topics without product data behind them: the range in general, parcels (DHL, Hermes), FAQ. */
export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'sortiment',
    keywords: [
      'sortiment', 'angebot', 'was gibt es', 'was habt ihr', 'was verkauft ihr', 'produkte', 'artikel',
      'auswahl', 'alles unter einem dach', 'was bietet ihr', 'was fuehrt ihr',
    ],
    getResponse: () =>
      'Bei uns gibt’s alles unter einem Dach 😎 Süßigkeiten, Snacks, Getränke, Zeitschriften, Tabakwaren und einen DHL und Hermes Paketshop. Frag mich einfach nach einem bestimmten Produkt!',
    cta: { label: 'Alle Produkte ansehen', href: '/produkte' },
  },
  {
    // Parcels in general: both carriers.
    id: 'pakete',
    keywords: ['paket', 'versand', 'paketshop', 'abholen', 'abgeben', 'paeckchen', 'päckchen', 'retoure', 'ruecksendung'],
    getResponse: () =>
      'Wir sind DHL Paketshop und Hermes PaketShop 📦 Du kannst bei uns Pakete und Retouren abgeben oder abholen – schnell und ohne Schlange im Postamt.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'dhl',
    keywords: ['dhl', 'post', 'packstation'],
    getResponse: () =>
      'Wir sind auch DHL Paketshop 📦 Du kannst bei uns Pakete abgeben oder abholen – schnell und ohne Schlange im Postamt.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'hermes',
    keywords: ['hermes'],
    getResponse: () => 'Wir sind auch Hermes PaketShop 📦 Hermes Pakete und Retouren kannst du bei uns abgeben oder abholen.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'ueber-uns',
    kind: 'faq',
    keywords: ['wer seid ihr', 'wer bist du', 'ueber euch', 'ueber uns', 'was ist snackpoint', 'was ist das hier'],
    getResponse: () => `Wir sind SnackPoint in der ${ADDRESS} – Kiosk, DHL und Hermes Paketshop unter einem Dach 😎`,
  },
  {
    id: 'alter',
    kind: 'faq',
    keywords: ['ab 18', 'ab wie viel', 'ab wieviel', 'wie alt', 'mindestalter', 'ausweis', 'jugendschutz', 'alterskontrolle'],
    getResponse: () => 'Tabakwaren und Mischgetränke mit Spirituosen gibt’s in Deutschland nur ab 18 Jahren, Bier ab 16 – bring dafür bitte einen Ausweis mit.',
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-sortiment', label: 'Was gibt es im Laden?', query: 'Was habt ihr im Sortiment?' },
  { id: 'qa-hours', label: 'Öffnungszeiten', query: 'Wie sind eure Öffnungszeiten?' },
  { id: 'qa-dhl', label: 'DHL Paketshop', query: 'DHL Paketshop' },
  { id: 'qa-hermes', label: 'Hermes PaketShop', query: 'Hermes' },
  { id: 'qa-tabak', label: 'Zigaretten & Tabak', query: 'Habt ihr Zigaretten?' },
  { id: 'qa-standort', label: 'Standort', query: 'Wo seid ihr?' },
];

export const GREETING_MESSAGE =
  'Was geht 😎 Ich bin der SnackPoint Assistent. Frag mich, ob wir was am Start haben (z. B. „Habt ihr blaue Takis?“), wann wir offen haben oder wo du uns findest – tipp einfach los.';
