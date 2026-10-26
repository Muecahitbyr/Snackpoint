// Topics of the chat assistant a product category can belong to. Must match
// the ids of CATEGORIES in src/data/products.ts.
export const CHAT_CATEGORIES = [
  { id: 'suessigkeiten', label: 'Süßigkeiten' },
  { id: 'schokolade', label: 'Schokolade' },
  { id: 'chips', label: 'Chips & Salziges' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'getraenke', label: 'Getränke' },
  { id: 'energy', label: 'Energy Drinks' },
  { id: 'belegtes', label: 'Sandwiches & Gebäck' },
  { id: 'zigaretten', label: 'Zigaretten & Tabak' },
  { id: 'zeitschriften', label: 'Zeitschriften' },
  { id: 'guthaben', label: 'Guthabenkarten' },
];
export const CHAT_CATEGORY_IDS = CHAT_CATEGORIES.map((category) => category.id);
