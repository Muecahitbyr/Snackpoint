import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { respond } from '../src/components/chatbot/chatbotEngine';
import { tokenSimilarity } from '../src/components/chatbot/fuzzySearch';
import { PRODUCTS, getProductName } from '../src/data/products';
import type { ChatContext, Intent } from '../src/components/chatbot/types';

// Samstag, 26.09.2026. Opening hours come from src/data/hours.js (08:00–20:00 daily).
const SAT_NOON = new Date(2026, 8, 26, 12, 0);
const SAT_1745 = new Date(2026, 8, 26, 17, 45);
const SAT_NIGHT = new Date(2026, 8, 26, 22, 30);
const FIRST_VARIANT = () => 0;

function ask(text: string, ctx: ChatContext = {}, now = SAT_NOON) {
  const result = respond(text, ctx, now, FIRST_VARIANT);
  return { text: result.reply.text, intent: result.debug.intent, confidence: result.debug.confidence, ctx: result.context, quickReplies: result.reply.quickReplies };
}

/** Sends several messages in one conversation. */
function chat(messages: string[], now = SAT_NOON) {
  let ctx: ChatContext = {};
  return messages.map((message) => {
    const answer = ask(message, ctx, now);
    ctx = answer.ctx;
    return answer;
  });
}

const PRICE_UNKNOWN = (text: string) => /Preis/.test(text) && /nicht/.test(text) && /vor Ort/.test(text);

function expectIntent(text: string, intent: Intent, ...contains: string[]) {
  const answer = ask(text);
  assert.equal(answer.intent, intent, `"${text}" → ${answer.intent}\n${answer.text}`);
  for (const needle of contains) assert.ok(answer.text.includes(needle), `"${text}" should mention "${needle}", got:\n${answer.text}`);
  return answer;
}

describe('small talk', () => {
  for (const text of ['Hallo', 'Hi', 'Hey', 'Servus', 'Moin']) it(`greets: ${text}`, () => expectIntent(text, 'greeting'));
  it('answers time-of-day greetings', () => {
    assert.ok(ask('Guten Morgen').text.startsWith('Guten Morgen'));
    assert.ok(ask('Guten Abend').text.startsWith('Guten Abend'));
  });
  for (const text of ['Danke', 'vielen dank', 'perfekt danke']) it(`thanks: ${text}`, () => expectIntent(text, 'thanks'));
  for (const text of ['Tschüss', 'ciao', 'bis später', 'Bis dann']) it(`goodbye: ${text}`, () => expectIntent(text, 'goodbye'));
  it('help', () => expectIntent('Was kannst du?', 'help', 'Produkte', 'Öffnungszeiten'));
});

