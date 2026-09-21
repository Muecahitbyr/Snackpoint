// Example catalog for the /produkte page — illustrative range, not a live
// inventory feed (SnackPoint doesn't currently have one). gradient cycles
// through the 4 tile backgrounds already defined in NewProducts.css.
const GRADIENTS = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

const RAW_PRODUCTS = [
  // Süßigkeiten
  { emoji: '🍬', category: 'Süßigkeiten', title: 'Fruchtgummi-Mix', text: 'Bärchen, Colas & saure Mischungen für jeden Geschmack.' },
  { emoji: '🍭', category: 'Süßigkeiten', title: 'Lutscher & Lollis', text: 'Bunte Lutscher in Frucht- und Colageschmack.' },
  { emoji: '🍡', category: 'Süßigkeiten', title: 'Kaubonbons', text: 'Weiche Kaubonbons in Frucht- und Milchsorten.' },
  { emoji: '🧁', category: 'Süßigkeiten', title: 'Marshmallows', text: 'Fluffige Marshmallows pur oder überzogen.' },
  { emoji: '🍋', category: 'Süßigkeiten', title: 'Sauer-Extrem', text: 'Für alle, die es richtig sauer mögen.' },
  // Schokolade
  { emoji: '🍫', category: 'Schokolade', title: 'Schokoriegel-Klassiker', text: 'Die bekanntesten Riegel, immer griffbereit.' },
  { emoji: '🍪', category: 'Schokolade', title: 'Kekse & Gebäck', text: 'Knusprige Kekse pur oder mit Schokolade.' },
  { emoji: '🎁', category: 'Schokolade', title: 'Pralinen-Auswahl', text: 'Feine Pralinen für besondere Momente.' },
  { emoji: '🌰', category: 'Schokolade', title: 'Nuss-Schokolade', text: 'Vollmilch- und Zartbitterschokolade mit Nüssen.' },
  // Getränke
  { emoji: '🥤', category: 'Getränke', title: 'Cola & Limonaden', text: 'Klassiker und Trendsorten, eiskalt.' },
  { emoji: '⚡', category: 'Getränke', title: 'Energy Drinks', text: 'Für den Extra-Kick zwischendurch.' },
  { emoji: '💧', category: 'Getränke', title: 'Wasser still & medium', text: 'Erfrischung ganz ohne Zucker.' },
  { emoji: '🧃', category: 'Getränke', title: 'Eistee & Fruchtsäfte', text: 'Fruchtig-erfrischend für unterwegs.' },
  { emoji: '☕', category: 'Getränke', title: 'Kaffee to go', text: 'Heißer Kaffee, direkt aus dem Automaten.' },
  // Chips & Salziges
  { emoji: '🥔', category: 'Chips & Salziges', title: 'Kartoffelchips', text: 'Knusprige Chips in vielen Geschmacksrichtungen.' },
  { emoji: '🌽', category: 'Chips & Salziges', title: 'Nachos & Dips', text: 'Knusprige Nachos mit cremigen Dips.' },
  { emoji: '🥜', category: 'Chips & Salziges', title: 'Nüsse & Studentenfutter', text: 'Herzhafte Snacks für zwischendurch.' },
  // Sandwiches & Snacks
  { emoji: '🥪', category: 'Sandwiches & Snacks', title: 'Belegte Sandwiches', text: 'Frisch belegte Sandwiches für den kleinen Hunger zwischendurch.' },
  { emoji: '🌯', category: 'Sandwiches & Snacks', title: 'Wraps', text: 'Herzhafte Wraps in mehreren Variationen.' },
  { emoji: '🥖', category: 'Sandwiches & Snacks', title: 'Baguettes', text: 'Knusprige Baguettes, frisch belegt.' },
  { emoji: '🥐', category: 'Sandwiches & Snacks', title: 'Frisches Gebäck', text: 'Croissants & Gebäck für den Snack unterwegs.' },
  { emoji: '🥗', category: 'Sandwiches & Snacks', title: 'Salat to go', text: 'Frischer Salat für die schnelle, leichte Mahlzeit.' },
  // Sonstiges
  { emoji: '🍿', category: 'Sonstiges', title: 'Popcorn süß & salzig', text: 'Der Snack-Klassiker fürs Kino-Feeling zuhause.' },
  { emoji: '🍦', category: 'Sonstiges', title: 'Eis am Stiel', text: 'Erfrischende Eis-Klassiker für heiße Tage.' },
];

export const allProducts = RAW_PRODUCTS.map((product, i) => ({
  ...product,
  gradient: GRADIENTS[i % GRADIENTS.length],
}));

export const PRODUCT_CATEGORIES = [...new Set(allProducts.map((p) => p.category))];
