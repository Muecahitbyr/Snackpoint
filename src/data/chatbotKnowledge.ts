// Static topics and canned texts for the SnackPoint chat assistant — no
// external AI API. Products live in ./products, opening hours in ./hours and
// the address in ./constants; the chat logic (src/components/chatbot) reads
// them from there, so each fact is maintained in exactly one place.
import { ADDRESS } from './constants';
import { services } from './services';

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

/** Topics without product data behind them: the range in general, DHL, Lotto, FAQ. */
export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'sortiment',
    keywords: [
      'sortiment', 'angebot', 'was gibt es', 'was habt ihr', 'was verkauft ihr', 'produkte', 'artikel',
      'auswahl', 'alles unter einem dach', 'was bietet ihr', 'was fuehrt ihr',
    ],
    getResponse: () =>
      'Bei uns gibt’s alles unter einem Dach 😎 Süßigkeiten, Snacks, Getränke, Zeitschriften, Tabakwaren, Lotto und einen DHL Paketshop. Frag mich einfach nach einem bestimmten Produkt!',
    cta: { label: 'Alle Produkte ansehen', href: '/produkte.html' },
  },
  {
    id: 'dhl',
    keywords: ['dhl', 'paket', 'post', 'versand', 'paketshop', 'abholen', 'abgeben', 'paeckchen', 'päckchen'],
    getResponse: () =>
      'Wir sind auch DHL Paketshop 📦 Du kannst bei uns Pakete abgeben oder abholen – schnell und ohne Schlange im Postamt.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'lotto',
    keywords: ['lotto', 'toto', 'tipp', 'tippschein', 'gewinn', 'glueck', 'glück', 'spielen'],
    getResponse: () => 'Bei uns kannst du auch Lotto spielen – Tippscheine abgeben und Gewinne prüfen.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'ihle',
    keywords: ['ihle'],
    getResponse: () => services.find((service: { target: string }) => service.target === 'ihle')?.text ?? 'Ihle gibt es bei uns im Kiosk.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'ueber-uns',
    kind: 'faq',
    keywords: ['wer seid ihr', 'wer bist du', 'ueber euch', 'ueber uns', 'was ist snackpoint', 'was ist das hier'],
    getResponse: () => `Wir sind SnackPoint in der ${ADDRESS} – Kiosk, DHL Paketshop und Lotto unter einem Dach 😎`,
  },
  {
    id: 'alter',
    kind: 'faq',
    keywords: ['ab 18', 'ab wie viel', 'ab wieviel', 'wie alt', 'mindestalter', 'ausweis', 'jugendschutz', 'alterskontrolle'],
    getResponse: () => 'Tabakwaren und Lotto gibt’s in Deutschland nur ab 18 Jahren – bring dafür bitte einen Ausweis mit.',
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
  'Was geht 😎 Ich bin der SnackPoint Assistent. Frag mich, ob wir was am Start haben (z. B. „Habt ihr blaue Takis?“), wann wir offen haben oder wo du uns findest – tipp einfach los.';