describe('product search', () => {
  it('finds a brand with several variants', () => {
    for (const text of ['Habt ihr Takis?', 'habt ihr takis', 'gibts takis', 'gibt es takis', 'verkauft ihr takis', 'habt ihr takies', 'takis da?', 'takis vorhanden?', "Gibt's Takis?"]) {
      expectIntent(text, 'product_availability', 'Takis Blue Heat', 'Takis Fuego', 'Takis Intense Nacho');
    }
  });
  it('lists variants on "Welche …"', () => {
    expectIntent('Welche Takis habt ihr?', 'product_variants', 'Takis Blue Heat', 'Takis Fuego');
    expectIntent('Welche Sorten Takis gibt es?', 'product_variants', 'Takis Fuego');
    expectIntent('Welche Red Bulls habt ihr?', 'product_variants', 'Red Bull Original', 'Red Bull Sugarfree');
  });
  it('understands colour and word-order variants', () => {
    for (const text of ['Habt ihr blaue Takis?', 'takis blau da?', 'blue takis', 'takis blue', 'takis blue heat', 'Gibt es Takis Blue Heat?', 'HABT IHR TAKIS BLUE HEAT???']) {
      const answer = ask(text);
      assert.ok(answer.text.includes('Takis Blue Heat'), `${text}\n${answer.text}`);
      assert.ok(!answer.text.includes('Fuego'), `${text} must not list other Takis\n${answer.text}`);
    }
  });
  it('lists cigarettes and finds Marlboro', () => {
    expectIntent('Habt ihr Zigaretten?', 'product_category', 'Marlboro Red', 'Marlboro Gold');
    expectIntent('Welche Zigaretten habt ihr?', 'product_category', 'Marlboro Gold');
    expectIntent('Habt ihr Marlboro?', 'product_availability', 'Marlboro Red', 'Marlboro Gold');
    expectIntent('habt ihr kippen', 'product_category', 'Marlboro');
  });
  it('understands categories', () => {
    expectIntent('Habt ihr Energy Drinks?', 'product_category', 'Red Bull Original', 'Monster Ultra');
    expectIntent('Welche Energy Drinks gibt es?', 'product_category', 'Monster Energy');
    expectIntent('Habt ihr Energy?', 'product_category', 'Red Bull Original');
    expectIntent('Gibt es Chips?', 'product_category', 'Kartoffelchips', 'Takis Blue Heat');
    expectIntent('Habt ihr Getränke?', 'product_category', 'Cola');
  });
  it('shortens long category lists instead of dumping everything', () => {
    const drinks = expectIntent('Welche Getränke habt ihr?', 'product_category', 'unter anderem', 'Soll ich dir alle Sorten zeigen?');
    assert.ok(drinks.text.split('\n').length < 4);
    const snacks = expectIntent('Welche Snacks habt ihr?', 'product_category', 'Bereiche', 'Chips & Salziges');
    assert.ok(!snacks.text.includes('Takis'));
  });
  it('asks when a brand has many variants', () => {
    expectIntent('Habt ihr Monster?', 'product_availability', 'mehrere Monster-Sorten', 'Monster Mango Loco', 'Meinst du eine bestimmte?');
  });
  it('handles several products in one question', () => {
    const answer = ask('Habt ihr Cola und Chips?');
    assert.ok(answer.text.includes('Cola') && answer.text.includes('Chips'));
  });
});

describe('typos and fuzzy matching', () => {
  const cases: [string, string][] = [
    ['habt ihr takies', 'Takis Blue Heat'],
    ['habt ihr takkis', 'Takis Blue Heat'],
    ['habt ihr tackis', 'Takis Blue Heat'],
    ['redbul da', 'Red Bull Original'],
    ['habt ihr red bul', 'Red Bull Original'],
    ['marlborro gold da?', 'Marlboro Gold'],
    ['habt ihr marlbro', 'Marlboro Red'],
    ['habt ihr monsta', 'Monster Ultra'],
    ['hapt ihr monster', 'Monster Energy'],
    ['gibts es zigarteten', 'Marlboro Red'],
    ['habt ihr kaffe', 'Kaffee to go'],
  ];
  for (const [text, expected] of cases) it(text, () => assert.ok(ask(text).text.includes(expected), ask(text).text));

  it('is careful with weaker matches ("Meinst du …?")', () => {
    const answer = ask('habt ihr monsta');
    assert.ok(answer.confidence < 0.8 && answer.confidence >= 0.6, String(answer.confidence));
    assert.ok(answer.text.includes('Meinst du'), answer.text);
  });
  it('does not match unrelated words', () => {
    for (const text of ['Habt ihr Blumen?', 'Habt ihr Bluetooth?', 'Habt ihr Wetter?', 'habt ihr laptop']) {
      const answer = ask(text);
      assert.ok(answer.text.includes('nicht in unserem Sortiment gefunden'), `${text}\n${answer.text}`);
    }
    assert.equal(tokenSimilarity('blum', 'blue'), 0);
    assert.equal(tokenSimilarity('wasser', 'wassereis') >= 0.85, true);
  });
  it('does not invent products for unknown items', () => {
    const answer = expectIntent('Habt ihr Produkt XYZ?', 'product_search', 'nicht in unserem Sortiment gefunden');
    assert.ok(!answer.text.includes('Ja'));
  });
  it('does not treat small talk as a product search', () => {
    assert.equal(ask('Wie ist das Wetter?').intent, 'unknown');
  });
});

