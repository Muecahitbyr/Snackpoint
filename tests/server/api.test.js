// End-to-end tests of the API against a real Postgres — ONLY the throwaway
// database in TEST_DATABASE_URL, which is wiped before the run.
//   npm run test:server
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const TEST_URL = process.env.TEST_DATABASE_URL;
if (!TEST_URL || !/test/i.test(new URL(TEST_URL).pathname)) {
  throw new Error('TEST_DATABASE_URL must be set and name a *test* database — refusing to run.');
}
process.env.DATABASE_URL = TEST_URL;
// Production setup: the API only answers requests forwarded by the
// Cloudflare Worker, which runs on the website's host.
process.env.PROXY_SECRET = 'test-proxy-secret';
process.env.LOGIN_MIN_MS = '0'; // the constant-time delay is tested separately
delete process.env.NODE_ENV;

const { query, closePool } = await import('../../server/db/pool.js');
const { config } = await import('../../server/config.js');
const pg = (await import('pg')).default;
const { migrate } = await import('../../server/db/migrate.js');
const { seed } = await import('../../server/db/seed.js');
const { hashPassword } = await import('../../server/auth/password.js');
const { createApp } = await import('../../server/app.js');
const sharp = (await import('sharp')).default;

const app = createApp();
const SITE_HOST = 'snackpoint.example';
const ORIGIN = `https://${SITE_HOST}`;
const VIA_WORKER = { 'X-Proxy-Secret': 'test-proxy-secret', 'X-Original-Host': SITE_HOST, 'X-Client-IP': '203.0.113.7' };
/** Like the Worker: adds the proxy headers to every request. */
const request = (path, init = {}) => app.request(path, { ...init, headers: { ...VIA_WORKER, ...(init.headers ?? {}) } });
const EMAIL = 'owner@test.local';
const PASSWORD = 'Richtig-Langes-Testpasswort-1';

/** Tiny client that keeps the session cookie and CSRF token like the admin app. */
function client() {
  let cookie = '';
  let csrf = '';
  const send = async (path, { method = 'GET', body, form, headers = {}, noCsrf = false } = {}) => {
    const init = { method, headers: { Origin: ORIGIN, ...headers } };
    if (cookie) init.headers.Cookie = cookie;
    if (method !== 'GET' && csrf && !noCsrf) init.headers['X-CSRF-Token'] = csrf;
    if (form) init.body = form;
    else if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const response = await request(path, init);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0].endsWith('=') ? '' : setCookie.split(';')[0];
    const type = response.headers.get('content-type') ?? '';
    const data = type.includes('json') ? await response.json() : await response.arrayBuffer();
    return { status: response.status, data, headers: response.headers };
  };
  return {
    send,
    async login(email = EMAIL, password = PASSWORD) {
      const result = await send('/api/auth/login', { method: 'POST', body: { email, password } });
      if (result.status === 200) csrf = result.data.csrfToken;
      return result;
    },
    get cookie() { return cookie; },
  };
}

const site = async () => (await request('/api/public/site')).json();

async function pngFile(color = { r: 224, g: 32, b: 31 }, width = 300, height = 200) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
  return new File([buffer], 'test.png', { type: 'image/png' });
}

let admin;
const OWNER_URL = TEST_URL;
const APP_PASSWORD = (await import('node:crypto')).randomBytes(24).toString('hex');
const appUrl = (() => {
  const url = new URL(TEST_URL);
  url.username = 'snackpoint_app';
  url.password = APP_PASSWORD;
  return url.toString();
})();

/** Switches the shared pool to another connection (owner or restricted app role). */
async function useConnection(url) {
  config.databaseUrl = url;
  await closePool();
}

before(async () => {
  await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate({ log: () => {} });
  await seed({ log: () => {} });
  await query('INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)', [EMAIL, await hashPassword(PASSWORD)]);
  await query(`ALTER ROLE snackpoint_app WITH LOGIN PASSWORD '${APP_PASSWORD}'`);
  // From here on the API runs exactly like in production: as the restricted role.
  await useConnection(appUrl);
  admin = client();
  assert.equal((await admin.login()).status, 200);
});

after(async () => {
  await closePool();
});

describe('login timing', () => {
  it('answers a failed and a successful login after the same minimum time', async () => {
    config.loginMinMs = 400;
    try {
      for (const [email, password] of [['nobody@test.local', 'egal-egal-egal'], [EMAIL, 'falsch-aber-lang']]) {
        const started = Date.now();
        await client().login(email, password);
        assert.ok(Date.now() - started >= 390, `${email} answered too fast`);
      }
    } finally {
      config.loginMinMs = 0;
    }
  });
});

describe('migrated content', () => {
  it('serves every original product and the opening hours from the database', async () => {
    const data = await site();
    assert.equal(data.products.filter((p) => p.showInCatalog).length, 49);
    const highlights = data.products.filter((p) => p.isHighlight).sort((a, b) => a.highlightOrder - b.highlightOrder);
    assert.deepEqual(highlights.map((p) => p.title), ['Import-Süßwaren', 'Viral-Snacks', 'Trend-Drinks', 'Schoko-Spezialitäten']);
    assert.deepEqual(data.groups.map((g) => g.id), ['snacks', 'getraenke', 'essen', 'tabak', 'lotto', 'service']);
    assert.equal(data.hours.length, 7);
    assert.deepEqual(data.events, { current: [], past: [] });
    // Texts, settings, services and reviews come from src/data/siteContent.js.
    for (const key of ['content', 'settings', 'services', 'reviews']) assert.equal(data[key], undefined, key);
  });

  it('seeding twice changes nothing', async () => {
    const before = (await query('SELECT count(*)::int AS n FROM products')).rows[0].n;
    await useConnection(OWNER_URL);
    await seed({ log: () => {} });
    await useConnection(appUrl);
    assert.equal((await query('SELECT count(*)::int AS n FROM products')).rows[0].n, before);
  });
});

