// The website's original content, moved here from the old static files in
// src/data/. `npm run db:seed` writes it into an empty database once; after
// that the database is the only source and everything is edited in /admin.

// Übergruppen with their categories, in display order. chat = the chat
// assistant topic (null = the chat answers these through its own topics).
export const GROUPS = [
  {
    slug: 'snacks', name: 'Snacks & Süßes', emoji: '🍫',
    categories: [
      { name: 'Süßigkeiten', chat: 'suessigkeiten' },
      { name: 'Schokolade', chat: 'schokolade' },
      { name: 'Chips & Salziges', chat: 'chips' },
      { name: 'Popcorn & Eis', chat: 'snacks' },
    ],
  },
  {
    slug: 'getraenke', name: 'Getränke', emoji: '🥤',
    categories: [
      { name: 'Softdrinks & Wasser', chat: 'getraenke' },
      { name: 'Energy Drinks', chat: 'energy' },
      { name: 'Kaffee', chat: 'getraenke' },
    ],
  },
  {
    slug: 'essen', name: 'Essen to go', emoji: '🥪',
    categories: [{ name: 'Sandwiches & Snacks', chat: 'belegtes' }],
  },
  {
    slug: 'tabak', name: 'Tabak & Rauchen', emoji: '🚬', ageRestricted: true,
    notice: 'Abgabe von Tabakwaren und E-Zigaretten nur an Personen ab 18 Jahren — bitte Ausweis bereithalten.',
    categories: [
      { name: 'Zigaretten', chat: null },
      { name: 'Tabak', chat: null },
      { name: 'E-Zigaretten', chat: null },
      { name: 'Raucherbedarf', chat: null },
    ],
  },
  {
    slug: 'lotto', name: 'Lotto & Rubbellose', emoji: '🍀', ageRestricted: true,
    notice: 'Spielteilnahme ab 18 Jahren. Glücksspiel kann süchtig machen. Hilfe & Infos: BZgA-Hotline 0800 1 37 27 00 (kostenlos & anonym).',
    categories: [
      { name: 'Lotterien', chat: null },
      { name: 'Rubbellose & Wetten', chat: null },
      { name: 'Lotto-Service', chat: null },
    ],
  },
  {
    slug: 'service', name: 'Zeitschriften & Service', emoji: '📰',
    categories: [
      { name: 'Zeitschriften & Zeitungen', chat: 'zeitschriften' },
      { name: 'Guthabenkarten', chat: 'guthaben' },
      { name: 'DHL Paketshop', chat: null },
    ],
  },
];