describe('prices', () => {
  it('says so when no price is on record', () => {
    for (const text of ['Was kosten Takis?', 'Was kostet Red Bull?', 'Wie teuer sind Takis?', 'Was kostet Marlboro Gold?']) {
      const answer = expectIntent(text, 'product_price');
      assert.ok(PRICE_UNKNOWN(answer.text), answer.text);
    }
  });
  it('quotes prices from the data', () => {
    const product = PRODUCTS.find((entry) => getProductName(entry) === 'Marlboro Gold');
    assert.ok(product);
    product.price = 8.5;
    try {
      const answer = expectIntent('Was kostet Marlboro Gold?', 'product_price', 'Marlboro Gold', '8,50 €');
      assert.ok(!PRICE_UNKNOWN(answer.text));
    } finally {
      delete product.price;
    }
  });
});

describe('recommendations', () => {
  it('recommends by tag', () => {
    const answer = expectIntent('Habt ihr was scharfes?', 'recommendations', 'Takis Blue Heat', 'Takis Fuego');
    assert.ok(!answer.text.includes('Intense Nacho'));
    expectIntent('Was ist scharf?', 'recommendations', 'Takis Fuego');
    expectIntent('Welche Takis sind scharf?', 'product_variants', 'Takis Fuego');
  });
  it('recommends popular products only', () => {
    const answer = expectIntent('Was könnt ihr empfehlen?', 'recommendations');
    for (const product of PRODUCTS.filter((entry) => !entry.tags?.includes('beliebt'))) {
      assert.ok(!answer.text.includes(getProductName(product)), `${getProductName(product)} is not tagged "beliebt"`);
    }
  });
  it('handles "something sweet / to drink"', () => {
    expectIntent('Habt ihr was Süßes?', 'product_category', 'Fruchtgummi');
    expectIntent('Was habt ihr zum Trinken?', 'product_category', 'Cola');
  });
});

describe('new products need no chat rules', () => {
  it('finds every catalog product by its own name and aliases', () => {
    for (const product of PRODUCTS.filter((entry) => entry.available !== false)) {
      const name = getProductName(product);
      for (const phrase of [name, ...(product.aliases ?? [])]) {
        const answer = ask(`Habt ihr ${phrase}?`);
        assert.ok(answer.text.includes(name), `"${phrase}" should find ${name}, got:\n${answer.text}`);
      }
    }
  });
});

