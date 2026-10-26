// Example catalog for the /produkte page — illustrative range, not a live
// inventory feed (SnackPoint doesn't currently have one). gradient cycles
// through the 4 tile backgrounds already defined in NewProducts.css.
//
// Every product sits in a category, every category in one of the
// PRODUCT_GROUPS below (Übergruppen). The order here is the display order.
const GRADIENTS = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

// `notice` is shown above the group's products; `ageRestricted` adds an
// "18+" badge to its cards. Tobacco texts stay purely informational
// (German law bans tobacco advertising online).
export const PRODUCT_GROUPS = [
  { id: 'snacks', name: 'Snacks & Süßes', emoji: '🍫' },
  { id: 'getraenke', name: 'Getränke', emoji: '🥤' },
  { id: 'essen', name: 'Essen to go', emoji: '🥪' },
  {
    id: 'tabak',
    name: 'Tabak & Rauchen',
    emoji: '🚬',
    ageRestricted: true,
    notice: 'Abgabe von Tabakwaren und E-Zigaretten nur an Personen ab 18 Jahren — bitte Ausweis bereithalten.',
  },
  {
    id: 'lotto',
    name: 'Lotto & Rubbellose',
    emoji: '🍀',
    ageRestricted: true,
    notice:
      'Spielteilnahme ab 18 Jahren. Glücksspiel kann süchtig machen. Hilfe & Infos: BZgA-Hotline 0800 1 37 27 00 (kostenlos & anonym).',
  },
  { id: 'service', name: 'Zeitschriften & Service', emoji: '📰' },
];

