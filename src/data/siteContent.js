// Texts, contact details, services and reviews of the website — maintained
// here in code (the admin panel only handles products, events, banners,
// promotions, media and opening hours). Edit, commit, push: Cloudflare
// deploys the change automatically.

// Headings and texts, grouped by section of the page.
export const CONTENT = {
  // Allgemein
  'brand.name': 'SnackPoint',
  'brand.fullName': 'SnackPoint Kaufbeuren',
  'brand.logo': '/logo.jpg',
  // Startseite – Kopfbereich
  'hero.eyebrow': 'Kiosk · Kaufbeuren',
  'hero.title': 'SnackPoint',
  'hero.tag': 'Kaufbeuren',
  'hero.subtitle': 'Der Kiosk, der dich zum Leben erweckt.',
  'hero.ctaPrimary': 'Neue Waren entdecken',
  'hero.ctaSecondary': 'Öffnungszeiten & Adresse',
  // Über uns
  'about.eyebrow': 'Über uns',
  'about.title': 'Mehr als nur ein Kiosk.',
  'about.text': 'Bei SnackPoint Kaufbeuren erwartet dich ein herzlicher Empfang, frische Ware und ein Service, der weit über den klassischen Kiosk hinausgeht. Ob schneller Snack zwischendurch, Paket abholen oder Lottoschein abgeben: Hier bist du in besten Händen.',
  'about.image': '/logo.jpg',
  // Leistungen
  'services.eyebrow': 'Leistungen',
  'services.title': 'Alles unter einem Dach.',
  // Aktionen & Angebote
  'promotions.eyebrow': 'Aktionen',
  'promotions.title': 'Nur für kurze Zeit.',
  // Zitat-Bereich
  'highlight.eyebrow': 'Immer einen Besuch wert',
  'highlight.quote': '„Der beste Kiosk den ich je gesehen habe … man wird herzlich empfangen und hat einfach Spaß beim Einkaufen!“',
  'highlight.author': '— Can Sadri, Google Rezension ★★★★★',
  // Neu eingetroffen
  'new.eyebrow': 'Neu eingetroffen',
  'new.title': 'Frisch im Regal.',
  'new.text': 'Jede Woche neue Süßigkeiten-Trends aus aller Welt, von internationalen Klassikern bis zu den heißesten Newcomern.',
  'new.tag': 'Snacks',
  'new.moreLink': 'Hier klicken, um alle Produkte zu sehen →',
  // Wunschliste (product wishes)
  'wishes.eyebrow': 'Wunschliste',
  'wishes.title': 'Was fehlt dir?',
  'wishes.text': 'Du vermisst einen Snack, ein Getränk oder eine Marke? Schreib es uns. Die beliebtesten Wünsche holen wir in den Laden.',
  'wishes.listTitle': 'Das wünscht ihr euch',
  'wishes.empty': 'Noch keine Wünsche in der Liste. Schreib uns deinen!',
  // Events
  'events.eyebrow': 'Events',
  'events.title': 'Bald bei uns.',
  'events.text': 'Aktionstage, Verkostungen und mehr — komm vorbei und feier mit uns.',
  // Bewertungen
  'reviews.eyebrow': 'Bewertungen',
  'reviews.title': 'Das sagen unsere Kunden.',
  // Standort
  'location.eyebrow': 'Standort',
  'location.title': 'Besuch uns.',
  'location.mapsButton': 'In Google Maps öffnen',
  // Produktseite
  'products.eyebrow': 'Sortiment',
  'products.title': 'Alle Produkte.',
  'products.text': 'Snacks, Getränke, Tabakwaren, Lotto und mehr. Eine Auswahl aus unserem Sortiment, oft in mehreren Sorten und Marken. Genaue Verfügbarkeit direkt bei uns in Kaufbeuren.',
};