describe('authentication & access control', () => {
  it('rejects every admin endpoint without a session', async () => {
    const anonymous = client();
    for (const path of ['/api/admin/dashboard', '/api/admin/products', '/api/admin/events', '/api/admin/media', '/api/admin/settings', '/api/admin/audit']) {
      assert.equal((await anonymous.send(path)).status, 401, path);
    }
    assert.equal((await anonymous.send('/api/admin/products', { method: 'POST', body: { name: 'x' } })).status, 401);
    assert.equal((await anonymous.send('/api/admin/media/00000000-0000-0000-0000-000000000000', { method: 'DELETE' })).status, 401);
  });

  it('rejects a wrong password with a generic message', async () => {
    const result = await client().login(EMAIL, 'falsch-falsch-falsch');
    assert.equal(result.status, 401);
    assert.equal(result.data.error, 'E-Mail oder Passwort ist falsch.');
    assert.equal((await client().login('unbekannt@test.local', 'irgendwas')).data.error, 'E-Mail oder Passwort ist falsch.');
  });

  it('logs in, sets a hardened cookie, and logs out', async () => {
    const c = client();
    const result = await c.login();
    assert.equal(result.status, 200);
    const cookie = result.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.equal((await c.send('/api/auth/me')).data.user.email, EMAIL);
    assert.equal((await c.send('/api/auth/logout', { method: 'POST' })).status, 200);
    assert.equal((await c.send('/api/admin/dashboard')).status, 401);
    assert.equal((await c.send('/api/auth/me')).data.user, null);
  });

  it('requires the CSRF token for changes', async () => {
    const result = await admin.send('/api/admin/banners', { method: 'POST', body: { text: 'x' }, noCsrf: true });
    assert.equal(result.status, 403);
  });

  it('rejects requests from a foreign origin', async () => {
    const result = await admin.send('/api/admin/banners', { method: 'POST', body: { text: 'x' }, headers: { Origin: 'https://evil.example' } });
    assert.equal(result.status, 403);
    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    assert.equal(login.status, 403);
  });

  it('only answers requests that come through the Worker', async () => {
    assert.equal((await app.request('/api/public/site')).status, 404);
    assert.equal((await app.request('/api/public/site', { headers: { 'X-Proxy-Secret': 'wrong-secret-value!' } })).status, 404);
    assert.equal((await app.request('/api/auth/login', { method: 'POST', body: '{}' })).status, 404);
    assert.equal((await app.request('/api/health')).status, 200, 'health check stays open for Railway');
    assert.equal((await request('/api/public/site')).status, 200);
  });

  it('records the visitor IP passed on by the Worker', async () => {
    await client().login(EMAIL, 'falsch-für-ip-test');
    const { rows } = await query('SELECT ip FROM login_attempts ORDER BY id DESC LIMIT 1');
    assert.equal(rows[0].ip, '203.0.113.7');
  });

  it('locks an account after 5 failed attempts', async () => {
    const email = 'bruteforce@test.local';
    for (let i = 0; i < 5; i += 1) assert.equal((await client().login(email, `wrong-${i}`)).status, 401);
    const blocked = await client().login(email, 'wrong-again');
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  });

  it('counts parallel login attempts against the same limit', async () => {
    const email = 'parallel@test.local';
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        client().send('/api/auth/login', { method: 'POST', body: { email, password: `wrong-${i}` }, headers: { 'X-Client-IP': '203.0.113.20' } })
      )
    );
    const checked = results.filter((r) => r.status === 401).length;
    assert.ok(checked <= 5, `${checked} passwords checked in one burst`);
    assert.equal(results.filter((r) => r.status === 429).length, 20 - checked);
  });

  it('shows current locks and lets the developer lift them', async () => {
    const email = 'bruteforce@test.local';
    const lock = (await admin.send('/api/admin/audit/logins')).data.locks.find((l) => l.type === 'account' && l.value === email);
    assert.ok(lock && new Date(lock.until) > new Date(), 'locked account listed');
    assert.equal((await client().send('/api/admin/audit/logins/unlock', { method: 'POST', body: { type: 'account', value: email } })).status, 401);
    assert.equal((await admin.send('/api/admin/audit/logins/unlock', { method: 'POST', body: { type: 'mailbox', value: email } })).status, 400);
    const unlocked = await admin.send('/api/admin/audit/logins/unlock', { method: 'POST', body: { type: 'account', value: email } });
    assert.equal(unlocked.status, 200);
    assert.equal(unlocked.data.cleared, 5);
    assert.ok(!(await admin.send('/api/admin/audit/logins')).data.locks.some((l) => l.value === email));
    assert.equal((await client().login(email, 'wrong-after-unlock')).status, 401, 'can try again');
  });

  it('never exposes password hashes or session tokens', async () => {
    const me = await admin.send('/api/auth/me');
    assert.ok(!JSON.stringify(me.data).includes('argon2'));
    const dashboard = await admin.send('/api/admin/dashboard');
    assert.ok(!JSON.stringify(dashboard.data).includes('password'));
  });
});

