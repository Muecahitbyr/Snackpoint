// `logo` points to an image under public/logos/ — until the real brand
// logos are supplied, it stays null and the card falls back to `icon`
// (emoji). Drop the files in and set the path here, no other code changes
// needed (see Services.jsx).
export const services = [
  {
    icon: '🍫',
    logo: null,
    gradient: 'red',
    title: 'Kiosk & Snacks',
    text: 'Süßigkeiten, Getränke, Zeitschriften und alles für den kleinen Hunger — täglich frisch sortiert.',
    target: 'snacks',
  },
  {
    icon: '📦',
    logo: null,
    gradient: 'gold',
    title: 'DHL Paketshop',
    text: 'Pakete abgeben und abholen — schnell, freundlich und unkompliziert, ganz ohne Warteschlangen im Postamt.',
    target: 'dhl',
  },
  {
    icon: '🎰',
    logo: null,
    gradient: 'deep',
    title: 'Lotto',
    text: 'Offizielle Lotto-Annahmestelle: Tippscheine abgeben, Gewinne prüfen und dein Glück versuchen.',
    target: 'lotto',
  },
  {
    icon: '🥪',
    logo: null,
    gradient: 'red',
    title: 'Ihle',
    text: 'Frische Sandwiches, Wraps & Gebäck von Ihle — direkt bei uns im Kiosk.',
    target: 'ihle',
  },
];
