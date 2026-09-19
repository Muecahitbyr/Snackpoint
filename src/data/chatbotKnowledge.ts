// Local, offline knowledge base for the SnackPoint chat assistant — no
// external AI API. Pulls opening hours / address from the same data sources
// the rest of the site uses, so there's only one place to update them.
import { ADDRESS, MAPS_URL } from './constants';
import { OPENING_HOURS, getTodayHours } from './hours';

export interface ChatCTA {
  label: string;
  href: string;
  external?: boolean;
}

export interface KnowledgeEntry {
  id: string;
  /** Lowercase keyword/phrase fragments (umlauts written out, e.g. "oeffnungszeit")
   * — matched against user input normalized the same way (see chatbotUtils). */
  keywords: string[];
  getResponse: () => string;
  cta?: ChatCTA;
}

export interface QuickAction {
  id: string;
  label: string;
  entryId: string;
}

function formatHoursList(): string {
  return OPENING_HOURS.map((entry) => `${entry.day}: ${entry.closed ? 'geschlossen' : `${entry.open} – ${entry.close}`}`).join('\n');
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'sortiment',
    keywords: [
      'sortiment', 'angebot', 'was gibt es', 'was habt ihr', 'was verkauft ihr',
      'auswahl', 'alles unter einem dach', 'was bietet ihr', 'was fuehrt ihr',
    ],
    getResponse: () =>
      'Bei SnackPoint gibt es alles unter einem Dach: Süßigkeiten, Snacks, Getränke, Zeitschriften, Tabakwaren, Lotto und einen DHL Paketshop. Frag mich gern nach einem der Themen!',
  },
  {
    id: 'suessigkeiten',
    keywords: [
      'suess', 'suß', 'süß', 'snack', 'naschen', 'schokolade', 'chips',
      'bonbon', 'hunger', 'zeitschrift',
    ],
    getResponse: () =>
      'Ja, bei uns findest du Süßigkeiten, Snacks und Kleinigkeiten für den Hunger zwischendurch — täglich frisch sortiert.',
    cta: { label: 'Leistungen ansehen', href: '#services' },
  },
  {
    id: 'getraenke',
    keywords: ['getraenk', 'getränk', 'trinken', 'durst', 'cola', 'energy', 'wasser', 'drink'],
    getResponse: () => 'Wir führen verschiedene Getränke für unterwegs — von Softdrinks bis Energydrinks.',
  },
  {
    id: 'tabak',
    keywords: ['zigarette', 'tabak', 'rauchen', 'shisha', 'zigaretten'],
    getResponse: () => 'Bei uns bekommst du Zigaretten und Tabakwaren.',
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
  {
    id: 'oeffnungszeiten',
    keywords: [
      'oeffnungszeit', 'öffnungszeit', 'offen', 'geoeffnet', 'geöffnet',
      'wann habt ihr auf', 'uhrzeit', 'geschlossen', 'wann macht ihr',
    ],
    getResponse: () => {
      const today = getTodayHours();
      const todayLine = today
        ? `Heute haben wir ${today.closed ? 'geschlossen' : `von ${today.open} bis ${today.close}`} geöffnet.\n\n`
        : '';
      return `${todayLine}Unsere Öffnungszeiten:\n${formatHoursList()}`;
    },
    cta: { label: 'Öffnungszeiten ansehen', href: '#location' },
  },
  {
    id: 'standort',
    keywords: ['wo seid', 'standort', 'adresse', 'wo finde', 'anfahrt', 'route', 'wo ist', 'wo liegt'],
    getResponse: () =>
      `Du findest uns in der ${ADDRESS}. Wenn du willst, kann ich dir auch gleich die Route in Google Maps zeigen.`,
    cta: { label: 'Route öffnen', href: MAPS_URL, external: true },
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'qa-sortiment', label: 'Was gibt es im Laden?', entryId: 'sortiment' },
  { id: 'qa-hours', label: 'Öffnungszeiten', entryId: 'oeffnungszeiten' },
  { id: 'qa-dhl', label: 'DHL Paketshop', entryId: 'dhl' },
  { id: 'qa-lotto', label: 'Lotto', entryId: 'lotto' },
  { id: 'qa-tabak', label: 'Zigaretten & Tabak', entryId: 'tabak' },
  { id: 'qa-standort', label: 'Standort', entryId: 'standort' },
];

export const GREETING_MESSAGE =
  'Hallo! Ich bin der SnackPoint Assistent. Frag mich gern nach Sortiment, Öffnungszeiten, DHL, Lotto oder unserem Standort — oder tippe einfach los.';

export const FALLBACK_MESSAGE =
  'Dabei kann ich dir leider noch nicht perfekt helfen. Du kannst mich aber zu diesen Themen fragen:\n– Sortiment\n– Süßigkeiten\n– Zigaretten & Tabak\n– DHL Paketshop\n– Lotto\n– Öffnungszeiten\n– Standort';

export function getEntryById(id: string): KnowledgeEntry | undefined {
  return KNOWLEDGE_BASE.find((entry) => entry.id === id);
}