// The /produkte catalog, in display order. `terms`/`tags` are the chat
// assistant's search words and properties for the product.
export const CATALOG_PRODUCTS = [
  // Snacks & Süßes
  { emoji: '🍬', category: 'Süßigkeiten', name: 'Fruchtgummi-Mix', description: 'Bärchen, Colas & saure Mischungen für jeden Geschmack.', terms: ['gummi', 'gummibärchen', 'weingummi', 'lakritz', 'bärchen'], tags: ['suess', 'beliebt'] },
  { emoji: '🍭', category: 'Süßigkeiten', name: 'Lutscher & Lollis', description: 'Bunte Lutscher in Frucht- und Colageschmack.', terms: ['lolli', 'lutscher'], tags: ['suess'] },
  { emoji: '🍡', category: 'Süßigkeiten', name: 'Kaubonbons', description: 'Weiche Kaubonbons in Frucht- und Milchsorten.', terms: ['bonbon', 'karamell', 'toffee'], tags: ['suess'] },
  { emoji: '🧁', category: 'Süßigkeiten', name: 'Marshmallows', description: 'Fluffige Marshmallows pur oder überzogen.', terms: ['schaumzucker'], tags: ['suess'] },
  { emoji: '🍋', category: 'Süßigkeiten', name: 'Sauer-Extrem', description: 'Für alle, die es richtig sauer mögen.', terms: ['sauer', 'saure'], tags: ['sauer'] },
  { emoji: '🍫', category: 'Schokolade', name: 'Schokoriegel-Klassiker', description: 'Die bekanntesten Riegel, immer griffbereit.', terms: ['riegel'], tags: ['suess', 'beliebt'] },
  { emoji: '🍪', category: 'Schokolade', name: 'Kekse & Gebäck', description: 'Knusprige Kekse pur oder mit Schokolade.', terms: ['keks', 'cookie', 'waffel'], tags: ['suess'] },
  { emoji: '🎁', category: 'Schokolade', name: 'Pralinen-Auswahl', description: 'Feine Pralinen für besondere Momente.', terms: ['praline', 'konfekt'], tags: ['suess'] },
  { emoji: '🌰', category: 'Schokolade', name: 'Nuss-Schokolade', description: 'Vollmilch- und Zartbitterschokolade mit Nüssen.', terms: ['tafel', 'zartbitter', 'vollmilch'], tags: ['suess'] },
  { emoji: '🥔', category: 'Chips & Salziges', name: 'Kartoffelchips', description: 'Knusprige Chips in vielen Geschmacksrichtungen.', terms: ['chips', 'paprikachips'], tags: ['salzig', 'beliebt'] },
  { emoji: '🌽', category: 'Chips & Salziges', name: 'Nachos & Dips', description: 'Knusprige Nachos mit cremigen Dips.', terms: ['nacho', 'dip', 'salsa', 'tortilla'], tags: ['salzig'] },
  { emoji: '🥜', category: 'Chips & Salziges', name: 'Nüsse & Studentenfutter', description: 'Herzhafte Snacks für zwischendurch.', terms: ['nuss', 'erdnuss', 'cashew', 'mandeln', 'pistazien'], tags: ['salzig'] },
  { emoji: '🍿', category: 'Popcorn & Eis', name: 'Popcorn süß & salzig', description: 'Der Snack-Klassiker fürs Kino-Feeling zuhause.', terms: ['popcorn'], tags: ['suess', 'salzig'] },
  { emoji: '🍦', category: 'Popcorn & Eis', name: 'Eis am Stiel', description: 'Erfrischende Eis-Klassiker für heiße Tage.', terms: ['eis', 'eiscreme', 'speiseeis'], tags: ['kalt', 'suess'] },

  // Getränke
  { emoji: '🥤', category: 'Softdrinks & Wasser', name: 'Cola & Limonaden', description: 'Klassiker und Trendsorten, eiskalt.', terms: ['limo', 'fanta', 'sprite', 'softdrink', 'brause'], tags: ['kalt', 'beliebt'] },
  { emoji: '💧', category: 'Softdrinks & Wasser', name: 'Wasser still & medium', description: 'Erfrischung ganz ohne Zucker.', terms: ['mineralwasser', 'sprudel'], tags: ['kalt'] },
  { emoji: '🧃', category: 'Softdrinks & Wasser', name: 'Eistee & Fruchtsäfte', description: 'Fruchtig-erfrischend für unterwegs.', terms: ['eistee', 'saft', 'fruchtsaft', 'schorle'], tags: ['kalt'] },
  // Superseded in the chat by the branded energy drinks below.
  { emoji: '⚡', category: 'Energy Drinks', name: 'Energy Drinks', description: 'Für den Extra-Kick zwischendurch.', inChat: false },
  { emoji: '☕', category: 'Kaffee', name: 'Kaffee to go', description: 'Heißer Kaffee, direkt aus dem Automaten.', terms: ['coffee', 'cappuccino', 'latte', 'espresso'], tags: ['heiss'] },

  // Essen to go
  { emoji: '🥪', category: 'Sandwiches & Snacks', name: 'Belegte Sandwiches', description: 'Frisch belegte Sandwiches für den kleinen Hunger zwischendurch.', terms: ['sandwich', 'toast'] },
  { emoji: '🌯', category: 'Sandwiches & Snacks', name: 'Wraps', description: 'Herzhafte Wraps in mehreren Variationen.', terms: ['wrap'] },
  { emoji: '🥖', category: 'Sandwiches & Snacks', name: 'Baguettes', description: 'Knusprige Baguettes, frisch belegt.', terms: ['baguette', 'brötchen'] },
  { emoji: '🥐', category: 'Sandwiches & Snacks', name: 'Frisches Gebäck', description: 'Croissants & Gebäck für den Snack unterwegs.', terms: ['gebäck', 'croissant', 'teilchen'] },
  { emoji: '🥗', category: 'Sandwiches & Snacks', name: 'Salat to go', description: 'Frischer Salat für die schnelle, leichte Mahlzeit.', terms: ['salat'] },

  // Tabak & Rauchen
  { emoji: '🚬', category: 'Zigaretten', name: 'Zigaretten', description: 'Gängige Marken als Schachtel und im größeren Format.' },
  { emoji: '🎩', category: 'Zigaretten', name: 'Zigarillos & Zigarren', description: 'Eine kleine Auswahl an Zigarillos und Zigarren.' },
  { emoji: '🍂', category: 'Tabak', name: 'Drehtabak', description: 'Feinschnitt zum Selberdrehen in verschiedenen Sorten.' },
  { emoji: '🫙', category: 'Tabak', name: 'Stopftabak', description: 'Volumentabak zum Stopfen von Hülsen.' },
  { emoji: '💨', category: 'E-Zigaretten', name: 'E-Zigaretten & Vapes', description: 'Einweg- und Pod-Systeme in verschiedenen Ausführungen.' },
  { emoji: '🧪', category: 'E-Zigaretten', name: 'Liquids & Pods', description: 'Nachfüllbehälter und Pods für gängige Geräte.' },
  { emoji: '📜', category: 'Raucherbedarf', name: 'Papers & Filter', description: 'Blättchen, Filter und Filtertips.' },
  { emoji: '🧰', category: 'Raucherbedarf', name: 'Hülsen & Stopfer', description: 'Zigarettenhülsen und Stopfmaschinen zum Selberstopfen.' },
  { emoji: '🔥', category: 'Raucherbedarf', name: 'Feuerzeuge & Streichhölzer', description: 'Einweg- und Sturmfeuerzeuge, Streichhölzer.' },

  // Lotto & Rubbellose
  { emoji: '🎱', category: 'Lotterien', name: 'LOTTO 6aus49', description: 'Der Klassiker — Ziehung jeden Mittwoch und Samstag.' },
  { emoji: '🇪🇺', category: 'Lotterien', name: 'Eurojackpot', description: 'Die europäische Lotterie — Ziehung dienstags und freitags.' },
  { emoji: '🌀', category: 'Lotterien', name: 'GlücksSpirale', description: 'Die Rentenlotterie mit wöchentlicher Ziehung.' },
  { emoji: '7️⃣', category: 'Lotterien', name: 'Spiel 77 & Super 6', description: 'Die Zusatzlotterien zu deinem Tippschein.' },
  { emoji: '🔢', category: 'Lotterien', name: 'KENO', description: 'Die tägliche Zahlenlotterie.' },
  { emoji: '🎟️', category: 'Rubbellose & Wetten', name: 'Rubbellose', description: 'Verschiedene Lose zum Freirubbeln — Gewinn sofort sichtbar.' },
  { emoji: '⚽', category: 'Rubbellose & Wetten', name: 'ODDSET & TOTO', description: 'Sportwetten der staatlichen Lotteriegesellschaft.' },
  { emoji: '✅', category: 'Lotto-Service', name: 'Gewinne prüfen', description: 'Spielquittung vorbeibringen — wir prüfen sie direkt am Terminal.' },
  { emoji: '📝', category: 'Lotto-Service', name: 'Dauerschein & Systemschein', description: 'Spielschein über mehrere Wochen oder mit System spielen.' },

  // Zeitschriften & Service
  { emoji: '🗞️', category: 'Zeitschriften & Zeitungen', name: 'Tageszeitungen', description: 'Regionale und überregionale Zeitungen.', terms: ['zeitung', 'tageszeitung'] },
  { emoji: '📖', category: 'Zeitschriften & Zeitungen', name: 'Magazine & Zeitschriften', description: 'Von Sport über Auto bis Lifestyle.', terms: ['magazin', 'zeitschrift', 'heft'] },
  { emoji: '🧩', category: 'Zeitschriften & Zeitungen', name: 'Rätselhefte', description: 'Kreuzworträtsel, Sudoku & Co.', terms: ['rätsel', 'kreuzworträtsel', 'sudoku'] },
  { emoji: '📱', category: 'Guthabenkarten', name: 'Prepaid-Guthaben', description: 'Handy-Guthaben zum Aufladen für die gängigen Netze.', terms: ['aufladekarte'] },
  { emoji: '🎮', category: 'Guthabenkarten', name: 'Gaming- & Geschenkkarten', description: 'Guthaben für Konsole, App-Stores und Streaming.', terms: ['psn', 'playstation', 'xbox', 'nintendo', 'steam', 'google play', 'netflix', 'spotify', 'gutschein'] },
  { emoji: '💳', category: 'Guthabenkarten', name: 'paysafecard', description: 'Online bezahlen ohne Konto oder Kreditkarte.', terms: ['paysafe'] },
  { emoji: '📦', category: 'DHL Paketshop', name: 'Pakete abgeben & abholen', description: 'DHL-Pakete und Retouren abgeben oder Sendungen abholen.' },
];