describe('products & categories', () => {
  let categoryId;
  let productId;

  it('creates a category and a product that shows up on the website', async () => {
    const groups = await admin.send('/api/admin/groups');
    const group = groups.data.items.find((g) => g.name === 'Getränke');
    const category = await admin.send('/api/admin/categories', { method: 'POST', body: { groupId: group.id, name: 'Testkategorie', chatCategory: 'getraenke' } });
    assert.equal(category.status, 201);
    categoryId = category.data.item.id;

    const product = await admin.send('/api/admin/products', {
      method: 'POST',
      body: { categoryId, name: 'Test-Limo', description: 'Spritzig', emoji: '🍋', priceCents: 199 },
    });
    assert.equal(product.status, 201);
    productId = product.data.item.id;

    const live = (await site()).products.find((p) => p.id === productId);
    assert.equal(live.title, 'Test-Limo');
    assert.equal(live.category, 'Testkategorie');
    assert.equal(live.price, 199);
  });

  it('shows a price change on the website', async () => {
    const result = await admin.send(`/api/admin/products/${productId}`, { method: 'PATCH', body: { priceCents: 249 } });
    assert.equal(result.status, 200);
    assert.equal((await site()).products.find((p) => p.id === productId).price, 249);
  });

  it('marks products as coming soon / sold out and hides inactive ones', async () => {
    await admin.send(`/api/admin/products/${productId}`, { method: 'PATCH', body: { availability: 'sold_out' } });
    assert.equal((await site()).products.find((p) => p.id === productId).availability, 'sold_out');
    await admin.send(`/api/admin/products/${productId}`, { method: 'PATCH', body: { isActive: false } });
    assert.equal((await site()).products.find((p) => p.id === productId), undefined);
    await admin.send(`/api/admin/products/${productId}`, { method: 'PATCH', body: { isActive: true, availability: 'available' } });
  });

  it('assigns and replaces a product image', async () => {
    const form = new FormData();
    form.append('file', await pngFile());
    const upload = await admin.send('/api/admin/media', { method: 'POST', form });
    assert.equal(upload.status, 201);
    assert.equal(upload.data.item.mimeType, 'image/webp');
    const mediaId = upload.data.item.id;

    await admin.send(`/api/admin/products/${productId}`, { method: 'PATCH', body: { imageMediaId: mediaId } });
    const firstUrl = (await site()).products.find((p) => p.id === productId).image;
    assert.match(firstUrl, new RegExp(`/api/media/${mediaId}\\?v=`));
    const image = await request(firstUrl);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/webp');

    const replace = new FormData();
    replace.append('file', await pngFile({ r: 0, g: 120, b: 255 }));
    assert.equal((await admin.send(`/api/admin/media/${mediaId}/file`, { method: 'PUT', form: replace })).status, 200);
    const secondUrl = (await site()).products.find((p) => p.id === productId).image;
    assert.notEqual(secondUrl, firstUrl, 'URL changes so caches pick up the new image');

    const blocked = await admin.send(`/api/admin/media/${mediaId}`, { method: 'DELETE' });
    assert.equal(blocked.status, 409, 'an image in use cannot be deleted');
  });

  it('validates input', async () => {
    const result = await admin.send('/api/admin/products', { method: 'POST', body: { categoryId, name: '', priceCents: -5 } });
    assert.equal(result.status, 400);
    assert.ok(result.data.fields.name);
    assert.ok(result.data.fields.priceCents);
    const bad = await admin.send('/api/admin/products', { method: 'POST', body: { categoryId: 'not-a-uuid', name: 'x' } });
    assert.equal(bad.status, 400);
  });

  it('renames a category and refuses to delete it while it has products', async () => {
    await admin.send(`/api/admin/categories/${categoryId}`, { method: 'PATCH', body: { name: 'Umbenannt' } });
    assert.equal((await site()).products.find((p) => p.id === productId).category, 'Umbenannt');
    const blocked = await admin.send(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
    assert.equal(blocked.status, 409);
    assert.match(blocked.data.error, /enthält noch Produkte/);
  });

  it('sets exactly the chosen homepage products (at most 4)', async () => {
    const homepage = async () => (await site()).products.filter((p) => p.isHighlight).sort((a, b) => a.highlightOrder - b.highlightOrder);
    const original = (await homepage()).map((p) => ({ id: p.id, badge: p.badge }));
    const set = (items) => admin.send('/api/admin/products/highlights', { method: 'POST', body: { items } });

    assert.equal((await set([{ id: productId, badge: 'NEU' }, original[0]])).status, 200);
    const now = await homepage();
    assert.deepEqual(now.map((p) => p.id), [productId, original[0].id]);
    assert.equal(now[0].badge, 'NEU');

    const five = [...original, { id: productId }];
    assert.equal((await set(five)).status, 400);
    assert.equal((await set([{ id: productId }, { id: productId }])).status, 400);
    assert.equal((await set([{ id: '00000000-0000-4000-8000-000000000000' }])).status, 400);
    // The product form can't sneak in a fifth one.
    await admin.send(`/api/admin/products/${original[1].id}`, { method: 'PATCH', body: { isHighlight: true } });
    assert.equal((await homepage()).length, 2);

    assert.equal((await set(original)).status, 200);
    assert.deepEqual((await homepage()).map((p) => p.id), original.map((p) => p.id));
  });

  it('keeps at most 4 homepage products when two saves overlap', async () => {
    const original = (await site()).products.filter((p) => p.isHighlight).sort((a, b) => a.highlightOrder - b.highlightOrder).map((p) => ({ id: p.id, badge: p.badge }));
    const ids = (await admin.send('/api/admin/products')).data.items.map((p) => p.id);
    for (let round = 0; round < 5; round += 1) {
      const sets = Array.from({ length: 6 }, (_, i) => ids.slice(i * 4 + round, i * 4 + round + 4).map((id) => ({ id })));
      await Promise.all(sets.map((items) => admin.send('/api/admin/products/highlights', { method: 'POST', body: { items } })));
      const { rows } = await query('SELECT count(*)::int AS n FROM products WHERE is_highlight');
      assert.ok(rows[0].n <= 4, `${rows[0].n} homepage products`);
    }
    await admin.send('/api/admin/products/highlights', { method: 'POST', body: { items: original } });
  });

  it('changes several products at once', async () => {
    const items = (await admin.send('/api/admin/products')).data.items.slice(0, 3);
    const ids = items.map((p) => p.id);
    const target = (await admin.send('/api/admin/categories')).data.items.at(-1).id;
    const bulk = (body) => admin.send('/api/admin/products/bulk', { method: 'POST', body });
    const result = await bulk({ ids, changes: { availability: 'sold_out', priceCents: 249, categoryId: target, name: 'Ignoriert' } });
    assert.equal(result.status, 200);
    assert.equal(result.data.updated, 3);
    const after = (await admin.send('/api/admin/products')).data.items.filter((p) => ids.includes(p.id));
    for (const product of after) {
      assert.deepEqual([product.availability, product.priceCents, product.categoryId], ['sold_out', 249, target]);
      assert.equal(product.name, items.find((p) => p.id === product.id).name, 'other fields untouched');
    }
    for (const body of [{ ids, changes: {} }, { ids: [], changes: { isActive: true } }, { ids, changes: { availability: 'gratis' } }, { ids: ['x'], changes: { isActive: true } }]) {
      assert.equal((await bulk(body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await bulk({ ids, changes: { categoryId: '00000000-0000-4000-8000-000000000000' } })).status, 400, 'unknown category');
    for (const p of items) {
      await admin.send(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { availability: p.availability, priceCents: p.priceCents, categoryId: p.categoryId } });
    }
  });

  it('reorders and deletes', async () => {
    const other = await admin.send('/api/admin/products', { method: 'POST', body: { categoryId, name: 'Zweites Produkt' } });
    assert.equal((await admin.send('/api/admin/products/reorder', { method: 'POST', body: { ids: [other.data.item.id, productId] } })).status, 200);
    const order = (await site()).products.filter((p) => p.category === 'Umbenannt').map((p) => p.title);
    assert.deepEqual(order, ['Zweites Produkt', 'Test-Limo']);

    for (const id of [productId, other.data.item.id]) assert.equal((await admin.send(`/api/admin/products/${id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await site()).products.some((p) => p.id === productId), false);
    assert.equal((await admin.send(`/api/admin/categories/${categoryId}`, { method: 'DELETE' })).status, 200);
  });

  it('treats injection attempts as plain text', async () => {
    const result = await admin.send(`/api/admin/media?search=${encodeURIComponent("x' OR 1=1; DROP TABLE products; --")}`);
    assert.equal(result.status, 200);
    assert.ok((await query('SELECT count(*)::int AS n FROM products')).rows[0].n > 0);
    const product = await admin.send('/api/admin/products', {
      method: 'POST',
      body: { categoryId: (await admin.send('/api/admin/categories')).data.items[0].id, name: "Robert'); DROP TABLE products;--" },
    });
    assert.equal(product.status, 201);
    assert.equal(product.data.item.name, "Robert'); DROP TABLE products;--");
    await admin.send(`/api/admin/products/${product.data.item.id}`, { method: 'DELETE' });
  });
});

describe('events', () => {
  const inDays = (days, hour = 18) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };
  let eventId;

  it('keeps drafts off the website and shows published events', async () => {
    const created = await admin.send('/api/admin/events', {
      method: 'POST',
      body: { title: 'Verkostung', startsAt: inDays(3), endsAt: inDays(3, 21), location: 'Im Laden', admissionPriceCents: 0 },
    });
    assert.equal(created.status, 201);
    eventId = created.data.item.id;
    assert.equal(created.data.item.status, 'draft');
    assert.equal((await site()).events.current.length, 0);

    const published = await admin.send(`/api/admin/events/${eventId}`, { method: 'PATCH', body: { status: 'published' } });
    assert.ok(published.data.item.publishedAt);
    const live = (await site()).events.current;
    assert.equal(live.length, 1);
    assert.equal(live[0].title, 'Verkostung');
    assert.equal(live[0].price, 0);
  });

  it('hides deactivated events', async () => {
    await admin.send(`/api/admin/events/${eventId}`, { method: 'PATCH', body: { isActive: false } });
    assert.equal((await site()).events.current.length, 0);
    await admin.send(`/api/admin/events/${eventId}`, { method: 'PATCH', body: { isActive: true } });
  });

  it('archives past events automatically', async () => {
    const past = await admin.send('/api/admin/events', {
      method: 'POST',
      body: { title: 'Sommerfest', startsAt: inDays(-10), endsAt: inDays(-10, 23), status: 'published' },
    });
    const data = await site();
    assert.deepEqual(data.events.current.map((e) => e.title), ['Verkostung']);
    assert.equal(data.events.past.length, 0, 'archive not listed');
    await admin.send(`/api/admin/events/${past.data.item.id}`, { method: 'DELETE' });
  });

  it('rejects an end before the start', async () => {
    const result = await admin.send('/api/admin/events', { method: 'POST', body: { title: 'X', startsAt: inDays(5), endsAt: inDays(4) } });
    assert.equal(result.status, 400);
    assert.ok(result.data.fields.endsAt);
  });

  it('rejects dates the database cannot store with a 400', async () => {
    for (const startsAt of ['0000-01-01T00:00:00Z', '+275760-09-13T00:00:00Z']) {
      const result = await admin.send('/api/admin/events', { method: 'POST', body: { title: 'X', startsAt } });
      assert.equal(result.status, 400, startsAt);
    }
  });

  it('stores a gallery in order', async () => {
    const ids = [];
    for (const color of [{ r: 1, g: 2, b: 3 }, { r: 200, g: 100, b: 0 }]) {
      const form = new FormData();
      form.append('file', await pngFile(color));
      ids.push((await admin.send('/api/admin/media', { method: 'POST', form })).data.item.id);
    }
    await admin.send(`/api/admin/events/${eventId}`, { method: 'PATCH', body: { galleryMediaIds: [ids[1], ids[0]], coverMediaId: ids[0] } });
    const live = (await site()).events.current[0];
    assert.equal(live.gallery.length, 2);
    assert.match(live.gallery[0], new RegExp(ids[1]));
    assert.match(live.image, new RegExp(ids[0]));
  });
});

describe('banners, promotions, content, hours', () => {
  it('activates, schedules and deactivates a banner', async () => {
    const banner = await admin.send('/api/admin/banners', { method: 'POST', body: { text: 'Heute Sonderaktion', isActive: true } });
    assert.equal(banner.status, 201);
    assert.deepEqual((await site()).banners.map((b) => b.text), ['Heute Sonderaktion']);

    await admin.send(`/api/admin/banners/${banner.data.item.id}`, { method: 'PATCH', body: { isActive: false } });
    assert.equal((await site()).banners.length, 0);

    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    await admin.send(`/api/admin/banners/${banner.data.item.id}`, { method: 'PATCH', body: { isActive: true, startsAt: tomorrow } });
    assert.equal((await site()).banners.length, 0, 'scheduled banners wait for their start');

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    await admin.send(`/api/admin/banners/${banner.data.item.id}`, { method: 'PATCH', body: { startsAt: null, endsAt: yesterday } });
    assert.equal((await site()).banners.length, 0, 'expired banners disappear');
  });

  it('rejects script links', async () => {
    const result = await admin.send('/api/admin/banners', { method: 'POST', body: { text: 'x', linkUrl: 'javascript:alert(1)' } });
    assert.equal(result.status, 400);
    assert.ok(result.data.fields.linkUrl);
  });

  it('shows active promotions', async () => {
    await admin.send('/api/admin/promotions', { method: 'POST', body: { title: '2 für 4 €', isActive: true, priceText: '4 €' } });
    assert.deepEqual((await site()).promotions.map((p) => p.title), ['2 für 4 €']);
  });

  it('updates opening hours with validation', async () => {
    const hours = (await admin.send('/api/admin/hours')).data.days;
    const days = hours.map((d) => ({ weekday: d.weekday, open: d.open, close: d.close, closed: d.weekday === 0 }));
    assert.equal((await admin.send('/api/admin/hours', { method: 'PUT', body: { days } })).status, 200);
    assert.equal((await site()).hours.find((d) => d.jsDay === 0).closed, true);
    days[0] = { ...days[0], open: '20:00', close: '08:00' };
    assert.equal((await admin.send('/api/admin/hours', { method: 'PUT', body: { days } })).status, 400);
  });

  it('manages days that differ from the weekly plan', async () => {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
    const day = (offset) => {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    };
    const special = (body, id) => admin.send(`/api/admin/hours/special${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body });
    const closed = await special({ day: day(3), closed: true, note: 'Betriebsurlaub' });
    assert.equal(closed.status, 201);
    const short = await special({ day: day(5), closed: false, open: '10:00', close: '14:00' });
    assert.equal(short.status, 201);
    const past = await special({ day: day(-2), closed: true });
    assert.equal(past.status, 201);
    assert.equal((await special({ day: day(3), closed: false, open: '08:00', close: '12:00' })).status, 409, 'one entry per day');
    for (const body of [{ day: '2026-02-30', closed: true }, { day: 'morgen', closed: true }, { day: day(6), closed: false }, { day: day(6), closed: false, open: '14:00', close: '10:00' }, { day: day(6), closed: true, note: 'x'.repeat(81) }]) {
      assert.equal((await special(body)).status, 400, JSON.stringify(body));
    }

    const live = (await site()).specialHours;
    assert.deepEqual(live.map((d) => d.date), [day(3), day(5)], 'only upcoming days are public');
    assert.deepEqual([live[0].closed, live[0].note], [true, 'Betriebsurlaub']);
    assert.deepEqual([live[1].closed, live[1].open, live[1].close], [false, '10:00', '14:00']);

    const edited = await special({ day: day(5), closed: false, open: '09:00', close: '13:00', note: 'Kurzer Tag' }, short.data.item.id);
    assert.equal(edited.status, 200);
    assert.equal((await site()).specialHours[1].open, '09:00');
    assert.ok((await admin.send('/api/admin/hours/special')).data.items.some((d) => d.day === day(-2)), 'the admin still sees last week');

    for (const item of [closed, short, past]) assert.equal((await admin.send(`/api/admin/hours/special/${item.data.item.id}`, { method: 'DELETE' })).status, 200);
    assert.deepEqual((await site()).specialHours, []);
  });

  it('rejects files that are not images', async () => {
    const form = new FormData();
    form.append('file', new File(['<svg onload=alert(1)>'], 'evil.svg', { type: 'image/svg+xml' }));
    const result = await admin.send('/api/admin/media', { method: 'POST', form });
    assert.equal(result.status, 400);
  });

  it('records changes in the audit log', async () => {
    const log = await admin.send('/api/admin/audit');
    assert.ok(log.data.items.some((entry) => entry.entityType === 'banner' && entry.action === 'create'));
    for (const params of ['limit=1.5&offset=2.5', 'limit=1e400&offset=1e30', 'limit=abc&offset=-3']) {
      assert.equal((await admin.send(`/api/admin/audit?${params}`)).status, 200, params);
    }
  });
});

describe('password change', () => {
  it('needs the current password, then logs out other sessions', async () => {
    const other = client();
    await other.login();
    const wrong = await admin.send('/api/auth/password', { method: 'POST', body: { currentPassword: 'nope', newPassword: 'Ein-Neues-Passwort-2026' } });
    assert.equal(wrong.status, 400);
    const weak = await admin.send('/api/auth/password', { method: 'POST', body: { currentPassword: PASSWORD, newPassword: 'kurz' } });
    assert.equal(weak.status, 400);
    const ok = await admin.send('/api/auth/password', { method: 'POST', body: { currentPassword: PASSWORD, newPassword: 'Ein-Neues-Passwort-2026' } });
    assert.equal(ok.status, 200);
    assert.equal((await other.send('/api/admin/dashboard')).status, 401, 'other session ended');
    assert.equal((await admin.send('/api/admin/dashboard')).status, 200, 'own session stays');
    assert.equal((await client().login(EMAIL, 'Ein-Neues-Passwort-2026')).status, 200);
  });
});

describe('admin accounts', () => {
  const OWN = 'Ein-Neues-Passwort-2026'; // set by the password-change test above
  let colleagueId;

  it('creates a second account after confirming the own password', async () => {
    const wrong = await admin.send('/api/admin/users', {
      method: 'POST',
      body: { email: 'kollege@test.local', displayName: 'Kollege', password: 'Sicheres-Teampasswort-2026', currentPassword: 'falsch' },
    });
    assert.equal(wrong.status, 400, JSON.stringify(wrong.data));
    assert.ok(wrong.data.fields?.currentPassword, JSON.stringify(wrong.data));
    const weak = await admin.send('/api/admin/users', {
      method: 'POST', body: { email: 'kollege@test.local', password: 'kurz', currentPassword: OWN },
    });
    assert.ok(weak.data.fields.password);
    const created = await admin.send('/api/admin/users', {
      method: 'POST',
      body: { email: 'Kollege@Test.local', displayName: 'Kollege', password: 'Sicheres-Teampasswort-2026', currentPassword: OWN },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.item.email, 'kollege@test.local');
    colleagueId = created.data.item.id;
    const duplicate = await admin.send('/api/admin/users', {
      method: 'POST', body: { email: 'kollege@test.local', password: 'Noch-Ein-Passwort-2026', currentPassword: OWN },
    });
    assert.equal(duplicate.status, 409);
    assert.equal((await client().login('kollege@test.local', 'Sicheres-Teampasswort-2026')).status, 200);
  });

  it('sets another account\'s password and logs it out', async () => {
    const colleague = client();
    await colleague.login('kollege@test.local', 'Sicheres-Teampasswort-2026');
    const result = await admin.send(`/api/admin/users/${colleagueId}/password`, {
      method: 'POST', body: { password: 'Ganz-Neues-Teampasswort-26', currentPassword: OWN },
    });
    assert.equal(result.status, 200);
    assert.equal((await colleague.send('/api/admin/dashboard')).status, 401);
    assert.equal((await client().login('kollege@test.local', 'Ganz-Neues-Teampasswort-26')).status, 200);
  });

  it('never deletes the own account, deletes others with confirmation', async () => {
    const me = (await admin.send('/api/admin/users')).data.items.find((u) => u.isSelf);
    assert.equal((await admin.send(`/api/admin/users/${me.id}`, { method: 'DELETE', body: { currentPassword: OWN } })).status, 400);
    assert.equal((await admin.send(`/api/admin/users/${colleagueId}`, { method: 'DELETE', body: { currentPassword: 'falsch' } })).status, 400);
    assert.equal((await admin.send(`/api/admin/users/${colleagueId}`, { method: 'DELETE', body: { currentPassword: OWN } })).status, 200);
    assert.equal((await client().login('kollege@test.local', 'Ganz-Neues-Teampasswort-26')).status, 401);
  });
});

describe('database privileges', () => {
  it('the website\'s database user can read and write rows, nothing more', async () => {
    const db = new pg.Client({ connectionString: appUrl });
    await db.connect();
    try {
      assert.ok((await db.query('SELECT count(*) FROM products')).rows[0]);
      for (const sql of [
        'DROP TABLE products',
        'TRUNCATE products',
        'ALTER TABLE products ADD COLUMN hacked text',
        'CREATE TABLE hacked (id int)',
        'DELETE FROM schema_migrations',
        "CREATE ROLE intruder LOGIN PASSWORD 'x'",
        "SELECT pg_read_file('/etc/passwd')",
        "COPY products TO PROGRAM 'id'",
      ]) {
        await assert.rejects(db.query(sql), (error) => ['42501', '42P01'].includes(error.code) || /permission denied|must be/.test(error.message), sql);
      }
      assert.equal((await db.query('SHOW statement_timeout')).rows[0].statement_timeout, '15s');
    } finally {
      await db.end();
    }
  });
});

describe('roles', () => {
  const OWN = 'Ein-Neues-Passwort-2026';

  it('owners manage the daily business but not the developer areas', async () => {
    const created = await admin.send('/api/admin/users', {
      method: 'POST',
      body: { email: 'laden@test.local', displayName: 'Laden', role: 'owner', password: 'Sicheres-Shoppasswort-2026', currentPassword: OWN },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.item.role, 'owner');
    const owner = client();
    const login = await owner.login('laden@test.local', 'Sicheres-Shoppasswort-2026');
    assert.equal(login.data.user.role, 'owner');

    for (const path of ['/api/admin/dashboard', '/api/admin/products', '/api/admin/events', '/api/admin/banners', '/api/admin/media', '/api/admin/hours', '/api/admin/meta']) {
      assert.equal((await owner.send(path)).status, 200, path);
    }
    for (const path of ['/api/admin/users', '/api/admin/backup', '/api/admin/audit']) {
      assert.equal((await owner.send(path)).status, 403, path);
    }
    assert.equal((await owner.send('/api/admin/users', { method: 'POST', body: {} })).status, 403);
    assert.equal((await owner.send('/api/admin/audit/logins')).status, 403);
    assert.equal((await owner.send('/api/admin/audit/logins/unlock', { method: 'POST', body: { type: 'ip', value: '1.2.3.4' } })).status, 403);
    assert.equal((await owner.send('/api/admin/hours/special')).status, 200, 'owners manage special days');
    assert.equal((await owner.send('/api/auth/password', { method: 'POST', body: { currentPassword: 'x', newPassword: 'y' } })).status, 403);
    const ownerDashboard = (await owner.send('/api/admin/dashboard')).data;
    assert.equal(ownerDashboard.lastBackupAt, undefined, 'no backup info for owners');
    assert.equal(ownerDashboard.recent, undefined, 'no change log for owners');
    const category = (await owner.send('/api/admin/categories')).data.items[0];
    assert.equal((await owner.send('/api/admin/products', { method: 'POST', body: { categoryId: category.id, name: 'Inhaber-Produkt' } })).status, 201);
  });

  it('nobody can change their own role', async () => {
    const me = (await admin.send('/api/admin/users')).data.items.find((u) => u.isSelf);
    assert.equal((await admin.send(`/api/admin/users/${me.id}`, { method: 'PATCH', body: { role: 'owner' } })).status, 400);
  });
});

describe('backup & restore', () => {
  it('downloads a complete backup and restores it exactly', async () => {
    const { readBackup, restoreBackup } = await import('../../server/lib/backup.js');
    const { Readable } = await import('node:stream');
    const response = await admin.send('/api/admin/backup');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /snackpoint-backup-.*\.json\.gz/);
    const data = await readBackup(Readable.from([Buffer.from(response.data)]));
    const before = (await site()).products.length;
    assert.equal(data.tables.products.length, (await query('SELECT count(*)::int AS n FROM products')).rows[0].n);
    assert.ok(data.tables.media.length > 0 && data.tables.media[0].data.$bytes, 'images are included');
    assert.ok(!('admin_sessions' in data.tables), 'no sessions in the file');

    await query("DELETE FROM products WHERE name = 'Kartoffelchips'");
    // Restoring is an owner task (npm run db:restore), not something the API can do.
    await assert.rejects(restoreBackup(data, { log: () => {} }), /permission denied|must be owner/);
    await useConnection(OWNER_URL);
    await restoreBackup(data, { log: () => {} });
    await useConnection(appUrl);
    assert.equal((await site()).products.length, before);
    const image = data.tables.media[0];
    assert.equal((await request(`/api/media/${image.id}`)).status, 200, 'restored images are served');
    assert.equal((await admin.send('/api/admin/dashboard')).status, 401, 'sessions end after a restore');
  });
});

describe('product wishes', () => {
  const visitor = (ip) => ({ ...VIA_WORKER, 'X-Client-IP': ip, Origin: ORIGIN, 'Content-Type': 'application/json' });
  const wish = (body, ip = '198.51.100.1') =>
    request('/api/public/wishes', { method: 'POST', headers: visitor(ip), body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, data: await r.json() }));
  const list = (ip = '198.51.100.1') => request('/api/public/wishes', { headers: visitor(ip) }).then((r) => r.json());
  const vote = (id, ip, method = 'POST') =>
    request(`/api/public/wishes/${id}/vote`, { method, headers: visitor(ip) }).then(async (r) => ({ status: r.status, data: await r.json() }));
  let wishId;

  before(async () => {
    // The restore test above logged everyone out.
    admin = client();
    assert.equal((await admin.login(EMAIL, 'Ein-Neues-Passwort-2026')).status, 200);
  });

  it('accepts a wish but only shows it after approval', async () => {
    const result = await wish({ name: '  Takis   Blue Heat ', note: 'Die blauen bitte' });
    assert.equal(result.status, 201);
    assert.equal((await list()).items.length, 0, 'not public before approval');
    const admin_ = (await admin.send('/api/admin/wishes')).data.items;
    assert.equal(admin_[0].name, 'Takis Blue Heat');
    assert.equal(admin_[0].status, 'new');
    wishId = admin_[0].id;
    await admin.send(`/api/admin/wishes/${wishId}`, { method: 'PATCH', body: { status: 'approved' } });
    assert.deepEqual((await list()).items.map((w) => w.name), ['Takis Blue Heat']);
  });

  it('folds duplicates into one wish and counts them as votes', async () => {
    const again = await wish({ name: 'takis blue-heat!' }, '198.51.100.2');
    assert.match(again.data.message, /Stimme/);
    const item = (await list('198.51.100.2')).items[0];
    assert.equal(item.mentions, 2);
    assert.equal(item.votes, 1);
    assert.equal(item.voted, true);
  });

  it('allows one vote per visitor and taking it back', async () => {
    assert.equal((await vote(wishId, '198.51.100.3')).data.votes, 2);
    assert.equal((await vote(wishId, '198.51.100.3')).data.votes, 2, 'second vote ignored');
    assert.equal((await vote(wishId, '198.51.100.3', 'DELETE')).data.votes, 1);
  });

  it('rejects links, empty names, bots and floods', async () => {
    assert.equal((await wish({ name: 'Billig bei www.spam.de' })).status, 400);
    assert.equal((await wish({ name: '!!' })).status, 400);
    const bot = await wish({ name: 'Bot-Produkt', website: 'http://x' });
    assert.equal(bot.status, 200);
    assert.equal((await admin.send('/api/admin/wishes')).data.items.some((w) => w.name === 'Bot-Produkt'), false, 'honeypot not saved');
    let last;
    for (let i = 0; i < 6; i += 1) last = await wish({ name: `Flut ${i}` }, '198.51.100.9');
    assert.equal(last.status, 429);
  });

  it('holds the submission limit for parallel requests', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => wish({ name: `Parallel ${i}` }, '198.51.100.20')));
    assert.equal(results.filter((r) => r.status === 201).length, 5);
    assert.equal(results.filter((r) => r.status === 429).length, 15);
  });

  it('cannot vote on hidden wishes, and only the team manages them', async () => {
    const hidden = (await admin.send('/api/admin/wishes')).data.items.find((w) => w.status === 'new');
    assert.equal((await vote(hidden.id, '198.51.100.4')).status, 404);
    assert.equal((await client().send('/api/admin/wishes')).status, 401);
    const foreign = await request('/api/public/wishes', { method: 'POST', headers: { ...visitor('198.51.100.5'), Origin: 'https://evil.example' }, body: JSON.stringify({ name: 'X Y' }) });
    assert.equal(foreign.status, 403);
  });

  it('merges a duplicate into another wish', async () => {
    const created = await wish({ name: 'Blaue Takis' }, '198.51.100.6');
    assert.equal(created.status, 201);
    const source = (await admin.send('/api/admin/wishes')).data.items.find((w) => w.name === 'Blaue Takis');
    const merged = await admin.send(`/api/admin/wishes/${source.id}/merge`, { method: 'POST', body: { targetId: wishId } });
    assert.equal(merged.status, 200);
    assert.equal(merged.data.item.mentions, 3);
    assert.equal((await admin.send('/api/admin/wishes')).data.items.some((w) => w.id === source.id), false);
  });
});

describe('database outages', () => {
  it('rolls back and keeps running when the connection drops mid-transaction', async () => {
    const { transaction } = await import('../../server/db/pool.js');
    const count = async () => (await query(`SELECT count(*)::int AS n FROM events WHERE title = 'Abgebrochen'`)).rows[0].n;
    const killer = new pg.Client({ connectionString: OWNER_URL });
    await killer.connect();
    // In production an unhandled error here ends the Node process.
    const crashes = [];
    const onCrash = (error) => crashes.push(error.message);
    process.prependListener('uncaughtException', onCrash);
    try {
      await assert.rejects(
        transaction(async (db) => {
          await db.query(`INSERT INTO events (title, starts_at) VALUES ('Abgebrochen', now())`);
          const { rows } = await db.query('SELECT pg_backend_pid() AS pid');
          setTimeout(() => killer.query('SELECT pg_terminate_backend($1)', [rows[0].pid]).catch(() => {}), 100);
          await db.query('SELECT pg_sleep(5)');
        })
      );
      // The dropped connection reports its end a moment later; that must not crash the process.
      await new Promise((resolve) => setTimeout(resolve, 300));
    } finally {
      process.off('uncaughtException', onCrash);
      await killer.end();
    }
    assert.deepEqual(crashes, [], 'no uncaught error');
    assert.equal(await count(), 0, 'nothing half-written');
    assert.equal((await request('/api/public/site')).status, 200, 'the pool recovers');
  });
});