describe('opening hours', () => {
  it('opening_hours: closing time today', () => {
    for (const text of ['Wie lange habt ihr heute offen?', 'Wann macht ihr heute zu?', 'Bis wann habt ihr heute geöffnet?']) {
      const answer = ask(text);
      assert.equal(answer.intent, 'closing_time', text);
      assert.ok(answer.text.includes('20:00 Uhr'), answer.text);
    }
  });
  it('open now', () => {
    for (const text of ['Ist gerade offen?', 'Habt ihr noch auf?', 'Seid ihr noch geöffnet?', 'Habt ihr gerade offen?', 'habt ihr heute noch offen']) {
      const answer = ask(text);
      assert.equal(answer.intent, 'open_now', text);
      assert.ok(answer.text.includes('20:00 Uhr'), answer.text);
    }
  });
  it('closed at night, with next opening', () => {
    const answer = ask('Ist gerade offen?', {}, SAT_NIGHT);
    assert.equal(answer.intent, 'open_now');
    assert.ok(!answer.text.includes('Ja') && /zu|Feierabend/.test(answer.text), answer.text);
    assert.ok(/Morgen.*08:00 Uhr/.test(answer.text), answer.text);
  });
  it('time left', () => {
    const answer = ask('Wie lange habt ihr noch offen?', {}, SAT_1745);
    assert.equal(answer.intent, 'closing_time');
    assert.ok(answer.text.includes('etwa 2 Stunden und 15 Minuten'), answer.text);
  });
  it('opening time on other days', () => {
    expectIntent('Wann öffnet ihr morgen?', 'opening_time', 'Morgen', '08:00 Uhr');
    expectIntent('Wann macht ihr Montag auf?', 'opening_time', 'Montag', '08:00 Uhr');
    expectIntent('Habt ihr Sonntag offen?', 'opening_hours', 'Sonntag', '08:00', '20:00 Uhr');
    expectIntent('Wie lange habt ihr Samstag offen?', 'closing_time', 'Samstag', '20:00 Uhr');
  });
  it('week overview', () => {
    for (const text of ['Wie sind eure Öffnungszeiten?', 'öffnungszeiten', 'oeffnungszeitn']) {
      const answer = expectIntent(text, 'opening_hours');
      assert.ok(/täglich von 08:00 bis 20:00 Uhr/i.test(answer.text), answer.text);
    }
  });
  it('reopening', () => {
    const answer = ask('Wann macht ihr wieder auf?', {}, SAT_NIGHT);
    assert.ok(/Morgen.*08:00 Uhr/.test(answer.text), answer.text);
  });
  it('"habt ihr … auf Lager" is not an opening-hours question', () => {
    assert.equal(ask('Habt ihr Red Bull auf Lager?').intent, 'product_availability');
  });
});

describe('follow-up questions', () => {
  it('"Welche?" after a brand', () => {
    const [first, second] = chat(['Habt ihr Takis?', 'Welche?']);
    assert.equal(first.intent, 'product_availability');
    assert.equal(second.intent, 'product_variants');
    assert.ok(second.text.includes('Takis Fuego') && second.text.includes('Takis Blue Heat'));
  });
  it('"Was kosten die?" after a product', () => {
    const [, second] = chat(['Habt ihr Red Bull?', 'Was kosten die?']);
    assert.equal(second.intent, 'product_price');
    assert.ok(PRICE_UNKNOWN(second.text), second.text);
  });
  it('"Und Sonntag?" keeps asking about opening hours', () => {
    const [first, second] = chat(['Wie lange habt ihr Samstag offen?', 'Und Sonntag?']);
    assert.equal(first.intent, 'closing_time');
    assert.equal(second.intent, 'closing_time');
    assert.ok(second.text.includes('Sonntag') && second.text.includes('20:00 Uhr'), second.text);
    const [, morgen] = chat(['Wann habt ihr heute offen?', 'Und morgen?']);
    assert.ok(/morgen/i.test(morgen.text) && morgen.text.includes('08:00'), morgen.text);
  });
  it('"ja" accepts an offer to show all', () => {
    const [first, second] = chat(['Welche Getränke habt ihr?', 'ja gerne']);
    assert.ok(first.text.includes('Soll ich dir alle Sorten zeigen?'));
    assert.equal(second.intent, 'product_variants');
    assert.ok(second.text.includes('Monster Mango Loco'), second.text);
  });
  it('"Und Monster?" after a price question stays a price question', () => {
    const [, second] = chat(['Was kostet Red Bull?', 'Und Monster?']);
    assert.equal(second.intent, 'product_price');
  });
  it('asks what is meant when there is nothing to refer to', () => {
    assert.ok(ask('Welche Sorten gibt es?').text.includes('Habt ihr Red Bull?'));
    assert.ok(ask('Was kostet das?').text.includes('Habt ihr Red Bull?'));
  });
  it('small talk keeps the product context', () => {
    const answers = chat(['Habt ihr Takis?', 'Danke', 'Welche?']);
    assert.ok(answers[2].text.includes('Takis Fuego'));
  });
});

