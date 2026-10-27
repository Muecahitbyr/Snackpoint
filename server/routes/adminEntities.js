// Admin CRUD endpoints for the list-style content: products, groups,
// categories, events, banners and promotions.
import { z } from 'zod';
import { transaction } from '../db/pool.js';
import { audit } from '../lib/audit.js';
import { crudRoutes } from './crud.js';
import { CHAT_CATEGORY_IDS } from '../lib/chatCategories.js';
import { badRequest } from '../lib/errors.js';
import { mediaUrl } from '../lib/media.js';
import { uniqueSlug } from '../lib/slug.js';
import { cents, isoDate, link, parse, readJson, requiredText, sortOrder, text, uuid } from '../lib/validation.js';

const iso = (value) => (value ? new Date(value).toISOString() : null);
const media = (id, checksum) => (id ? { id, url: mediaUrl(id, checksum), thumbUrl: mediaUrl(id, checksum, 'thumb') } : null);
const chatCategory = z.enum(CHAT_CATEGORY_IDS).nullable();

/** Rejects an end date before the start date (looking at the stored row for fields not sent). */
function assertDateOrder(data, existing, startKey, endKey, startColumn, endColumn) {
  const start = data[startKey] !== undefined ? data[startKey] : existing?.[startColumn];
  const end = data[endKey] !== undefined ? data[endKey] : existing?.[endColumn];
  if (start && end && new Date(end) < new Date(start)) {
    throw badRequest('Das Ende liegt vor dem Beginn.', { fields: { [endKey]: 'Ende muss nach dem Beginn liegen' } });
  }
}

// ── Products ───────────────────────────────────────────────────────────────

export const products = crudRoutes({
  entity: 'product',
  table: 'products',
  columns: {
    categoryId: 'category_id', name: 'name', brand: 'brand', description: 'description', emoji: 'emoji',
    imageMediaId: 'image_media_id', priceCents: 'price_cents', availability: 'availability', isActive: 'is_active',
    showInCatalog: 'show_in_catalog',
    sortOrder: 'sort_order',
    allergens: 'allergens', additionalInfo: 'additional_info', searchTerms: 'search_terms', tags: 'tags',
    inChat: 'in_chat', chatCategory: 'chat_category',
  },
  schema: z.object({
    categoryId: uuid,
    name: requiredText(120),
    brand: text(80).optional(),
    description: text(1000).optional(),
    emoji: text(16).optional(),
    imageMediaId: uuid.nullable().optional(),
    priceCents: cents.optional(),
    availability: z.enum(['available', 'coming_soon', 'sold_out']).optional(),
    isActive: z.boolean().optional(),
    showInCatalog: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
    allergens: text(500).optional(),
    additionalInfo: text(1000).optional(),
    searchTerms: z.array(requiredText(60)).max(50).optional(),
    tags: z.array(requiredText(30)).max(20).optional(),
    inChat: z.boolean().optional(),
    chatCategory: chatCategory.optional(),
  }),
  select: `SELECT t.*, c.name AS category_name, g.id AS group_id, g.name AS group_name, g.sort_order AS group_sort,
             c.sort_order AS category_sort, m.checksum AS image_checksum
             FROM products t
             JOIN product_categories c ON c.id = t.category_id
             JOIN product_groups g ON g.id = c.group_id
             LEFT JOIN media m ON m.id = t.image_media_id`,
  orderBy: 'g.sort_order, c.sort_order, t.sort_order, t.name',
  describe: (item) => item.name,
  toJson: (row) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    groupId: row.group_id,
    groupName: row.group_name,
    name: row.name,
    brand: row.brand,
    description: row.description,
    emoji: row.emoji,
    imageMediaId: row.image_media_id,
    image: media(row.image_media_id, row.image_checksum),
    priceCents: row.price_cents,
    availability: row.availability,
    isActive: row.is_active,
    showInCatalog: row.show_in_catalog,
    isHighlight: row.is_highlight,
    highlightBadge: row.highlight_badge,
    highlightOrder: row.highlight_order,
    sortOrder: row.sort_order,
    allergens: row.allergens,
    additionalInfo: row.additional_info,
    searchTerms: row.search_terms,
    tags: row.tags,
    inChat: row.in_chat,
    chatCategory: row.chat_category,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }),
});

// ── Product groups & categories ────────────────────────────────────────────

