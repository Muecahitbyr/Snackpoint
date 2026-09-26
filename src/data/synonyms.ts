// Everything about *wording* for the chat assistant lives here, so it's easy
// to extend: how customers say things (phrase synonyms) and which trigger
// words point to which topic (intent words). All spelled normalized: lowercase,
// umlauts written out (ä→ae, ö→oe, ü→ue, ß→ss).

/** Customer wording → canonical word, applied to the user's message AND to the
 * product data before matching. Regex sources, whole words only. */
export const PHRASE_SYNONYMS: [pattern: string, replacement: string][] = [
  // colours → the English words used in flavour names ("Takis Blue Heat")
  ['blau(?:e|er|en|es|em)?', 'blue'],
  ['rot(?:e|er|en|es|em)?', 'red'],
  ['gruen(?:e|er|en|es|em)?', 'green'],
  ['gelb(?:e|er|en|es|em)?', 'yellow'],
  ['schwarz(?:e|er|en|es|em)?', 'black'],
  ['weiss(?:e|er|en|es|em)?', 'white'],
  // brands and compound spellings
  ['red ?bull?s?', 'redbull'],
  ['coca ?cola', 'cola'],
  ['kit ?kat', 'kitkat'],
  // categories
  ['energy ?drinks?', 'energy'],
  ['energie ?drinks?', 'energy'],
  ['zigis?', 'zigarette'],
  ['kippen?', 'zigarette'],
  ['rauchwaren?', 'zigarette'],
];

/** Trigger words per topic. Fuzzy matching tolerates typos for words of 5+
 * letters; short words must match exactly. */
export const INTENT_WORDS = {
  // --- questions about products ---
  availability: [
    'habt', 'haben', 'hab', 'hast', 'gibt', 'gibts', 'verkauft', 'verkaufen', 'verkauf', 'fuehrt', 'fuehren', 'bekomme', 'bekommt',
    'kaufen', 'sortiment', 'vorraetig', 'lager', 'kriege', 'kriegt', 'da', 'vorhanden', 'verfuegbar', 'erhaeltlich',
  ],
  list: ['welche', 'welcher', 'welches', 'welchen', 'sorten', 'sorte', 'varianten', 'variante', 'alle', 'liste', 'aufzaehlen', 'geschmack'],
  price: ['kostet', 'kosten', 'kostest', 'preis', 'preise', 'wieviel', 'euro', 'teuer', 'guenstig'],
  recommend: ['empfehlen', 'empfehlung', 'empfehlungen', 'empfiehlst', 'empfehle', 'beliebt', 'beliebteste', 'bestseller', 'lieblings', 'topseller'],
  yes: ['ja', 'jo', 'gerne', 'gern', 'ok', 'okay', 'klar', 'sicher', 'natuerlich', 'bitte', 'yes'],

  // --- opening hours ---
  open: [
    'offen', 'geoeffnet', 'oeffnungszeit', 'oeffnungszeiten', 'oeffnungsuhrzeit', 'oeffnen', 'oeffnet', 'geschlossen',
    'schliesst', 'schliessen', 'zumachen', 'aufmachen', 'zeiten',
  ],
  schedule: ['oeffnungszeit', 'oeffnungszeiten', 'oeffnungsuhrzeit', 'zeiten'],
  now: ['gerade', 'jetzt', 'aktuell', 'momentan', 'noch', 'grad', 'derzeit'],
  close: ['zu', 'zumachen', 'schliesst', 'schliessen', 'bis', 'lange', 'dicht', 'feierabend', 'schluss'],
  openVerbs: ['oeffnet', 'oeffnen', 'aufmachen', 'beginn'],
  questionStarts: ['habt', 'seid', 'ist', 'hat', 'haben', 'sind', 'macht', 'hast'],
  dayFollowFillers: ['und', 'wie', 'ist', 'es', 'dann', 'aber', 'sieht', 'aus', 'mit', 'am', 'an', 'ihr'],

  // --- other topics ---
  phone: ['telefon', 'telefonnummer', 'handynummer', 'anrufen', 'nummer', 'rufnummer'],
  contact: ['mail', 'email', 'kontakt', 'kontaktieren', 'erreichen', 'whatsapp', 'schreiben'],
  payment: ['zahlen', 'bezahlen', 'zahlung', 'kartenzahlung', 'barzahlung', 'paypal', 'girocard', 'mastercard', 'visa', 'kontaktlos', 'applepay', 'ec'],
  parking: ['parkplatz', 'parkplaetze', 'parken', 'parkmoeglichkeit', 'parkmoeglichkeiten'],
  delivery: ['liefern', 'liefert', 'lieferung', 'lieferservice', 'lieferdienst', 'zustellung', 'heimlieferung'],
  help: ['hilfe', 'help', 'hilf', 'funktionen', 'befehle'],
  direction: ['route', 'anfahrt', 'navigation', 'navi', 'maps', 'wegbeschreibung', 'anreise'],
  address: ['adresse', 'standort', 'strasse', 'anschrift'],
  whereVerbs: ['seid', 'ist', 'liegt', 'finde', 'finden', 'befindet', 'sitzt', 'genau'],
  /** "Wo ist …" only means our address when it isn't about a specific thing. */
  place: ['laden', 'kiosk', 'snackpoint', 'snack', 'point', 'geschaeft', 'shop', 'kaufbeuren', 'genau'],

  // --- small talk ---
  greeting: ['hallo', 'hi', 'hey', 'moin', 'servus', 'huhu', 'guten', 'tag', 'morgen', 'abend', 'gruess', 'gott', 'hello'],
  goodbye: ['tschuess', 'tschau', 'ciao', 'bye', 'wiedersehen', 'bald', 'dann', 'spaeter', 'ade'],
  thanks: ['danke', 'dankeschoen', 'dank', 'vielen', 'merci', 'thx', 'perfekt'],
  socialFillers: ['wie', 'geht', 's', 'dir', 'euch', 'ihr', 'es', 'bis', 'auf', 'alle', 'zusammen', 'schoenen', 'noch', 'einen', 'sehr', 'super', 'ok', 'tag'],
} as const;
