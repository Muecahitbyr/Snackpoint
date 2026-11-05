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
  'hero.ctaPrimary': 'Neu im Regal',
  'hero.ctaSecondary': 'Öffnungszeiten & Adresse',
  // Über uns
  'about.eyebrow': 'Über uns',
  'about.title': 'Dein Kiosk in Kaufbeuren.',
  'about.text': 'SnackPoint ist ein Kiosk in der Neugablonzer Straße. Bei uns holst du dir Snacks, Süßes, Getränke oder einen Kaffee to go. Hermes-Pakete kannst du hier abgeben und abholen, und Lotto spielen geht auch. Schau einfach vorbei.',
  'about.image': '/logo.jpg',
  // Leistungen
  'services.eyebrow': 'Leistungen',
  'services.title': 'Das bekommst du bei uns.',
  // Aktionen & Angebote
  'promotions.eyebrow': 'Aktionen',
  'promotions.title': 'Nur für kurze Zeit.',
  // Zitat-Bereich
  'highlight.eyebrow': 'Immer einen Besuch wert',
  'highlight.quote': '„Der beste Kiosk den ich je gesehen habe … man wird herzlich empfangen und hat einfach Spaß beim Einkaufen!“',
  'highlight.author': 'Can S., Google-Rezension ★★★★★',
  // Neu eingetroffen
  'new.eyebrow': 'Neu eingetroffen',
  'new.title': 'Frisch im Regal.',
  'new.text': 'Ein paar Sachen, die gerade neu bei uns sind. Alles andere findest du auf der Produktseite.',
  'new.tag': 'Snacks',
  'new.moreLink': 'Alle Produkte ansehen →',
  // Wunschliste (product wishes)
  'wishes.eyebrow': 'Wunschliste',
  'wishes.title': 'Was fehlt dir?',
  'wishes.text': 'Du vermisst einen Snack, ein Getränk oder eine Marke? Schreib es uns. Die beliebtesten Wünsche holen wir in den Laden.',
  'wishes.listTitle': 'Das wünscht ihr euch',
  'wishes.empty': 'Noch keine Wünsche in der Liste. Schreib uns deinen!',
  // Events
  'events.eyebrow': 'Events',
  'events.title': 'Bald bei uns.',
  'events.text': 'Hier stehen unsere nächsten Aktionen. Komm vorbei!',
  // Bewertungen
  'reviews.eyebrow': 'Bewertungen',
  'reviews.title': 'Das sagen unsere Kunden.',
  // Information on how the reviews are checked (§ 5b Abs. 3 UWG).
  'reviews.note': 'Ausgewählte Bewertungen aus unserem Google-Profil, gekürzt auf Vorname und Initial. Wir prüfen nicht, ob die Verfasser bei uns eingekauft haben.',
  // Social Media (TikTok + Instagram as two phones)
  'social.eyebrow': 'Social Media',
  'social.title': 'Folg uns.',
  'social.text': 'Neue Snacks, Drinks und alles, was gerade im Laden los ist: zuerst auf TikTok und Instagram.',
  // Standort
  'location.eyebrow': 'Standort',
  'location.title': 'Besuch uns.',
  'location.mapsButton': 'In Google Maps öffnen',
  // Produktseite
  'products.eyebrow': 'Sortiment',
  'products.title': 'Alle Produkte.',
  'products.text': 'Hier siehst du einen Teil von unserem Sortiment: Snacks, Süßes, Getränke, Essen to go und Spielzeug. Vieles gibt es in mehreren Sorten. Ob gerade alles da ist, erfährst du bei uns im Laden.',
};