describe('other intents', () => {
  it('address and directions', () => {
    expectIntent('Wo seid ihr?', 'address', 'Neugablonzer');
    expectIntent('Wie lautet eure Adresse?', 'address', 'Neugablonzer');
    expectIntent('Wie komme ich zu euch?', 'directions', 'Route');
  });
  it('does not know phone, payment, delivery or parking unless the data says so', () => {
    expectIntent('Wie ist eure Telefonnummer?', 'phone', 'nicht hinterlegt');
    expectIntent('Wie kann ich euch erreichen?', 'contact', 'nicht hinterlegt');
    expectIntent('Kann ich mit Karte zahlen?', 'payment_methods', 'nicht sicher');
    expectIntent('Liefert ihr auch?', 'delivery', 'Team vor Ort');
    expectIntent('Gibt es Parkplätze?', 'parking', 'Team vor Ort');
  });
  it('services and FAQ', () => {
    expectIntent('DHL', 'services', 'DHL Paketshop');
    expectIntent('Kann ich ein Paket abgeben?', 'services', 'Pakete');
    expectIntent('Lotto', 'services', 'Lotto');
    expectIntent('Was verkauft ihr?', 'services', 'alles unter einem Dach');
    expectIntent('Ab wie viel Jahren gibt es Zigaretten?', 'faq', '18');
    expectIntent('Wer seid ihr?', 'faq', 'SnackPoint');
  });
  it('never invents facts for unknown questions', () => {
    for (const text of ['asdfgh', 'Wie ist das Wetter?', 'Wer wird Weltmeister?', '']) {
      const answer = ask(text);
      assert.equal(answer.intent, 'unknown', text);
      assert.ok(answer.text.includes('Team vor Ort'), answer.text);
    }
  });
});

describe('quick replies', () => {
  it('suggests follow-ups after product and hours answers', () => {
    assert.deepEqual(ask('Welche Takis habt ihr?').quickReplies?.map((reply) => reply.label), ['Preise', 'Andere Snacks', 'Öffnungszeiten']);
    assert.deepEqual(ask('Wie sind eure Öffnungszeiten?').quickReplies?.map((reply) => reply.label), ['Adresse', 'Route', 'Kontakt']);
  });
  it('every suggested question is understood', () => {
    const [, ...replies] = [ask('Habt ihr Takis?'), ...(ask('Habt ihr Takis?').quickReplies ?? []).map((reply) => ask(reply.query))];
    for (const reply of replies) assert.notEqual(reply.intent, 'unknown');
  });
});

// ---------------------------------------------------------------------------
// Tone: the wording is casual and varies, the FACTS never do. Every check below
// runs against every tone tier (plain / funny / punchy) and many variants.
// ---------------------------------------------------------------------------

/** rng values covering plain (<0.7), funny (<0.9) and punchy (>=0.9), each with different variant picks. */
const ROLLS = [0, 0.1, 0.25, 0.4, 0.55, 0.69, 0.7, 0.75, 0.8, 0.89, 0.9, 0.93, 0.97, 0.999];

function askRolled(text: string, roll: number, ctx: ChatContext = {}, now = SAT_NOON) {
  return respond(text, ctx, now, () => roll).reply.text;
}

/** Runs `check` on the reply for every roll. */
function forEveryVariant(text: string, check: (reply: string, roll: number) => void, ctx: ChatContext = {}, now = SAT_NOON) {
  for (const roll of ROLLS) check(askRolled(text, roll, ctx, now), roll);
}

