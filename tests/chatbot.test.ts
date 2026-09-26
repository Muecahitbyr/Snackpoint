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
  it('help', () => expectIntent('Was kannst du?', 'help', 'Produkten'));
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
    assert.ok(answer.text.startsWith('Meinst du'), answer.text);
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
      expectIntent(text, 'product_price', 'Preis habe ich leider nicht hinterlegt');
    }
  });
  it('quotes prices from the data', () => {
    const product = PRODUCTS.find((entry) => getProductName(entry) === 'Marlboro Gold');
    assert.ok(product);
    product.price = 8.5;
    try {
      expectIntent('Was kostet Marlboro Gold?', 'product_price', 'Marlboro Gold kostet 8,50 €');
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
    const answer = expectIntent('Was könnt ihr empfehlen?', 'recommendations', 'beliebt');
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
      assert.ok(answer.text.includes('bis 20:00 Uhr'), answer.text);
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
    assert.ok(answer.text.startsWith('Nein'), answer.text);
    assert.ok(answer.text.includes('morgen um 08:00 Uhr'), answer.text);
  });
  it('time left', () => {
    const answer = ask('Wie lange habt ihr noch offen?', {}, SAT_1745);
    assert.equal(answer.intent, 'closing_time');
    assert.ok(answer.text.includes('etwa 2 Stunden und 15 Minuten'), answer.text);
  });
  it('opening time on other days', () => {
    expectIntent('Wann öffnet ihr morgen?', 'opening_time', 'Morgen öffnen wir um 08:00 Uhr');
    expectIntent('Wann macht ihr Montag auf?', 'opening_time', 'Montag öffnen wir um 08:00 Uhr');
    expectIntent('Habt ihr Sonntag offen?', 'opening_hours', 'Sonntag sind wir von 08:00 bis 20:00 Uhr');
    expectIntent('Wie lange habt ihr Samstag offen?', 'closing_time', 'Samstag haben wir bis 20:00 Uhr');
  });
  it('week overview', () => {
    for (const text of ['Wie sind eure Öffnungszeiten?', 'öffnungszeiten', 'oeffnungszeitn']) expectIntent(text, 'opening_hours', 'täglich von 08:00 bis 20:00 Uhr');
  });
  it('reopening', () => {
    const answer = ask('Wann macht ihr wieder auf?', {}, SAT_NIGHT);
    assert.ok(answer.text.includes('morgen um 08:00 Uhr'), answer.text);
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
    assert.ok(second.text.includes('Preis habe ich leider nicht hinterlegt'));
  });
  it('"Und Sonntag?" keeps asking about opening hours', () => {
    const [first, second] = chat(['Wie lange habt ihr Samstag offen?', 'Und Sonntag?']);
    assert.equal(first.intent, 'closing_time');
    assert.equal(second.intent, 'closing_time');
    assert.ok(second.text.startsWith('Sonntag') && second.text.includes('bis 20:00 Uhr'), second.text);
    const [, morgen] = chat(['Wann habt ihr heute offen?', 'Und morgen?']);
    assert.ok(morgen.text.startsWith('Morgen'), morgen.text);
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
    assert.ok(ask('Welche Sorten gibt es?').text.includes('Zu welchem Produkt'));
    assert.ok(ask('Was kostet das?').text.includes('Zu welchem Produkt'));
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
    expectIntent('Liefert ihr auch?', 'delivery', 'keine Information');
    expectIntent('Gibt es Parkplätze?', 'parking', 'keine Information');
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

describe('wording variants keep the facts', () => {
  it('every variant of a yes-answer names the product', () => {
    for (const roll of [0, 0.3, 0.6, 0.99]) {
      const answer = respond('Habt ihr blaue Takis?', {}, SAT_NOON, () => roll).reply.text;
      assert.ok(answer.includes('Takis Blue Heat'), answer);
    }
  });
});
