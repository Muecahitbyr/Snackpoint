// All the bot's wording lives here — and ONLY wording. Facts (products,
// prices, hours, address) are passed in as parameters by responseBuilder.ts;
// nothing in this file decides what is true.
//
// Personality: a relaxed, slightly cheeky kiosk clerk. Each reply type has up
// to three tone tiers, picked by `say`:
//    plain  (~70 %)  relaxed and short
//    funny  (~20 %)  a bit more humour
//    punchy (~10 %)  the running gag: "der Kiosk, der dich wieder zum Leben erweckt"
// Rules of thumb: max 1–2 emojis per reply, "Bro/Bra/Bruder" only in the
// funny/punchy tiers, and no cheeky tone for problems or age-restricted
// products (tobacco) — those get plain/neutral wording only.
//
// Language: this is the German set (`de`). To add English/Turkish later, add a
// sibling object with the same shape and register it in MESSAGES.

export type Rng = () => number;
export type Lang = 'de';
export const LANG: Lang = 'de';

/** Picks one wording at random. */
export function pick<T>(variants: readonly T[], rng: Rng): T {
  return variants[Math.floor(rng() * variants.length) % variants.length];
}

export interface Tones<T> {
  plain: readonly T[];
  funny?: readonly T[];
  punchy?: readonly T[];
}

/** ~70 % plain, ~20 % funny, ~10 % punchy (falling back to the tier below when a tier is missing). */
export function say<T>(tones: Tones<T>, rng: Rng): T {
  const roll = rng();
  const pool = roll < 0.7 ? tones.plain : roll < 0.9 ? (tones.funny ?? tones.plain) : (tones.punchy ?? tones.funny ?? tones.plain);
  return pick(pool, rng);
}

/** Adds extra funny/punchy variants to a base set (for topic-specific jokes). */
function extend<T>(base: Tones<T>, extra: { funny?: readonly T[]; punchy?: readonly T[] }): Tones<T> {
  return {
    plain: base.plain,
    funny: [...(extra.funny ?? []), ...(base.funny ?? [])],
    punchy: [...(extra.punchy ?? []), ...(base.punchy ?? [])],
  };
}

/** What kind of products an answer is about — decides the tone. */
export type Flavor = 'generic' | 'energy' | 'snack' | 'restricted';

type Name = (name: string) => string;

// ---- Product available (one product) ------------------------------------------

const oneGeneric: Tones<Name> = {
  plain: [
    (n) => `Safe 😎 ${n} haben wir da.`,
    (n) => `Klar, ${n} ist am Start.`,
    (n) => `Ja, ${n} haben wir.`,
    (n) => `${n}? Haben wir am Start 😎`,
    (n) => `Geht klar 👍 ${n} ist da.`,
  ],
  funny: [
    (n) => `Wär ja schlimm, wenn nicht 😭 ${n} haben wir.`,
    (n) => `Na klar Bro 🔥 ${n} ist am Start.`,
    (n) => `Natürlich 😎 Wir sind hier schließlich der Kiosk, der dich wieder zum Leben erweckt. ${n} ist am Start.`,
  ],
  punchy: [
    (n) => `Natürlich Bra 😎 Wir sind hier beim Kiosk, der dich wieder zum Leben erweckt. ${n} ist am Start.`,
    (n) => `Notfall? Können wir lösen 😎 ${n} ist am Start.`,
  ],
};

const oneByFlavor: Record<Flavor, Tones<Name>> = {
  generic: oneGeneric,
  energy: extend(oneGeneric, {
    funny: [(n) => `Klar doch ⚡ Ohne Energy läuft hier gar nix. ${n} ist am Start.`],
    punchy: [(n) => `Energy ist am Start ⚡ ${n} – Wiederbelebung gesichert.`],
  }),
  snack: extend(oneGeneric, { funny: [(n) => `Snack-Notfall? Können wir lösen 😎 ${n} haben wir.`] }),
  // Age-restricted: matter-of-fact, never promotional.
  restricted: {
    plain: [(n) => `Ja, ${n} haben wir.`, (n) => `Safe 👍 ${n} haben wir.`, (n) => `Ja klar, ${n} haben wir am Start.`],
  },
};

