// Every editable text and image of the website: its key, where it appears
// and its original wording (written into the database by `npm run db:seed`).
// The admin's "Webseiteninhalte" page is built from this list, and the public
// API only hands out these keys.

export const CONTENT_SECTIONS = [
  {
    id: 'brand',
    title: 'Allgemein',
    description: 'Name und Logo — erscheinen in Kopfzeile, Fußzeile und auf der Startseite.',
    fields: [
      { key: 'brand.name', label: 'Kurzname (Kopfzeile)', type: 'text', default: 'SnackPoint' },
      { key: 'brand.fullName', label: 'Vollständiger Name (Fußzeile)', type: 'text', default: 'SnackPoint Kaufbeuren' },
      { key: 'brand.logo', label: 'Logo', type: 'image' },
    ],
  },
  {
    id: 'hero',
    title: 'Startseite – Kopfbereich',
    description: 'Der große Bereich ganz oben auf der Startseite.',
    fields: [
      { key: 'hero.eyebrow', label: 'Kleine Zeile über dem Titel', type: 'text', default: 'Kiosk · Kaufbeuren' },
      { key: 'hero.title', label: 'Titel (Graffiti-Schriftzug)', type: 'text', default: 'SnackPoint', max: 24 },
      { key: 'hero.tag', label: 'Zusatz unter dem Titel', type: 'text', default: 'Kaufbeuren', max: 30 },
      { key: 'hero.subtitle', label: 'Slogan', type: 'text', default: 'Der Kiosk, der dich zum Leben erweckt.' },
      { key: 'hero.ctaPrimary', label: 'Button 1 (zu „Neu eingetroffen“)', type: 'text', default: 'Neue Waren entdecken' },
      { key: 'hero.ctaSecondary', label: 'Button 2 (zum Standort)', type: 'text', default: 'Öffnungszeiten & Adresse' },
    ],
  },
  {
    id: 'about',
    title: 'Über uns',
    fields: [
      { key: 'about.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Über uns' },
      { key: 'about.title', label: 'Überschrift', type: 'text', default: 'Mehr als nur ein Kiosk.' },
      {
        key: 'about.text', label: 'Text', type: 'textarea',
        default:
          'Bei SnackPoint Kaufbeuren erwartet dich ein herzlicher Empfang, frische Ware und ein Service, der weit über den klassischen Kiosk hinausgeht. Ob schneller Snack zwischendurch, Paket abholen oder Lottoschein abgeben — hier bist du in besten Händen.',
      },
      { key: 'about.image', label: 'Bild', type: 'image' },
    ],
  },
  {
    id: 'services',
    title: 'Leistungen',
    description: 'Überschrift des Leistungsbereichs. Die einzelnen Leistungen bearbeitest du im Reiter „Leistungen“.',
    fields: [
      { key: 'services.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Leistungen' },
      { key: 'services.title', label: 'Überschrift', type: 'text', default: 'Alles unter einem Dach.' },
    ],
  },
  {
    id: 'promotions',
    title: 'Aktionen & Angebote',
    description: 'Erscheint auf der Startseite, sobald mindestens eine Aktion aktiv ist.',
    fields: [
      { key: 'promotions.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Aktionen' },
      { key: 'promotions.title', label: 'Überschrift', type: 'text', default: 'Nur für kurze Zeit.' },
    ],
  },
  {
    id: 'highlight',
    title: 'Zitat-Bereich',
    description: 'Das große Kundenzitat auf rotem Hintergrund.',
    fields: [
      { key: 'highlight.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Immer einen Besuch wert' },
      {
        key: 'highlight.quote', label: 'Zitat', type: 'textarea',
        default: '„Der beste Kiosk den ich je gesehen habe … man wird herzlich empfangen und hat einfach Spaß beim Einkaufen!“',
      },
      { key: 'highlight.author', label: 'Quelle', type: 'text', default: '— Can Sadri, Google Rezension ★★★★★' },
    ],
  },
  {
    id: 'new',
    title: 'Neu eingetroffen',
    description: 'Die Produkte darin sind alle Produkte mit „Auf der Startseite hervorheben“.',
    fields: [
      { key: 'new.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Neu eingetroffen' },
      { key: 'new.title', label: 'Überschrift', type: 'text', default: 'Frisch im Regal.' },
      {
        key: 'new.text', label: 'Text', type: 'textarea',
        default: 'Jede Woche neue Süßigkeiten-Trends aus aller Welt — von internationalen Klassikern bis zu den heißesten Newcomern.',
      },
      { key: 'new.tag', label: 'Graffiti-Schriftzug im Hintergrund', type: 'text', default: 'Snacks', max: 20 },
      { key: 'new.moreLink', label: 'Link zur Produktseite', type: 'text', default: 'Hier klicken, um alle Produkte zu sehen →' },
    ],
  },
  {
    id: 'events',
    title: 'Events',
    description: 'Bereich auf der Startseite (nur sichtbar, wenn Events geplant sind) und die Seite /events.',
    fields: [
      { key: 'events.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Events' },
      { key: 'events.title', label: 'Überschrift', type: 'text', default: 'Bald bei uns.' },
      { key: 'events.text', label: 'Einleitung', type: 'textarea', default: 'Aktionstage, Verkostungen und mehr — komm vorbei und feier mit uns.' },
      { key: 'events.empty', label: 'Text, wenn keine Events geplant sind', type: 'textarea', default: 'Gerade sind keine Events geplant. Schau bald wieder vorbei!' },
      { key: 'events.pastTitle', label: 'Überschrift vergangene Events', type: 'text', default: 'Das war los' },
    ],
  },
  {
    id: 'reviews',
    title: 'Bewertungen',
    description: 'Überschrift des Bewertungsbereichs. Die Bewertungen selbst bearbeitest du im Reiter „Bewertungen“.',
    fields: [
      { key: 'reviews.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Bewertungen' },
      { key: 'reviews.title', label: 'Überschrift', type: 'text', default: 'Das sagen unsere Kunden.' },
    ],
  },
  {
    id: 'location',
    title: 'Standort',
    description: 'Adresse, Öffnungszeiten und Bewertung kommen aus „Einstellungen“ bzw. „Öffnungszeiten“.',
    fields: [
      { key: 'location.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Standort' },
      { key: 'location.title', label: 'Überschrift', type: 'text', default: 'Besuch uns.' },
      { key: 'location.mapsButton', label: 'Button zu Google Maps', type: 'text', default: 'In Google Maps öffnen' },
    ],
  },
  {
    id: 'products',
    title: 'Produktseite',
    fields: [
      { key: 'products.eyebrow', label: 'Kleine Überschrift', type: 'text', default: 'Sortiment' },
      { key: 'products.title', label: 'Überschrift', type: 'text', default: 'Alle Produkte.' },
      {
        key: 'products.text', label: 'Einleitung', type: 'textarea',
        default:
          'Snacks, Getränke, Tabakwaren, Lotto und mehr — eine Auswahl aus unserem Sortiment, oft in mehreren Sorten und Marken. Genaue Verfügbarkeit direkt bei uns in Kaufbeuren.',
      },
    ],
  },
];

export const CONTENT_FIELDS = CONTENT_SECTIONS.flatMap((section) => section.fields);
export const CONTENT_FIELD_BY_KEY = new Map(CONTENT_FIELDS.map((field) => [field.key, field]));

// Settings are small JSON objects per topic; these are the starting values.
export const SETTINGS_DEFAULTS = {
  contact: {
    address: 'Neugablonzer Str. 25, 87600 Kaufbeuren',
    phone: '',
    email: '',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Snack+Point+Kaufbeuren+Neugablonzer+Str.+25+87600+Kaufbeuren',
    mapsEmbedUrl: 'https://maps.google.com/maps?q=Snack+Point+Kaufbeuren,+Neugablonzer+Str.+25,+87600+Kaufbeuren&output=embed',
  },
  social: { instagram: '', facebook: '', tiktok: '', whatsapp: '', google: '' },
  rating: { value: 4.9, count: 48 },
  info: { paymentMethods: [], deliveryInfo: '', parkingInfo: '' },
  events: { autoArchive: true, showPast: false },
  // Impressum / Datenschutzerklärung. Empty fields show a placeholder there.
  legal: { operator: '', legalForm: '', representative: '', vatId: '', register: '', responsible: '' },
};
