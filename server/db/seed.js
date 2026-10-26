// Moves the website's original content (seedData.js) into the database.
// Safe to run on every deploy: the content is imported exactly once (a
// marker row remembers it — a list the owner emptied on purpose stays
// empty), and afterwards only text/setting keys added in a newer version
// are filled in. An existing edit is never overwritten.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transaction } from './pool.js';
import { prepareOriginal } from '../lib/images.js';
import { CONTENT_FIELDS, SETTINGS_DEFAULTS } from '../lib/contentRegistry.js';
import {
  CATALOG_PRODUCTS, CHAT_PRODUCTS, CONTENT_IMAGES, GROUPS, HIGHLIGHT_PRODUCTS, OPENING_HOURS, REVIEWS, SERVICES,
} from './seedData.js';

const PUBLIC_DIR = fileURLToPath(new URL('../../public/', import.meta.url));

const isEmpty = async (db, table) => (await db.query(`SELECT NOT EXISTS (SELECT 1 FROM ${table}) AS empty`)).rows[0].empty;

/** Imports a file from public/ into the media library once (by checksum). */
async function importPublicImage(db, cache, file) {
  if (cache.has(file)) return cache.get(file);
  const image = await prepareOriginal(await readFile(PUBLIC_DIR + file));
  const existing = await db.query('SELECT id FROM media WHERE checksum = $1 LIMIT 1', [image.checksum]);
  const id = existing.rows[0]?.id ?? (
    await db.query(
      `INSERT INTO media (original_name, alt_text, mime_type, width, height, size_bytes, checksum, data, thumb, thumb_mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [file.split('/').pop(), '', image.mimeType, image.width, image.height, image.data.length, image.checksum, image.data, image.thumb, image.thumbMimeType]
    )
  ).rows[0].id;
  cache.set(file, id);
  return id;
}

async function seedCatalog(db, log) {
  if (!(await isEmpty(db, 'product_groups'))) return log('  · Produkte: bereits vorhanden, übersprungen');
  const categoryIds = new Map();
  for (const [groupIndex, group] of GROUPS.entries()) {
    const { rows } = await db.query(
      `INSERT INTO product_groups (slug, name, emoji, notice, age_restricted, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [group.slug, group.name, group.emoji, group.notice ?? '', Boolean(group.ageRestricted), (groupIndex + 1) * 10]
    );
    for (const [categoryIndex, category] of group.categories.entries()) {
      const result = await db.query(
        `INSERT INTO product_categories (group_id, name, chat_category, sort_order) VALUES ($1, $2, $3, $4) RETURNING id`,
        [rows[0].id, category.name, category.chat, (categoryIndex + 1) * 10]
      );
      categoryIds.set(category.name, result.rows[0].id);
    }
  }

  const insert = (product, extra, sortOrder) =>
    db.query(
      `INSERT INTO products (category_id, name, brand, description, emoji, search_terms, tags, in_chat, chat_category,
         show_in_catalog, is_highlight, highlight_badge, sort_order, highlight_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        categoryIds.get(product.category), product.name, product.brand ?? '', product.description ?? '', product.emoji ?? '',
        product.terms ?? [], product.tags ?? [], product.inChat ?? true, product.chatCategory ?? null,
        extra.showInCatalog, extra.isHighlight, product.badge ?? '', sortOrder, extra.highlightOrder ?? 0,
      ]
    );

  for (const [i, product] of CATALOG_PRODUCTS.entries()) await insert(product, { showInCatalog: true, isHighlight: false }, (i + 1) * 10);
  for (const [i, product] of HIGHLIGHT_PRODUCTS.entries()) {
    await insert({ ...product, inChat: false }, { showInCatalog: false, isHighlight: true, highlightOrder: (i + 1) * 10 }, 1000 + i * 10);
  }
  for (const [i, product] of CHAT_PRODUCTS.entries()) await insert(product, { showInCatalog: false, isHighlight: false }, 2000 + i * 10);
  log(`  ✓ ${GROUPS.length} Bereiche, ${categoryIds.size} Kategorien, ${CATALOG_PRODUCTS.length + HIGHLIGHT_PRODUCTS.length + CHAT_PRODUCTS.length} Produkte`);
}

async function seedServices(db, log, images) {
  if (!(await isEmpty(db, 'services'))) return log('  · Leistungen: bereits vorhanden, übersprungen');
  for (const [i, service] of SERVICES.entries()) {
    const logoId = service.logo ? await importPublicImage(db, images, service.logo) : null;
    await db.query(
      `INSERT INTO services (slug, title, description, icon, logo_media_id, gradient, badge, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [service.slug, service.title, service.description, service.icon, logoId, service.gradient, service.badge ?? '', (i + 1) * 10]
    );
  }
  log(`  ✓ ${SERVICES.length} Leistungen`);
}

async function seedReviews(db, log) {
  if (!(await isEmpty(db, 'reviews'))) return log('  · Bewertungen: bereits vorhanden, übersprungen');
  for (const [i, review] of REVIEWS.entries()) {
    await db.query(
      `INSERT INTO reviews (author_name, initials, color, time_label, text, sort_order) VALUES ($1, $2, $3, $4, $5, $6)`,
      [review.name, review.initials, review.color, review.time, review.text, (i + 1) * 10]
    );
  }
  log(`  ✓ ${REVIEWS.length} Bewertungen`);
}

async function seedHours(db, log) {
  if (!(await isEmpty(db, 'opening_hours'))) return log('  · Öffnungszeiten: bereits vorhanden, übersprungen');
  for (const [i, entry] of OPENING_HOURS.entries()) {
    await db.query(
      `INSERT INTO opening_hours (weekday, position, day_name, open_time, close_time, is_closed) VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.weekday, i, entry.day, entry.open, entry.close, entry.closed]
    );
  }
  log('  ✓ Öffnungszeiten');
}

async function seedContent(db, log, images) {
  let added = 0;
  for (const field of CONTENT_FIELDS) {
    const mediaId = field.type === 'image' && CONTENT_IMAGES[field.key]
      ? await importPublicImage(db, images, CONTENT_IMAGES[field.key])
      : null;
    const { rowCount } = await db.query(
      'INSERT INTO site_content (key, value, media_id) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING',
      [field.key, field.default ?? '', mediaId]
    );
    added += rowCount;
  }
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const { rowCount } = await db.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, value]);
    added += rowCount;
  }
  log(added ? `  ✓ ${added} Texte/Einstellungen ergänzt` : '  · Texte & Einstellungen: vollständig, übersprungen');
}

// Settings row marking the one-time import (not part of SETTINGS_DEFAULTS,
// so it never reaches the API).
const SEED_MARKER = '_seeded';

export async function seed({ log = console.log } = {}) {
  await transaction(async (db) => {
    const images = new Map();
    const done = (await db.query('SELECT 1 FROM settings WHERE key = $1', [SEED_MARKER])).rowCount > 0;
    if (done) {
      log('  · Ursprüngliche Inhalte wurden bereits übernommen');
    } else {
      await seedCatalog(db, log);
      await seedServices(db, log, images);
      await seedReviews(db, log);
      await seedHours(db, log);
    }
    await seedContent(db, log, images);
    if (!done) {
      await db.query('INSERT INTO settings (key, value) VALUES ($1, $2)', [SEED_MARKER, { at: new Date().toISOString() }]);
    }
  });
}