const SLANG_ADDRESS = /\b(Bro|Bra|Bruder)\b/;
const emojiCount = (text: string) => (text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
const times = (text: string) => [...text.matchAll(/\d\d:\d\d/g)].map((match) => match[0]);

/** Small deterministic random generator, so distribution tests are stable. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('tone: facts stay correct in every variant', () => {
  it('"Habt ihr blaue Takis?" names exactly the blue ones', () => {
    forEveryVariant('Habt ihr blaue Takis?', (reply) => {
      assert.ok(reply.includes('Takis Blue Heat'), reply);
      assert.ok(!reply.includes('Fuego') && !reply.includes('Intense'), reply);
    });
  });

  it('"Habt ihr Red Bull?" lists the real Red Bulls only', () => {
    forEveryVariant('Habt ihr Red Bull?', (reply) => {
      for (const name of ['Red Bull Original', 'Red Bull Sugarfree', 'Red Bull Red Edition']) assert.ok(reply.includes(name), reply);
      assert.ok(!reply.includes('Monster'), reply);
    });
  });

  it('"Welche Monster habt ihr?" lists only products from the data', () => {
    const monsters = PRODUCTS.filter((product) => product.brand === 'Monster').map(getProductName);
    forEveryVariant('Welche Monster habt ihr?', (reply) => {
      for (const name of monsters) assert.ok(reply.includes(name), reply);
      const listed = reply.split('\n').filter((line) => line.startsWith('• '));
      assert.equal(listed.length, monsters.length, reply);
      for (const line of listed) assert.ok(monsters.includes(line.slice(2)), `invented product: ${line}`);
    });
  });

  it('prices are exact', () => {
    const originals = PRODUCTS.filter((product) => product.brand === 'Red Bull');
    originals[0].price = 2.49;
    originals[1].price = 2.59;
    try {
      forEveryVariant('Was kostet Red Bull Original?', (reply) => {
        assert.ok(reply.includes('2,49 €'), reply);
        assert.ok(!reply.includes('2,59'), reply);
      });
      forEveryVariant('Was kostet Red Bull?', (reply) => {
        assert.ok(reply.includes('Red Bull Original – 2,49 €') && reply.includes('Red Bull Sugarfree – 2,59 €'), reply);
        assert.ok(/keinen Preis|nicht hinterlegt/.test(reply), 'the third has no price and must say so');
      });
    } finally {
      delete originals[0].price;
      delete originals[1].price;
    }
  });

  it('never invents a price when none is on record', () => {
    forEveryVariant('Was kostet Red Bull?', (reply) => {
      assert.ok(!/\d+,\d\d\s?€/.test(reply), reply);
      assert.ok(PRICE_UNKNOWN(reply), reply);
    });
  });

  it('opening hours: only the real times', () => {
    forEveryVariant('Wie lange habt ihr heute offen?', (reply) => {
      assert.deepEqual([...new Set(times(reply))], ['20:00'], reply);
    });
    forEveryVariant('Habt ihr gerade offen?', (reply) => {
      assert.deepEqual([...new Set(times(reply))], ['20:00'], reply);
      assert.ok(!/\b(zu|Feierabend)\b/.test(reply), reply);
    });
    forEveryVariant('Habt ihr gerade offen?', (reply) => {
      assert.ok(times(reply).every((time) => time === '08:00'), reply);
      assert.ok(/zu|Feierabend/.test(reply) && !reply.includes('Ja'), reply);
    }, {}, SAT_NIGHT);
    forEveryVariant('Wann macht ihr morgen auf?', (reply) => {
      assert.deepEqual([...new Set(times(reply))], ['08:00'], reply);
      assert.ok(/morgen/i.test(reply), reply);
    });
    forEveryVariant('Wie sind eure Öffnungszeiten?', (reply) => assert.ok(/täglich von 08:00 bis 20:00 Uhr/i.test(reply), reply));
  });

  it('address', () => {
    forEveryVariant('Wo seid ihr?', (reply) => assert.ok(reply.includes('Neugablonzer Str. 25, 87600 Kaufbeuren'), reply));
  });

  it('a product that is marked unavailable is never announced as available', () => {
    const fuego = PRODUCTS.find((product) => getProductName(product) === 'Takis Fuego');
    assert.ok(fuego);
    fuego.available = false;
    try {
      forEveryVariant('Habt ihr Takis Fuego?', (reply) => {
        assert.ok(reply.includes('Takis Fuego'), reply);
        assert.ok(!/Safe|Klar|Geht klar|am Start|haben wir\b|\bJa\b/.test(reply), reply);
      });
      forEveryVariant('Welche Takis habt ihr?', (reply) => assert.ok(!reply.includes('• Takis Fuego'), reply));
    } finally {
      fuego.available = true;
    }
  });

  it('unknown product: honest, not cheeky, never "Ja"', () => {
    for (const text of ['Habt ihr Produkt XYZ?', 'Habt ihr Blumen?', 'Habt ihr Haribo?']) {
      forEveryVariant(text, (reply) => {
        assert.ok(reply.includes('nicht in unserem Sortiment gefunden'), reply);
        assert.ok(!reply.includes('Ja') && !SLANG_ADDRESS.test(reply), reply);
      });
    }
  });

  it('unknown information: honest and calm', () => {
    for (const text of ['Wer wird Weltmeister?', 'Wie ist das Wetter?', 'Kann ich mit Karte zahlen?', 'Wie ist eure Telefonnummer?']) {
      forEveryVariant(text, (reply) => {
        assert.ok(/Team vor Ort|vor Ort/.test(reply) || /nicht hinterlegt/.test(reply), reply);
        assert.ok(!SLANG_ADDRESS.test(reply) && !reply.includes('🔥'), reply);
      });
    }
  });
});

describe('age restriction', () => {
  it('every answer about cigarettes or tobacco says 18+', () => {
    for (const question of ['Habt ihr Zigaretten?', 'Welche Zigaretten habt ihr?', 'Habt ihr Marlboro?', 'Habt ihr Marlboro Gold?', 'habt ihr kippen', 'Was kostet Marlboro Gold?', 'Habt ihr Tabak?', 'marlborro gold da?']) {
      forEveryVariant(question, (reply) => assert.ok(reply.includes('ab 18 Jahren'), `${question}: ${reply}`));
    }
  });
  it('follow-ups about cigarettes keep the note', () => {
    for (const roll of ROLLS) {
      let ctx: ChatContext = {};
      ctx = respond('Habt ihr Marlboro?', ctx, SAT_NOON, () => roll).context;
      assert.ok(respond('Welche?', ctx, SAT_NOON, () => roll).reply.text.includes('ab 18 Jahren'));
      assert.ok(respond('Was kosten die?', ctx, SAT_NOON, () => roll).reply.text.includes('ab 18 Jahren'));
    }
  });
  it('other products do not carry the note', () => {
    for (const question of ['Habt ihr Takis?', 'Habt ihr Red Bull?', 'Welche Getränke habt ihr?', 'Was habt ihr im Sortiment?']) {
      forEveryVariant(question, (reply) => assert.ok(!reply.includes('ab 18 Jahren') || question.includes('Sortiment'), `${question}: ${reply}`));
    }
  });
});

describe('tone: small talk', () => {
  it('greets, thanks and says goodbye in every variant', () => {
    for (const text of ['Hallo', 'Servus', 'Danke', 'Tschüss']) {
      forEveryVariant(text, (reply) => {
        assert.ok(reply.length > 3 && reply.length < 160, reply);
        assert.ok(emojiCount(reply) <= 2, reply);
      });
    }
    forEveryVariant('Danke', (reply) => assert.ok(!/\d/.test(reply), 'thanks contains no facts'));
  });
  it('the tone is casual', () => {
    const greetings = new Set(ROLLS.map((roll) => askRolled('Hallo', roll)));
    assert.ok([...greetings].some((reply) => /Was geht|Yo|Servus|Hey/.test(reply)));
    const goodbyes = new Set(ROLLS.map((roll) => askRolled('Tschüss', roll)));
    assert.ok([...goodbyes].some((reply) => /Hau rein|Bis später|Bis dann|Mach’s gut/.test(reply)));
  });
});

describe('tone: restraint', () => {
  const QUESTIONS = [
    'Hallo', 'Habt ihr Takis?', 'Habt ihr blaue Takis?', 'Habt ihr Red Bull?', 'Welche Monster habt ihr?', 'Welche Getränke habt ihr?',
    'Welche Snacks habt ihr?', 'Habt ihr Energy Drinks?', 'Habt ihr was scharfes?', 'Was könnt ihr empfehlen?', 'Habt ihr Cola?',
    'Was kostet Red Bull?', 'Wie lange habt ihr heute offen?', 'Habt ihr gerade offen?', 'Wann öffnet ihr morgen?', 'Wie sind eure Öffnungszeiten?',
    'Wo seid ihr?', 'Wie komme ich zu euch?', 'Kann ich mit Karte zahlen?', 'Danke', 'Tschüss', 'Habt ihr Blumen?', 'Wer wird Weltmeister?',
    'Habt ihr Zigaretten?', 'Habt ihr Marlboro?', 'DHL', 'Lotto', 'Was verkauft ihr?', 'Was kannst du?', 'Ist gerade offen?',
  ];

  it('never more than two emojis per reply', () => {
    for (const question of QUESTIONS) forEveryVariant(question, (reply) => assert.ok(emojiCount(reply) <= 2, `${question}: ${reply}`));
  });

  it('never opens a reply with Bro / Bra / Bruder', () => {
    for (const question of QUESTIONS) forEveryVariant(question, (reply) => assert.ok(!/^(Bro|Bra|Bruder)\b/.test(reply), reply));
  });

  it('tobacco and Lotto stay matter-of-fact', () => {
    const salesy = /\b(Bro|Bra|Bruder)\b|gönn|hol dir|Kiosk, der dich|Wiederbelebung|Notfall|🔥|😭/i;
    const marlbGold = PRODUCTS.find((product) => getProductName(product) === 'Marlboro Gold');
    assert.ok(marlbGold);
    marlbGold.price = 8.5;
    try {
      for (const question of ['Habt ihr Zigaretten?', 'Habt ihr Marlboro?', 'Habt ihr Marlboro Gold?', 'Was kostet Marlboro Gold?', 'habt ihr kippen', 'Lotto', 'Ab wie viel Jahren gibt es Zigaretten?']) {
        forEveryVariant(question, (reply) => assert.ok(!salesy.test(reply), `${question}: ${reply}`));
      }
    } finally {
      delete marlbGold.price;
    }
  });

  it('roughly 70 % plain / 20 % funny / 10 % punchy', () => {
    const rng = seeded(42);
    const N = 3000;
    let slangy = 0;
    const seen = new Set<string>();
    for (let i = 0; i < N; i++) {
      const reply = respond('Habt ihr Takis Fuego?', {}, SAT_NOON, rng).reply.text;
      seen.add(reply);
      // markers that only the funny/punchy tiers use
      if (/Bro\b|Bra\b|Bruder|Kiosk, der dich|😭|🔥|Notfall/.test(reply)) slangy += 1;
    }
    const share = slangy / N;
    assert.ok(share > 0.18 && share < 0.42, `funny+punchy share was ${share.toFixed(2)}`);
    assert.ok(seen.size >= 8, `only ${seen.size} different wordings`);
  });

  it('same question, different wording — same facts', () => {
    const replies = new Set(ROLLS.map((roll) => askRolled('Habt ihr blaue Takis?', roll)));
    assert.ok(replies.size >= 5, `only ${replies.size} variants`);
    for (const reply of replies) assert.ok(reply.includes('Takis Blue Heat'));
  });
});

describe('quick replies still work with the new tone', () => {
  it('every suggested question gets a real answer', () => {
    for (const start of ['Habt ihr Takis?', 'Wie sind eure Öffnungszeiten?', 'Wo seid ihr?']) {
      const first = ask(start);
      for (const reply of first.quickReplies ?? []) assert.notEqual(ask(reply.query, first.ctx).intent, 'unknown', reply.query);
    }
  });
});