// ---- Lists of products ---------------------------------------------------------

const introGeneric: Tones<string> = {
  plain: ['Da geht einiges 😎 Wir haben aktuell:', 'Klar, das hier ist am Start:', 'Safe 😎 Das haben wir:', 'Hier, das haben wir aktuell:'],
  funny: ['Da wird’s spannend 😎 Wir haben aktuell:', 'Hier wirst du fündig 😎 Das haben wir:'],
  punchy: ['Wiederbelebung gesichert 😎 Das haben wir am Start:'],
};

const introByFlavor: Record<Flavor, Tones<string>> = {
  generic: introGeneric,
  energy: extend(introGeneric, {
    funny: ['Energy? Bruder, davon haben wir genug ⚡ Das haben wir:'],
    punchy: ['Energy-Notfall? Können wir lösen ⚡ Das haben wir:'],
  }),
  snack: extend(introGeneric, {
    funny: ['Snacks? Da bist du bei uns gefährlich richtig 😭 Das haben wir:'],
    punchy: ['Snack-Notfall? Können wir lösen 😎 Das haben wir:'],
  }),
  restricted: { plain: ['Ja, das haben wir:', 'Safe 👍 Das haben wir am Start:', 'Klar, das haben wir:'] },
};

/** "Habt ihr Monster?" with several variants of one brand. */
const brandMany: Tones<Name> = {
  plain: [
    (b) => `Da geht einiges 😎 Wir haben mehrere ${b.replace(/ /g, '-')}-Sorten:`,
    (b) => `Klar, ${b} gibt’s bei uns in mehreren Sorten:`,
    (b) => `Safe 😎 Bei ${b} haben wir mehrere Sorten:`,
  ],
  funny: [(b) => `${b}? Da haben wir gleich mehrere Sorten 😎`, (b) => `Wär ja schlimm, wenn nicht 😭 Mehrere ${b.replace(/ /g, '-')}-Sorten am Start:`],
  punchy: [(b) => `${b}? Bruder, davon haben wir mehrere Sorten 😎`],
};

// ---- Everything else ------------------------------------------------------------

