// Moves the website's original product range and opening hours
// (seedData.js) into the database. Safe to run on every deploy: it happens
// exactly once per database (a marker row remembers it — a list the owner
// emptied on purpose stays empty) and never overwrites anything.
import { transaction } from './pool.js';
import { CATALOG_PRODUCTS, CHAT_PRODUCTS, GROUPS, HIGHLIGHT_PRODUCTS, OPENING_HOURS } from './seedData.js';

const isEmpty = async (db, table) => (await db.query(`SELECT NOT EXISTS (SELECT 1 FROM ${table}) AS empty`)).rows[0].empty;

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

// Settings row marking the one-time import (internal, never sent to the website).
const SEED_MARKER = '_seeded';

export async function seed({ log = console.log } = {}) {
  await transaction(async (db) => {
    if ((await db.query('SELECT 1 FROM settings WHERE key = $1', [SEED_MARKER])).rowCount > 0) {
      log('  · Ursprüngliche Inhalte wurden bereits übernommen');
      return;
    }
    await seedCatalog(db, log);
    await seedHours(db, log);
    await db.query('INSERT INTO settings (key, value) VALUES ($1, $2)', [SEED_MARKER, { at: new Date().toISOString() }]);
  });
}