// Address, contact, links and legal details (Impressum / Datenschutz).
export const SETTINGS = {
  // Public address of the website: canonical links, sitemap.xml, robots.txt,
  // link previews and structured data are built from it (scripts/prerender.mjs,
  // worker/index.js). Change it once the own domain is live. A local test
  // build can override it: VITE_SITE_URL=http://localhost:8790 npm run build
  siteUrl: (import.meta.env?.VITE_SITE_URL || 'https://snackpointkf.de').replace(/\/$/, ''),
  contact: {
    address: 'Neugablonzer Str. 25, 87600 Kaufbeuren',
    phone: '0177 4657426',
    email: 'saginsq7@icloud.com',
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Snack+Point+Kaufbeuren+Neugablonzer+Str.+25+87600+Kaufbeuren',
    mapsEmbedUrl: 'https://maps.google.com/maps?q=Snack+Point+Kaufbeuren,+Neugablonzer+Str.+25,+87600+Kaufbeuren&output=embed',
  },
  // Empty links are not shown (footer).
  social: {
    instagram: 'https://www.instagram.com/snackpointkf',
    facebook: '',
    tiktok: 'https://www.tiktok.com/@snackpoint13',
    whatsapp: '',
    google: '',
  },
  // Google rating shown in the hero and the location section.
  rating: {
    value: 4.9,
    count: 58,
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
// badge = optional diagonal ticker, e.g. 'BALD VERFÜGBAR'. note = small print
// below the text (e.g. the legally required gambling notice for Lotto).
export const SERVICES = [
  {
    id: 'kiosk',
    icon: '🍫',
    logo: '/logo.jpg',
    gradient: 'red',
    title: 'Kiosk',
    text: 'Süßigkeiten, Snacks, Getränke, Kaffee to go und Zeitschriften.',
  },
  {
    id: 'hermes',
    icon: '🚚',
    logo: '/logos/hermes.png',
    gradient: 'gold',
    title: 'Hermes PaketShop',
    text: 'Hermes-Pakete und Retouren gibst du bei uns ab, deine Sendungen holst du hier ab.',
  },
  {
    id: 'lotto',
    icon: '🎰',
    logo: '/logos/lotto.png',
    gradient: 'deep',
    title: 'Lotto',
    text: 'Offizielle Lotto-Annahmestelle: Tippschein abgeben und Gewinne prüfen lassen.',
    note: 'Spielteilnahme ab 18 Jahren. Glücksspiel kann süchtig machen. Hilfe: BZgA 0800 1 37 27 00 (kostenlos).',
  },
];

// Google reviews in the marquee. Reviewers appear as first name + initial only.
export const REVIEWS = [
  {
    id: 'review-1',
    name: 'Sabri S.',
    initials: 'SS',
    color: '#9a6a00',
    time: 'vor einem Monat',
    text: 'Das Café ist wirklich sehr schön. Das Personal ist freundlich und kümmert sich gut um die Kunden. Die Produkte sind frisch, besonders der Kaffee ist sehr lecker. Ich kann das Café nur weiterempfehlen.',
  },
  {
    id: 'review-2',
    name: 'Cigdem F.',
    initials: 'CF',
    color: '#e0201f',
    time: 'vor 2 Monaten',
    text: 'Super netter Typ. Kann man negativ gelaunt rein, kommt positiv gelaunt wieder. Sagin gibt einfach schöne Energie von sich. 😊',
  },
  {
    id: 'review-3',
    name: 'Sarah P.',
    initials: 'SP',
    color: '#c4181c',
    time: 'vor 5 Monaten',
    text: 'Einfach top! Mein Mann und ich gehen sehr gerne hin, Päckchen abgeben und abholen. Soo nett und beide immer super freundlich! So macht es Spaß.',
  },
  {
    id: 'review-4',
    name: 'Can S.',
    initials: 'CS',
    color: '#946b12',
    time: 'vor 2 Monaten',
    text: 'Der beste Kiosk den ich je gesehen habe … man wird herzlich empfangen und hat einfach Spaß beim Einkaufen! Immer einen Besuch wert. Top top top 👍',
  },
  {
    id: 'review-5',
    name: 'Moritz B.',
    initials: 'MB',
    color: '#7a0000',
    time: 'vor 3 Monaten',
    text: 'Die Mitarbeiter sind nett und der Kundenservice ist ideal. Ebenfalls fühle ich mich sehr wohl im Laden.',
  },
];
