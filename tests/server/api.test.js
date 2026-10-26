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
delete process.env.NODE_ENV;

const { query, closePool } = await import('../../server/db/pool.js');
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

before(async () => {
  await query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate({ log: () => {} });
  await seed({ log: () => {} });
  await query('INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)', [EMAIL, await hashPassword(PASSWORD)]);
  admin = client();
  assert.equal((await admin.login()).status, 200);
});

after(async () => {
  await closePool();
});

describe('migrated content', () => {
  it('serves every original product, service, review and the opening hours from the database', async () => {
    const data = await site();
    assert.equal(data.products.filter((p) => p.showInCatalog).length, 49);
    const highlights = data.products.filter((p) => p.isHighlight).sort((a, b) => a.highlightOrder - b.highlightOrder);
    assert.deepEqual(highlights.map((p) => p.title), ['Import-Süßwaren', 'Viral-Snacks', 'Trend-Drinks', 'Schoko-Spezialitäten']);
    assert.deepEqual(data.groups.map((g) => g.id), ['snacks', 'getraenke', 'essen', 'tabak', 'lotto', 'service']);
    assert.equal(data.services.find((s) => s.id === 'ihle').badge, 'BALD VERFÜGBAR');
    assert.equal(data.reviews.length, 5);
    assert.equal(data.hours.length, 7);
    assert.equal(data.content['hero.subtitle'], 'Der Kiosk, der dich zum Leben erweckt.');
    assert.equal(data.settings.contact.address, 'Neugablonzer Str. 25, 87600 Kaufbeuren');
    assert.deepEqual(data.events, { current: [], past: [] });
  });

  it('seeding twice changes nothing', async () => {
    const before = (await query('SELECT count(*)::int AS n FROM products')).rows[0].n;
    await seed({ log: () => {} });
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

  it('archives past events automatically and can show the archive', async () => {
    const past = await admin.send('/api/admin/events', {
      method: 'POST',
      body: { title: 'Sommerfest', startsAt: inDays(-10), endsAt: inDays(-10, 23), status: 'published' },
    });
    let data = await site();
    assert.deepEqual(data.events.current.map((e) => e.title), ['Verkostung']);
    assert.equal(data.events.past.length, 0, 'archive hidden by default');

    await admin.send('/api/admin/settings/events', { method: 'PUT', body: { autoArchive: true, showPast: true } });
    data = await site();
    assert.deepEqual(data.events.past.map((e) => e.title), ['Sommerfest']);

    await admin.send('/api/admin/settings/events', { method: 'PUT', body: { autoArchive: false, showPast: false } });
    data = await site();
    const kept = data.events.current.find((e) => e.title === 'Sommerfest');
    assert.equal(kept.isPast, true, 'without auto-archive the event stays, marked as past');

    await admin.send('/api/admin/settings/events', { method: 'PUT', body: { autoArchive: true, showPast: false } });
    await admin.send(`/api/admin/events/${past.data.item.id}`, { method: 'DELETE' });
  });

  it('rejects an end before the start', async () => {
    const result = await admin.send('/api/admin/events', { method: 'POST', body: { title: 'X', startsAt: inDays(5), endsAt: inDays(4) } });
    assert.equal(result.status, 400);
    assert.ok(result.data.fields.endsAt);
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

  it('updates website texts and refuses unknown keys', async () => {
    assert.equal((await admin.send('/api/admin/content', { method: 'PUT', body: { values: { 'hero.subtitle': 'Neuer Slogan' } } })).status, 200);
    assert.equal((await site()).content['hero.subtitle'], 'Neuer Slogan');
    const bad = await admin.send('/api/admin/content', { method: 'PUT', body: { values: { 'admin.secret': 'x' } } });
    assert.equal(bad.status, 400);
  });

  it('updates opening hours with validation', async () => {
    const hours = (await admin.send('/api/admin/hours')).data.days;
    const days = hours.map((d) => ({ weekday: d.weekday, open: d.open, close: d.close, closed: d.weekday === 0 }));
    assert.equal((await admin.send('/api/admin/hours', { method: 'PUT', body: { days } })).status, 200);
    assert.equal((await site()).hours.find((d) => d.jsDay === 0).closed, true);
    days[0] = { ...days[0], open: '20:00', close: '08:00' };
    assert.equal((await admin.send('/api/admin/hours', { method: 'PUT', body: { days } })).status, 400);
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