const de = {
  greeting: {
    plain: [
      'Was geht 😎 Was brauchst du?',
      'Yo 👋 Was kann ich für dich checken?',
      'Servus 😎 Was darf’s sein?',
      'Hey 👋 Wonach suchst du?',
    ],
    funny: ['Na, Hunger oder Durst? 😎 Ich bin bereit.', 'Willkommen beim Kiosk, der dich wieder zum Leben erweckt 😎 Was darf’s sein?'],
    punchy: ['Yo Bro 😎 Snack-Notfall? Dann bist du hier richtig.'],
  } as Tones<string>,
  greetingMorning: {
    plain: ['Guten Morgen ☀️ Was darf’s sein?', 'Guten Morgen 😎 Was brauchst du?'],
    funny: ['Guten Morgen ☀️ Zeit für Koffein und Snacks – sag an.'],
  } as Tones<string>,
  greetingEvening: {
    plain: ['Guten Abend 🌙 Was darf’s sein?', 'Guten Abend 😎 Was brauchst du?'],
    funny: ['Guten Abend 🌙 Spätes Snack-Gelüst? Sag an.'],
  } as Tones<string>,
  thanks: {
    plain: ['Kein Ding 👊', 'Easy 😎', 'Immer gerne.', 'Gern geschehen 😊'],
    funny: ['Immer doch Bro 😎', 'Dafür sind wir da 😎 Sag Bescheid, wenn noch was ist.'],
    punchy: ['Passt, dafür bin ich hier 😎 Wiederbelebung gesichert.'],
  } as Tones<string>,
  goodbye: {
    plain: ['Bis später 😎', 'Bis dann ✌️', 'Hau rein 👊', 'Mach’s gut ✌️'],
    funny: ['Mach’s gut Bro. Komm vorbei, wenn der Hunger ruft 😎'],
    punchy: ['Bis bald 😎 Wir sind hier, wenn du wieder Wiederbelebung brauchst.'],
  } as Tones<string>,
  // Problems and unknowns: friendly, not cheeky.
  unknown: {
    plain: [
      'Dazu hab ich gerade leider keine sichere Info 😅 Frag am besten kurz unser Team vor Ort.\nBei Produkten, Öffnungszeiten, Standort, DHL und Lotto helf ich dir gern.',
      'Da bin ich überfragt 😅 Frag am besten kurz unser Team vor Ort.\nBei Produkten, Öffnungszeiten, Standort, DHL und Lotto helf ich dir gern.',
    ],
  } as Tones<string>,
  help:
    'Ich check für dich:\n• Produkte – z. B. „Habt ihr blaue Takis?“ oder „Was kostet Red Bull?“\n• Öffnungszeiten – z. B. „Habt ihr gerade offen?“\n• Adresse & Route\n• DHL Paketshop & Lotto\n• Kontakt & Zahlungsarten',

  available: {
    one: oneByFlavor,
    intro: introByFlavor,
    brandMany,
    /** Closing line after a brand list: offers prices only when there are some. */
    closerWithPrices: ['Wenn du willst, sag ich dir auch direkt die Preise.', 'Preise hab ich auch, sag einfach Bescheid.'],
    closerNoPrices: 'Meinst du eine bestimmte?',
    those: {
      plain: ['Klar, das hier ist am Start:', 'Safe 😎 Das haben wir:'],
    } as Tones<string>,
  },
  categorySummary: {
    plain: [
      (names: string, cat: string) => `Da geht einiges 😎 Wir haben unter anderem ${names} und weitere ${cat}. Soll ich dir alle Sorten zeigen?`,
      (names: string, cat: string) => `Klar, wir haben unter anderem ${names} und weitere ${cat}. Soll ich dir alle Sorten zeigen?`,
      (names: string, cat: string) => `Safe 😎 Unter anderem ${names} und weitere ${cat} sind am Start. Soll ich dir alle Sorten zeigen?`,
    ],
    funny: [(names: string, cat: string) => `Da wird’s wild 😎 Wir haben unter anderem ${names} und weitere ${cat}. Soll ich dir alle Sorten zeigen?`],
  } as Tones<(names: string, cat: string) => string>,
  productSummary: {
    plain: [
      (count: number, names: string) => `Da geht einiges 😎 Wir haben ${count} Sorten, zum Beispiel ${names}. Soll ich dir alle zeigen?`,
      (count: number, names: string) => `Klar, wir haben ${count} Sorten, zum Beispiel ${names}. Soll ich dir alle zeigen?`,
    ],
  } as Tones<(count: number, names: string) => string>,
  areas: {
    plain: ['Da geht einiges 😎 Wir haben mehrere Bereiche:', 'Klar, wir haben mehrere Bereiche am Start:', 'Safe 😎 Da gibt’s mehrere Bereiche:'],
  } as Tones<string>,
  areasCloser: 'Frag gern nach einem davon!',
  followUpList: ['Aktuell haben wir:', 'Hier die Übersicht:', 'Das ist alles am Start:'],
  cautious: {
    one: [
      (n: string) => `Meinst du „${n}“? Das haben wir am Start.`,
      (n: string) => `Meinst du „${n}“? Dann: ist da 😎`,
    ],
    many: ['Meinst du eine dieser Sorten?', 'Meinst du eine von denen hier?'],
  },
  soldOut: [
    (n: string) => `${n} ist aktuell leider nicht da.`,
    (n: string) => `Bei ${n} müssen wir gerade leider passen 😅`,
    (n: string) => `${n} ist gerade nicht da, sorry 😭`,
  ],
  // Not found: never says "Ja", not cheeky.
  notFound: [
    (what: string) => `Das Produkt „${what}“ hab ich aktuell nicht in unserem Sortiment gefunden 😅`,
    (what: string) => `„${what}“? Hab ich aktuell nicht in unserem Sortiment gefunden.`,
    (what: string) => `Puh, „${what}“ hab ich gerade nicht in unserem Sortiment gefunden 😅`,
  ],
  askTeam: ['Frag am besten kurz unser Team vor Ort, unser Angebot wechselt.', 'Frag kurz vor Ort nach, unser Angebot wechselt.'],
  didYouMean: (names: string) => `Meinst du ${names}?`,
  multiMissing: (what: string) => `${what} hab ich aktuell nicht in unserem Sortiment gefunden.`,

  price: {
    one: {
      plain: [
        (n: string, p: string) => `${n} liegt bei ${p} 😎`,
        (n: string, p: string) => `${n} kostet ${p}.`,
        (n: string, p: string) => `${n}: ${p} 👍`,
      ],
      funny: [(n: string, p: string) => `${p} für ${n} 😎 Easy.`, (n: string, p: string) => `${n}: ${p} Bro ⚡`],
    } as Tones<(name: string, price: string) => string>,
    oneRestricted: [(n: string, p: string) => `${n} kostet ${p}.`, (n: string, p: string) => `${n} liegt bei ${p}.`],
    listHeader: ['So sieht’s preislich aus 😎', 'Aktuelle Preise:', 'Das kostet aktuell:'],
    missing: [
      'Preis hab ich gerade leider nicht safe drin 😅 Frag am besten kurz vor Ort.',
      'Den Preis hab ich gerade nicht hinterlegt 😅 Frag am besten kurz vor Ort nach.',
    ],
    partlyMissing: 'Bei den anderen hab ich keinen Preis hinterlegt – frag dafür kurz vor Ort nach.',
  },

  recommendation: {
    byTag: {
      plain: ['Da hätt ich was für dich 😎', 'Safe, das könnte passen:', 'Check mal die hier:'],
      funny: ['Da wird’s wild 😎 Das hier passt:'],
    } as Tones<string>,
    popular: {
      plain: ['Das kommt bei uns aktuell richtig gut an:', 'Besonders beliebt bei uns:', 'Die Klassiker bei uns gerade:'],
      funny: ['Wenn du mich fragst 😎 Das hier ist beliebt:'],
    } as Tones<string>,
    none: 'Da hab ich gerade keine Empfehlung hinterlegt 😅 Frag am besten kurz unser Team vor Ort.',
  },
  whichProduct: 'Meinst du ein bestimmtes Produkt? Frag z. B. „Habt ihr Red Bull?“ 😎',
  noProducts: 'Dazu hab ich gerade nichts hinterlegt 😅 Frag am besten kurz unser Team vor Ort.',
  /** Appended to every answer that mentions cigarettes or tobacco. Fixed wording, no tone tiers. */
  ageNote: 'Wichtig: Zigaretten und Tabakwaren gibt es nur für Personen ab 18 Jahren.',

  address: [
    (a: string) => `Wir sind hier: ${a} 📍 Komm rum 😎`,
    (a: string) => `Du findest uns in der ${a} 📍`,
    (a: string) => `${a} 📍 Komm einfach vorbei.`,
  ],
  directions: [
    (a: string) => `Wir sind in der ${a} 📍 Die Route findest du hier:`,
    (a: string) => `${a} – hier kommt die Route 👇`,
  ],
  phone: (phone: string) => `Ruf uns an unter ${phone} 📞`,
  noPhone: (a: string) => `Eine Telefonnummer hab ich leider nicht hinterlegt 😅 Komm gern direkt vorbei: ${a}.`,
  contact: (details: string) => `So erreichst du uns:\n${details}`,
  noContact: (a: string) => `Telefonnummer oder E-Mail hab ich leider nicht hinterlegt 😅 Komm gern direkt vorbei: ${a}.`,
  payment: [(list: string) => `Safe 💳 Bei uns geht: ${list}.`, (list: string) => `Zahlen kannst du bei uns mit: ${list} 💳`],
  noPayment: 'Das hab ich gerade leider nicht sicher drin 😅 Frag am besten kurz vor Ort.',
  noDelivery: 'Dazu hab ich gerade keine sichere Info 😅 Frag am besten kurz unser Team vor Ort.',
  noParking: 'Dazu hab ich gerade keine sichere Info 😅 Frag am besten kurz unser Team vor Ort.',

  // ---- Opening hours ----
  hours: {
    /** "Morgen geht's ab 08:00 Uhr wieder los." — `when` is "heute" / "morgen" / "am Montag". */
    next: (when: string, time: string) =>
      when === 'heute' ? `Heute geht’s ab ${time} Uhr los.` : `${when[0].toUpperCase()}${when.slice(1)} geht’s ab ${time} Uhr wieder los.`,
    openNow: {
      plain: [
        (until: string) => `Safe 😎 Wir sind offen und heute noch bis ${until} Uhr da.`,
        (until: string) => `Natürlich, komm rum 😎 Bis ${until} Uhr sind wir da.`,
        (until: string) => `Ja, wir haben offen – noch bis ${until} Uhr.`,
      ],
      funny: [(until: string) => `Offen und bereit 😎 Noch bis ${until} Uhr.`],
    } as Tones<(until: string) => string>,
    closedNow: {
      plain: [
        (next: string) => `Leider Feierabend 😭 Wir haben schon zu. ${next}`,
        (next: string) => `Aktuell haben wir zu 😅 ${next}`,
        (next: string) => `Gerade zu, sorry. ${next}`,
      ],
    } as Tones<(next: string) => string>,
    remaining: [
      (until: string, duration: string) => `Bis ${until} Uhr sind wir noch da – das sind noch ${duration} 😎`,
      (until: string, duration: string) => `Wir haben noch bis ${until} Uhr offen, also noch ${duration}.`,
    ],
    reopeningOpen: (until: string, next: string) => `Wir sind gerade offen, noch bis ${until} Uhr. ${next}`,
    reopeningClosed: (next: string) => `Aktuell haben wir zu. ${next}`,
    /** Today's hours are over already. */
    over: (close: string, next: string) => `Heute hatten wir bis ${close} Uhr offen, jetzt ist Feierabend 😭 ${next}`,
    closedDay: {
      plain: [(l: string) => `${l} haben wir leider zu 😭`, (l: string) => `${l} ist bei uns geschlossen.`],
    } as Tones<(label: string) => string>,
    // Day answers get the label ("Heute", "Morgen", "Samstag") and the times.
    close: {
      plain: [
        (L: string, l: string, close: string) => `${L} ziehen wir bis ${close} Uhr durch 😎`,
        (L: string, l: string, close: string) => `Bis ${close} Uhr sind wir ${l} für dich da.`,
        (L: string, l: string, close: string) => `${L} haben wir bis ${close} Uhr offen.`,
      ],
    } as Tones<(Label: string, label: string, close: string) => string>,
    /** Only for today: a bit more banter. */
    closeTodayFunny: [(close: string) => `Bis ${close} Uhr Bro, also noch genug Zeit 😎`],
    open: {
      plain: [
        (L: string, open: string) => `${L} geht’s ab ${open} Uhr los 😎`,
        (L: string, open: string) => `${L} sind wir ab ${open} Uhr am Start.`,
        (L: string, open: string) => `${L} öffnen wir um ${open} Uhr.`,
      ],
    } as Tones<(Label: string, open: string) => string>,
    alreadyOpen: (open: string) => `Heute sind wir schon ab ${open} Uhr am Start.`,
    both: {
      plain: [
        (L: string, open: string, close: string) => `${L} sind wir von ${open} bis ${close} Uhr am Start 😎`,
        (L: string, open: string, close: string) => `${L} haben wir von ${open} bis ${close} Uhr offen.`,
        (L: string, open: string, close: string) => `${L} läuft’s von ${open} bis ${close} Uhr.`,
      ],
    } as Tones<(Label: string, open: string, close: string) => string>,
    yes: ['Safe 😎 ', 'Ja, ', 'Klar 😎 '],
    no: ['Nö 😎 ', 'Nein, '],
    weekSingle: [
      (open: string, close: string) => `Bei uns läuft’s täglich von ${open} bis ${close} Uhr 😎`,
      (open: string, close: string) => `Täglich von ${open} bis ${close} Uhr sind wir für dich da.`,
      (open: string, close: string) => `Wir haben täglich von ${open} bis ${close} Uhr offen.`,
    ],
    weekHeader: ['Unsere Öffnungszeiten:', 'So haben wir offen:'],
    weekClosed: 'Wir haben aktuell zu.',
  },
};

type Messages = typeof de;
const MESSAGES: Record<Lang, Messages> = { de };
export const M: Messages = MESSAGES[LANG];