// Address, contact, links and legal details (Impressum / Datenschutz).
export const SETTINGS = {
  // Public address of the website: canonical links, sitemap.xml, robots.txt,
  // link previews and structured data are built from it (scripts/prerender.mjs,
  // worker/index.js). Change it once the own domain is live. A local test
  // build can override it: VITE_SITE_URL=http://localhost:8790 npm run build
  siteUrl: (import.meta.env?.VITE_SITE_URL || 'https://snackpoint.mucahitbayar.workers.dev').replace(/\/$/, ''),
  contact: {
    address: 'Neugablonzer Str. 25, 87600 Kaufbeuren',
    phone: '0177 4657426',
    email: '',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Snack+Point+Kaufbeuren+Neugablonzer+Str.+25+87600+Kaufbeuren',
    mapsEmbedUrl: 'https://maps.google.com/maps?q=Snack+Point+Kaufbeuren,+Neugablonzer+Str.+25,+87600+Kaufbeuren&output=embed',
  },
  // Empty links are not shown (footer).
  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
    whatsapp: '',
    google: '',
  },
  // Google rating shown in the hero and the location section.
  rating: {
    value: 4.9,
    count: 48,
  },
  // Answers of the chat assistant; empty = it says it does not know.
  info: {
    paymentMethods: [],
    deliveryInfo: '',
    parkingInfo: '',
  },
  // Impressum: operator, legal form, representative (GmbH/UG), VAT ID and register
  // only if they exist; responsible = person responsible for the content (§ 18 MStV).
  legal: {
    operator: 'Bilal Ergül',
    legalForm: '',
    representative: '',
    vatId: '',
    register: '',
    responsible: '',
  },
};

// The service cards ("Leistungen").
// badge = optional diagonal ticker, e.g. 'BALD VERFÜGBAR'.
export const SERVICES = [
  {
    id: 'kiosk',
    icon: '🍫',
    logo: '/logo.jpg',
    gradient: 'red',
    title: 'Kiosk',
    text: 'Süßigkeiten, Getränke, Zeitschriften und alles für den kleinen Hunger täglich frisch sortiert.',
  },
  {
    id: 'dhl',
    icon: '📦',
    logo: '/logos/dhl.png',
    gradient: 'gold',
    title: 'DHL Paketshop',
    text: 'Pakete abgeben und abholen — schnell, freundlich und unkompliziert, ganz ohne Warteschlangen im Postamt.',
  },
  {
    id: 'lotto',
    icon: '🎰',
    logo: '/logos/lotto.png',
    gradient: 'deep',
    title: 'Lotto',
    text: 'Offizielle Lotto-Annahmestelle: Tippscheine abgeben, Gewinne prüfen und dein Glück versuchen.',
  },
];

// Google reviews in the marquee.
export const REVIEWS = [
  {
    id: 'review-1',
    name: 'sabri can soyalp',
    initials: 'SS',
    color: '#f0ac23',
    time: 'vor einem Monat',
    text: 'Das Café ist wirklich sehr schön. Das Personal ist freundlich und kümmert sich gut um die Kunden. Die Produkte sind frisch, besonders der Kaffee ist sehr lecker. Ich kann das Café nur weiterempfehlen.',
  },
  {
    id: 'review-2',
    name: 'Cigdem Fidan',
    initials: 'CF',
    color: '#e0201f',
    time: 'vor 2 Monaten',
    text: 'Super netter Typ. Kann man negativ gelaunt rein, kommt positiv gelaunt wieder. Sagin gibt einfach schöne Energie von sich. 😊',
  },
  {
    id: 'review-3',
    name: 'Sarah Petzold',
    initials: 'SP',
    color: '#c4181c',
    time: 'vor 5 Monaten',
    text: 'Einfach top! Mein Mann und ich gehen sehr gerne hin, Päckchen abgeben und abholen. Soo nett und beide immer super freundlich! So macht es Spaß.',
  },
  {
    id: 'review-4',
    name: 'Can Sadri',
    initials: 'CS',
    color: '#b9861f',
    time: 'vor 2 Monaten',
    text: 'Der beste Kiosk den ich je gesehen habe … man wird herzlich empfangen und hat einfach Spaß beim Einkaufen! Immer einen Besuch wert. Top top top 👍',
  },
  {
    id: 'review-5',
    name: 'Moritz Betz',
    initials: 'MB',
    color: '#7a0000',
    time: 'vor 3 Monaten',
    text: 'Die Mitarbeiter sind nett und der Kundenservice ist ideal. Ebenfalls fühle ich mich sehr wohl im Laden.',
  },
];