export const groups = crudRoutes({
  entity: 'product_group',
  table: 'product_groups',
  columns: { name: 'name', emoji: 'emoji', notice: 'notice', ageRestricted: 'age_restricted', sortOrder: 'sort_order' },
  schema: z.object({
    name: requiredText(80),
    emoji: text(16).optional(),
    notice: text(500).optional(),
    ageRestricted: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
  }),
  // The slug is the page anchor (/produkte.html#lotto): set once, kept on rename.
  extraColumns: async (data, { db, existing }) => (existing ? {} : { slug: await uniqueSlug(db, 'product_groups', data.name) }),
  select: `SELECT t.*, (SELECT count(*)::int FROM product_categories c WHERE c.group_id = t.id) AS category_count
             FROM product_groups t`,
  orderBy: 't.sort_order, t.name',
  describe: (item) => item.name,
  inUseMessage: 'Der Bereich enthält noch Kategorien. Verschiebe oder lösche sie zuerst.',
  toJson: (row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    emoji: row.emoji,
    notice: row.notice,
    ageRestricted: row.age_restricted,
    sortOrder: row.sort_order,
    categoryCount: row.category_count,
    updatedAt: iso(row.updated_at),
  }),
});

export const categories = crudRoutes({
  entity: 'product_category',
  table: 'product_categories',
  columns: { groupId: 'group_id', name: 'name', chatCategory: 'chat_category', sortOrder: 'sort_order' },
  schema: z.object({
    groupId: uuid,
    name: requiredText(80),
    chatCategory: chatCategory.optional(),
    sortOrder: sortOrder.optional(),
  }),
  select: `SELECT t.*, g.name AS group_name, (SELECT count(*)::int FROM products p WHERE p.category_id = t.id) AS product_count
             FROM product_categories t JOIN product_groups g ON g.id = t.group_id`,
  orderBy: 'g.sort_order, t.sort_order, t.name',
  describe: (item) => item.name,
  inUseMessage: 'Die Kategorie enthält noch Produkte. Verschiebe oder lösche sie zuerst.',
  toJson: (row) => ({
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name,
    name: row.name,
    chatCategory: row.chat_category,
    sortOrder: row.sort_order,
    productCount: row.product_count,
    updatedAt: iso(row.updated_at),
  }),
});

// ── Events ─────────────────────────────────────────────────────────────────

export const events = crudRoutes({
  entity: 'event',
  table: 'events',
  columns: {
    title: 'title', description: 'description', location: 'location', startsAt: 'starts_at', endsAt: 'ends_at',
    admissionPriceCents: 'admission_price_cents', admissionNote: 'admission_note', status: 'status', isActive: 'is_active',
    isFeatured: 'is_featured', sortOrder: 'sort_order', coverMediaId: 'cover_media_id',
  },
  schema: z.object({
    title: requiredText(140),
    description: text(5000).optional(),
    location: text(200).optional(),
    startsAt: isoDate,
    endsAt: isoDate.nullable().optional(),
    admissionPriceCents: cents.optional(),
    admissionNote: text(120).optional(),
    status: z.enum(['draft', 'published']).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
    coverMediaId: uuid.nullable().optional(),
    galleryMediaIds: z.array(uuid).max(30).optional(),
  }),
  extraColumns: (data, { existing }) => {
    assertDateOrder(data, existing, 'startsAt', 'endsAt', 'starts_at', 'ends_at');
    const publishing = data.status === 'published' && existing?.status !== 'published';
    return publishing ? { published_at: new Date() } : {};
  },
  afterWrite: async (id, data, db) => {
    if (!data.galleryMediaIds) return;
    await db.query('DELETE FROM event_images WHERE event_id = $1', [id]);
    for (const [i, mediaId] of [...new Set(data.galleryMediaIds)].entries()) {
      await db.query('INSERT INTO event_images (event_id, media_id, sort_order) VALUES ($1, $2, $3)', [id, mediaId, i]);
    }
  },
  select: `SELECT t.*, m.checksum AS cover_checksum,
             coalesce((SELECT json_agg(json_build_object('id', gm.id, 'checksum', gm.checksum) ORDER BY ei.sort_order)
                         FROM event_images ei JOIN media gm ON gm.id = ei.media_id WHERE ei.event_id = t.id), '[]') AS gallery
             FROM events t LEFT JOIN media m ON m.id = t.cover_media_id`,
  orderBy: 't.starts_at DESC',
  describe: (item) => item.title,
  toJson: (row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    admissionPriceCents: row.admission_price_cents,
    admissionNote: row.admission_note,
    status: row.status,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    coverMediaId: row.cover_media_id,
    cover: media(row.cover_media_id, row.cover_checksum),
    gallery: row.gallery.map((image) => media(image.id, image.checksum)),
    publishedAt: iso(row.published_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }),
});