// The four "Frisch im Regal" tiles from the homepage: highlights that don't
// appear in the /produkte catalog.
export const HIGHLIGHT_PRODUCTS = [
  { emoji: '🍬', category: 'Süßigkeiten', badge: 'NEU', name: 'Import-Süßwaren', description: 'Seltene Süßigkeiten aus den USA, Asien & der Türkei.' },
  { emoji: '🍭', category: 'Süßigkeiten', badge: 'TREND', name: 'Viral-Snacks', description: 'Die Süßigkeiten, über die gerade jeder spricht.' },
  { emoji: '🥤', category: 'Softdrinks & Wasser', badge: 'NEU', name: 'Trend-Drinks', description: 'Angesagte Softdrinks & Energydrinks in limitierten Sorten.' },
  { emoji: '🍫', category: 'Schokolade', badge: 'BESTSELLER', name: 'Schoko-Spezialitäten', description: 'Feinste Schokolade & Pralinen für jeden Geschmack.' },
];

// Brand products the chat assistant knew about (marked as example data in
// the old src/data/products.ts — please check range and prices). Not shown
// on /produkte until "Auf Produktseite anzeigen" is switched on.
export const CHAT_PRODUCTS = [
  { brand: 'Marlboro', name: 'Marlboro Red', category: 'Zigaretten', chatCategory: 'zigaretten' },
  { brand: 'Marlboro', name: 'Marlboro Gold', category: 'Zigaretten', chatCategory: 'zigaretten' },
  { name: 'Tabakwaren', category: 'Zigaretten', chatCategory: 'zigaretten' },
  { brand: 'Takis', name: 'Takis Blue Heat', category: 'Chips & Salziges', terms: ['blaue takis', 'takis blue'], tags: ['scharf', 'beliebt'] },
  { brand: 'Takis', name: 'Takis Fuego', category: 'Chips & Salziges', tags: ['scharf'] },
  { brand: 'Takis', name: 'Takis Intense Nacho', category: 'Chips & Salziges', tags: ['salzig', 'kaesig'] },
  { brand: 'Red Bull', name: 'Red Bull Original', category: 'Energy Drinks', tags: ['kalt', 'beliebt'] },
  { brand: 'Red Bull', name: 'Red Bull Sugarfree', category: 'Energy Drinks', terms: ['zuckerfrei'], tags: ['kalt', 'zuckerfrei'] },
  { brand: 'Red Bull', name: 'Red Bull Red Edition', category: 'Energy Drinks', terms: ['wassermelone'], tags: ['kalt'] },
  { brand: 'Monster', name: 'Monster Energy', category: 'Energy Drinks', tags: ['kalt', 'beliebt'] },
  { brand: 'Monster', name: 'Monster Ultra', category: 'Energy Drinks', terms: ['zero'], tags: ['kalt', 'zuckerfrei'] },
  { brand: 'Monster', name: 'Monster Mango Loco', category: 'Energy Drinks', tags: ['kalt'] },
];