const RAW_PRODUCTS = [
  // ── Snacks & Süßes ──
  // Süßigkeiten
  { emoji: '🍬', group: 'snacks', category: 'Süßigkeiten', title: 'Fruchtgummi-Mix', text: 'Bärchen, Colas & saure Mischungen für jeden Geschmack.' },
  { emoji: '🍭', group: 'snacks', category: 'Süßigkeiten', title: 'Lutscher & Lollis', text: 'Bunte Lutscher in Frucht- und Colageschmack.' },
  { emoji: '🍡', group: 'snacks', category: 'Süßigkeiten', title: 'Kaubonbons', text: 'Weiche Kaubonbons in Frucht- und Milchsorten.' },
  { emoji: '🧁', group: 'snacks', category: 'Süßigkeiten', title: 'Marshmallows', text: 'Fluffige Marshmallows pur oder überzogen.' },
  { emoji: '🍋', group: 'snacks', category: 'Süßigkeiten', title: 'Sauer-Extrem', text: 'Für alle, die es richtig sauer mögen.' },
  // Schokolade
  { emoji: '🍫', group: 'snacks', category: 'Schokolade', title: 'Schokoriegel-Klassiker', text: 'Die bekanntesten Riegel, immer griffbereit.' },
  { emoji: '🍪', group: 'snacks', category: 'Schokolade', title: 'Kekse & Gebäck', text: 'Knusprige Kekse pur oder mit Schokolade.' },
  { emoji: '🎁', group: 'snacks', category: 'Schokolade', title: 'Pralinen-Auswahl', text: 'Feine Pralinen für besondere Momente.' },
  { emoji: '🌰', group: 'snacks', category: 'Schokolade', title: 'Nuss-Schokolade', text: 'Vollmilch- und Zartbitterschokolade mit Nüssen.' },
  // Chips & Salziges
  { emoji: '🥔', group: 'snacks', category: 'Chips & Salziges', title: 'Kartoffelchips', text: 'Knusprige Chips in vielen Geschmacksrichtungen.' },
  { emoji: '🌽', group: 'snacks', category: 'Chips & Salziges', title: 'Nachos & Dips', text: 'Knusprige Nachos mit cremigen Dips.' },
  { emoji: '🥜', group: 'snacks', category: 'Chips & Salziges', title: 'Nüsse & Studentenfutter', text: 'Herzhafte Snacks für zwischendurch.' },
  // Popcorn & Eis
  { emoji: '🍿', group: 'snacks', category: 'Popcorn & Eis', title: 'Popcorn süß & salzig', text: 'Der Snack-Klassiker fürs Kino-Feeling zuhause.' },
  { emoji: '🍦', group: 'snacks', category: 'Popcorn & Eis', title: 'Eis am Stiel', text: 'Erfrischende Eis-Klassiker für heiße Tage.' },

  // ── Getränke ──
  // Softdrinks & Wasser
  { emoji: '🥤', group: 'getraenke', category: 'Softdrinks & Wasser', title: 'Cola & Limonaden', text: 'Klassiker und Trendsorten, eiskalt.' },
  { emoji: '💧', group: 'getraenke', category: 'Softdrinks & Wasser', title: 'Wasser still & medium', text: 'Erfrischung ganz ohne Zucker.' },
  { emoji: '🧃', group: 'getraenke', category: 'Softdrinks & Wasser', title: 'Eistee & Fruchtsäfte', text: 'Fruchtig-erfrischend für unterwegs.' },
  // Energy Drinks
  { emoji: '⚡', group: 'getraenke', category: 'Energy Drinks', title: 'Energy Drinks', text: 'Für den Extra-Kick zwischendurch.' },
  // Kaffee
  { emoji: '☕', group: 'getraenke', category: 'Kaffee', title: 'Kaffee to go', text: 'Heißer Kaffee, direkt aus dem Automaten.' },

  // ── Essen to go ──
  { emoji: '🥪', group: 'essen', category: 'Sandwiches & Snacks', title: 'Belegte Sandwiches', text: 'Frisch belegte Sandwiches für den kleinen Hunger zwischendurch.' },
  { emoji: '🌯', group: 'essen', category: 'Sandwiches & Snacks', title: 'Wraps', text: 'Herzhafte Wraps in mehreren Variationen.' },
  { emoji: '🥖', group: 'essen', category: 'Sandwiches & Snacks', title: 'Baguettes', text: 'Knusprige Baguettes, frisch belegt.' },
  { emoji: '🥐', group: 'essen', category: 'Sandwiches & Snacks', title: 'Frisches Gebäck', text: 'Croissants & Gebäck für den Snack unterwegs.' },
  { emoji: '🥗', group: 'essen', category: 'Sandwiches & Snacks', title: 'Salat to go', text: 'Frischer Salat für die schnelle, leichte Mahlzeit.' },

  // ── Tabak & Rauchen ──
  // Zigaretten
  { emoji: '🚬', group: 'tabak', category: 'Zigaretten', title: 'Zigaretten', text: 'Gängige Marken als Schachtel und im größeren Format.' },
  { emoji: '🎩', group: 'tabak', category: 'Zigaretten', title: 'Zigarillos & Zigarren', text: 'Eine kleine Auswahl an Zigarillos und Zigarren.' },
  // Tabak
  { emoji: '🍂', group: 'tabak', category: 'Tabak', title: 'Drehtabak', text: 'Feinschnitt zum Selberdrehen in verschiedenen Sorten.' },
  { emoji: '🫙', group: 'tabak', category: 'Tabak', title: 'Stopftabak', text: 'Volumentabak zum Stopfen von Hülsen.' },
  // E-Zigaretten
  { emoji: '💨', group: 'tabak', category: 'E-Zigaretten', title: 'E-Zigaretten & Vapes', text: 'Einweg- und Pod-Systeme in verschiedenen Ausführungen.' },
  { emoji: '🧪', group: 'tabak', category: 'E-Zigaretten', title: 'Liquids & Pods', text: 'Nachfüllbehälter und Pods für gängige Geräte.' },
  // Raucherbedarf
  { emoji: '📜', group: 'tabak', category: 'Raucherbedarf', title: 'Papers & Filter', text: 'Blättchen, Filter und Filtertips.' },
  { emoji: '🧰', group: 'tabak', category: 'Raucherbedarf', title: 'Hülsen & Stopfer', text: 'Zigarettenhülsen und Stopfmaschinen zum Selberstopfen.' },
  { emoji: '🔥', group: 'tabak', category: 'Raucherbedarf', title: 'Feuerzeuge & Streichhölzer', text: 'Einweg- und Sturmfeuerzeuge, Streichhölzer.' },

  // ── Lotto & Rubbellose ──
  // Lotterien
  { emoji: '🎱', group: 'lotto', category: 'Lotterien', title: 'LOTTO 6aus49', text: 'Der Klassiker — Ziehung jeden Mittwoch und Samstag.' },
  { emoji: '🇪🇺', group: 'lotto', category: 'Lotterien', title: 'Eurojackpot', text: 'Die europäische Lotterie — Ziehung dienstags und freitags.' },
  { emoji: '🌀', group: 'lotto', category: 'Lotterien', title: 'GlücksSpirale', text: 'Die Rentenlotterie mit wöchentlicher Ziehung.' },
  { emoji: '7️⃣', group: 'lotto', category: 'Lotterien', title: 'Spiel 77 & Super 6', text: 'Die Zusatzlotterien zu deinem Tippschein.' },
  { emoji: '🔢', group: 'lotto', category: 'Lotterien', title: 'KENO', text: 'Die tägliche Zahlenlotterie.' },
  // Rubbellose & Wetten
  { emoji: '🎟️', group: 'lotto', category: 'Rubbellose & Wetten', title: 'Rubbellose', text: 'Verschiedene Lose zum Freirubbeln — Gewinn sofort sichtbar.' },
  { emoji: '⚽', group: 'lotto', category: 'Rubbellose & Wetten', title: 'ODDSET & TOTO', text: 'Sportwetten der staatlichen Lotteriegesellschaft.' },
  // Lotto-Service
  { emoji: '✅', group: 'lotto', category: 'Lotto-Service', title: 'Gewinne prüfen', text: 'Spielquittung vorbeibringen — wir prüfen sie direkt am Terminal.' },
  { emoji: '📝', group: 'lotto', category: 'Lotto-Service', title: 'Dauerschein & Systemschein', text: 'Spielschein über mehrere Wochen oder mit System spielen.' },

  // ── Zeitschriften & Service ──
  // Zeitschriften & Zeitungen
  { emoji: '🗞️', group: 'service', category: 'Zeitschriften & Zeitungen', title: 'Tageszeitungen', text: 'Regionale und überregionale Zeitungen.' },
  { emoji: '📖', group: 'service', category: 'Zeitschriften & Zeitungen', title: 'Magazine & Zeitschriften', text: 'Von Sport über Auto bis Lifestyle.' },
  { emoji: '🧩', group: 'service', category: 'Zeitschriften & Zeitungen', title: 'Rätselhefte', text: 'Kreuzworträtsel, Sudoku & Co.' },
  // Guthabenkarten
  { emoji: '📱', group: 'service', category: 'Guthabenkarten', title: 'Prepaid-Guthaben', text: 'Handy-Guthaben zum Aufladen für die gängigen Netze.' },
  { emoji: '🎮', group: 'service', category: 'Guthabenkarten', title: 'Gaming- & Geschenkkarten', text: 'Guthaben für Konsole, App-Stores und Streaming.' },
  { emoji: '💳', group: 'service', category: 'Guthabenkarten', title: 'paysafecard', text: 'Online bezahlen ohne Konto oder Kreditkarte.' },
  // Paketshop
  { emoji: '📦', group: 'service', category: 'DHL Paketshop', title: 'Pakete abgeben & abholen', text: 'DHL-Pakete und Retouren abgeben oder Sendungen abholen.' },
];

export const allProducts = RAW_PRODUCTS.map((product, i) => ({
  ...product,
  gradient: GRADIENTS[i % GRADIENTS.length],
}));

export const PRODUCT_CATEGORIES = [...new Set(allProducts.map((p) => p.category))];

/** Categories of one group, in display order. */
export function groupCategories(groupId) {
  return [...new Set(allProducts.filter((p) => p.group === groupId).map((p) => p.category))];
}