// ── Banners & promotions ───────────────────────────────────────────────────

export const banners = crudRoutes({
  entity: 'banner',
  table: 'banners',
  columns: {
    text: 'text', linkUrl: 'link_url', linkLabel: 'link_label', variant: 'variant', isActive: 'is_active',
    startsAt: 'starts_at', endsAt: 'ends_at', sortOrder: 'sort_order',
  },
  schema: z.object({
    text: requiredText(200),
    linkUrl: link.optional(),
    linkLabel: text(40).optional(),
    variant: z.enum(['promo', 'info', 'dark']).optional(),
    isActive: z.boolean().optional(),
    startsAt: isoDate.nullable().optional(),
    endsAt: isoDate.nullable().optional(),
    sortOrder: sortOrder.optional(),
  }),
  extraColumns: (data, { existing }) => {
    assertDateOrder(data, existing, 'startsAt', 'endsAt', 'starts_at', 'ends_at');
    return {};
  },
  select: 'SELECT t.* FROM banners t',
  orderBy: 't.sort_order, t.created_at DESC',
  describe: (item) => item.text,
  toJson: (row) => ({
    id: row.id,
    text: row.text,
    linkUrl: row.link_url,
    linkLabel: row.link_label,
    variant: row.variant,
    isActive: row.is_active,
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    sortOrder: row.sort_order,
    updatedAt: iso(row.updated_at),
  }),
});

export const promotions = crudRoutes({
  entity: 'promotion',
  table: 'promotions',
  columns: {
    title: 'title', description: 'description', badge: 'badge', priceText: 'price_text', emoji: 'emoji',
    imageMediaId: 'image_media_id', isActive: 'is_active', startsAt: 'starts_at', endsAt: 'ends_at', sortOrder: 'sort_order',
  },
  schema: z.object({
    title: requiredText(120),
    description: text(600).optional(),
    badge: text(30).optional(),
    priceText: text(60).optional(),
    emoji: text(16).optional(),
    imageMediaId: uuid.nullable().optional(),
    isActive: z.boolean().optional(),
    startsAt: isoDate.nullable().optional(),
    endsAt: isoDate.nullable().optional(),
    sortOrder: sortOrder.optional(),
  }),
  extraColumns: (data, { existing }) => {
    assertDateOrder(data, existing, 'startsAt', 'endsAt', 'starts_at', 'ends_at');
    return {};
  },
  select: 'SELECT t.*, m.checksum AS image_checksum FROM promotions t LEFT JOIN media m ON m.id = t.image_media_id',
  orderBy: 't.sort_order, t.created_at DESC',
  describe: (item) => item.title,
  toJson: (row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    badge: row.badge,
    priceText: row.price_text,
    emoji: row.emoji,
    imageMediaId: row.image_media_id,
    image: media(row.image_media_id, row.image_checksum),
    isActive: row.is_active,
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    sortOrder: row.sort_order,
    updatedAt: iso(row.updated_at),
  }),
});

// The "Frisch im Regal" tiles on the homepage: exactly the products chosen
// here, in this order (at most HIGHLIGHT_SLOTS). Everything else is unmarked.
export const HIGHLIGHT_SLOTS = 4;

products.post('/highlights', async (c) => {
  const { items } = parse(
    z.object({ items: z.array(z.object({ id: uuid, badge: text(30).optional() })).max(HIGHLIGHT_SLOTS) }),
    await readJson(c)
  );
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw badRequest('Ein Produkt kann nur einmal auf der Startseite stehen.');
  const names = await transaction(async (db) => {
    const { rows } = await db.query('SELECT id, name FROM products WHERE id = ANY($1)', [ids]);
    if (rows.length !== ids.length) throw badRequest('Eines der Produkte gibt es nicht mehr. Lade die Seite neu.');
    await db.query('UPDATE products SET is_highlight = false WHERE is_highlight AND NOT (id = ANY($1))', [ids]);
    for (const [i, item] of items.entries()) {
      await db.query('UPDATE products SET is_highlight = true, highlight_order = $2, highlight_badge = $3 WHERE id = $1', [
        item.id, (i + 1) * 10, item.badge ?? '',
      ]);
    }
    return ids.map((id) => rows.find((row) => row.id === id).name);
  });
  await audit(c, 'update', 'product', '', `Startseite: ${names.join(', ') || 'keine Produkte'}`);
  return c.json({ ok: true });
});