// `logo` is a file under public/ that's imported into the media library.
export const SERVICES = [
  { slug: 'kiosk', icon: '🍫', logo: 'logo.jpg', gradient: 'red', title: 'Kiosk', description: 'Süßigkeiten, Getränke, Zeitschriften und alles für den kleinen Hunger — täglich frisch sortiert.' },
  { slug: 'dhl', icon: '📦', logo: 'logos/dhl.png', gradient: 'gold', title: 'DHL Paketshop', description: 'Pakete abgeben und abholen — schnell, freundlich und unkompliziert, ganz ohne Warteschlangen im Postamt.' },
  { slug: 'lotto', icon: '🎰', logo: 'logos/lotto.png', gradient: 'deep', title: 'Lotto', description: 'Offizielle Lotto-Annahmestelle: Tippscheine abgeben, Gewinne prüfen und dein Glück versuchen.' },
  { slug: 'ihle', icon: '🥪', logo: 'logos/ihle.png', gradient: 'red', title: 'Ihle', description: 'Frische Sandwiches, Wraps & Gebäck von Ihle — direkt bei uns im Kiosk.', badge: 'BALD VERFÜGBAR' },
];

export const REVIEWS = [
  { name: 'sabri can soyalp', initials: 'SS', color: '#f0ac23', time: 'vor einem Monat', text: 'Das Café ist wirklich sehr schön. Das Personal ist freundlich und kümmert sich gut um die Kunden. Die Produkte sind frisch, besonders der Kaffee ist sehr lecker. Ich kann das Café nur weiterempfehlen.' },
  { name: 'Cigdem Fidan', initials: 'CF', color: '#e0201f', time: 'vor 2 Monaten', text: 'Super netter Typ. Kann man negativ gelaunt rein, kommt positiv gelaunt wieder. Sagin gibt einfach schöne Energie von sich. 😊' },
  { name: 'Sarah Petzold', initials: 'SP', color: '#c4181c', time: 'vor 5 Monaten', text: 'Einfach top! Mein Mann und ich gehen sehr gerne hin, Päckchen abgeben und abholen. Soo nett und beide immer super freundlich! So macht es Spaß.' },
  { name: 'Can Sadri', initials: 'CS', color: '#b9861f', time: 'vor 2 Monaten', text: 'Der beste Kiosk den ich je gesehen habe … man wird herzlich empfangen und hat einfach Spaß beim Einkaufen! Immer einen Besuch wert. Top top top 👍' },
  { name: 'Moritz Betz', initials: 'MB', color: '#7a0000', time: 'vor 3 Monaten', text: 'Die Mitarbeiter sind nett und der Kundenservice ist ideal. Ebenfalls fühle ich mich sehr wohl im Laden.' },
];

// Monday first, as displayed. weekday = Date#getDay().
export const OPENING_HOURS = [
  { day: 'Montag', weekday: 1 },
  { day: 'Dienstag', weekday: 2 },
  { day: 'Mittwoch', weekday: 3 },
  { day: 'Donnerstag', weekday: 4 },
  { day: 'Freitag', weekday: 5 },
  { day: 'Samstag', weekday: 6 },
  { day: 'Sonntag', weekday: 0 },
].map((entry) => ({ ...entry, open: '08:00', close: '20:00', closed: false }));

// Content images imported from public/ into the media library.
export const CONTENT_IMAGES = { 'brand.logo': 'logo.jpg', 'about.image': 'logo.jpg' };
