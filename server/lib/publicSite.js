// Everything the public website shows, in one payload: only published,
// active and currently valid entries, and no internal fields.
import { query } from '../db/pool.js';
import { CONTENT_FIELDS, SETTINGS_DEFAULTS } from './contentRegistry.js';
import { mediaUrl } from './media.js';

// An event without an end time counts as running until the end of its day.
const EVENT_END_SQL = `coalesce(e.ends_at,
  (date_trunc('day', e.starts_at AT TIME ZONE 'Europe/Berlin') + interval '1 day') AT TIME ZONE 'Europe/Berlin')`;

const ACTIVE_WINDOW_SQL = `is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())`;

const iso = (value) => (value ? new Date(value).toISOString() : null);

async function loadContent() {
  const { rows } = await query(
    `SELECT sc.key, sc.value, sc.media_id, m.checksum FROM site_content sc LEFT JOIN media m ON m.id = sc.media_id`
  );
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const content = {};
  for (const field of CONTENT_FIELDS) {
    const row = byKey.get(field.key);
    content[field.key] = field.type === 'image' ? mediaUrl(row?.media_id, row?.checksum) : row?.value ?? '';
  }
  return content;
}

async function loadSettings() {
  const { rows } = await query('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(
    Object.entries(SETTINGS_DEFAULTS).map(([key, defaults]) => [key, { ...defaults, ...(stored[key] ?? {}) }])
  );
}

async function loadCatalog() {
  const [groupRows, productRows] = await Promise.all([
    query(
      `SELECT g.id, g.slug, g.name, g.emoji, g.notice, g.age_restricted,
              coalesce(json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.sort_order, c.name)
                       FILTER (WHERE c.id IS NOT NULL), '[]') AS categories
         FROM product_groups g LEFT JOIN product_categories c ON c.group_id = g.id
        GROUP BY g.id ORDER BY g.sort_order, g.name`
    ),
    query(
      `SELECT p.*, c.name AS category_name, c.chat_category AS category_chat, g.slug AS group_slug, m.checksum AS image_checksum
         FROM products p
         JOIN product_categories c ON c.id = p.category_id
         JOIN product_groups g ON g.id = c.group_id
         LEFT JOIN media m ON m.id = p.image_media_id
        WHERE p.is_active
        ORDER BY g.sort_order, c.sort_order, p.sort_order, p.name`
    ),
  ]);
  return {
    groups: groupRows.rows.map((row) => ({
      id: row.slug,
      name: row.name,
      emoji: row.emoji,
      notice: row.notice || undefined,
      ageRestricted: row.age_restricted || undefined,
      categories: row.categories.map((category) => category.name),
    })),
    products: productRows.rows.map((row) => ({
      id: row.id,
      group: row.group_slug,
      category: row.category_name,
      title: row.name,
      brand: row.brand || undefined,
      text: row.description,
      emoji: row.emoji,
      image: mediaUrl(row.image_media_id, row.image_checksum),
      price: row.price_cents,
      availability: row.availability,
      showInCatalog: row.show_in_catalog,
      isHighlight: row.is_highlight,
      badge: row.highlight_badge,
      highlightOrder: row.highlight_order,
      allergens: row.allergens || undefined,
      info: row.additional_info || undefined,
      searchTerms: row.search_terms,
      tags: row.tags,
      chatCategory: row.in_chat ? row.chat_category ?? row.category_chat ?? null : null,
    })),
  };
}

async function loadEvents(settings) {
  const { rows } = await query(
    `SELECT e.*, m.checksum AS cover_checksum, ${EVENT_END_SQL} < now() AS is_past,
            coalesce((SELECT json_agg(json_build_object('id', gm.id, 'checksum', gm.checksum) ORDER BY ei.sort_order)
                        FROM event_images ei JOIN media gm ON gm.id = ei.media_id WHERE ei.event_id = e.id), '[]') AS gallery
       FROM events e LEFT JOIN media m ON m.id = e.cover_media_id
      WHERE e.status = 'published' AND e.is_active
      ORDER BY e.is_featured DESC, e.sort_order, e.starts_at`
  );
  const toEvent = (row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: iso(row.starts_at),
    endsAt: iso(row.ends_at),
    price: row.admission_price_cents,
    priceNote: row.admission_note,
    featured: row.is_featured,
    isPast: row.is_past,
    image: mediaUrl(row.cover_media_id, row.cover_checksum),
    gallery: row.gallery.map((image) => mediaUrl(image.id, image.checksum)),
  });
  const all = rows.map(toEvent);
  if (!settings.events.autoArchive) return { current: all, past: [] };
  const past = all
    .filter((event) => event.isPast)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, 12);
  return { current: all.filter((event) => !event.isPast), past: settings.events.showPast ? past : [] };
}

export async function buildPublicSite() {
  const settings = await loadSettings();
  const [content, catalog, events, services, reviews, hours, banners, promotions] = await Promise.all([
    loadContent(),
    loadCatalog(),
    loadEvents(settings),
    query(
      `SELECT s.*, m.checksum FROM services s LEFT JOIN media m ON m.id = s.logo_media_id
        WHERE s.is_active ORDER BY s.sort_order, s.title`
    ),
    query('SELECT * FROM reviews WHERE is_active ORDER BY sort_order, created_at'),
    query('SELECT * FROM opening_hours ORDER BY position'),
    query(`SELECT * FROM banners WHERE ${ACTIVE_WINDOW_SQL} ORDER BY sort_order, created_at DESC`),
    query(
      `SELECT p.*, m.checksum FROM promotions p LEFT JOIN media m ON m.id = p.image_media_id
        WHERE ${ACTIVE_WINDOW_SQL.replaceAll(/\b(is_active|starts_at|ends_at)\b/g, 'p.$1')}
        ORDER BY p.sort_order, p.created_at DESC`
    ),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    content,
    settings,
    ...catalog,
    events,
    services: services.rows.map((row) => ({
      id: row.slug,
      title: row.title,
      text: row.description,
      icon: row.icon,
      logo: mediaUrl(row.logo_media_id, row.checksum),
      gradient: row.gradient,
      badge: row.badge || undefined,
    })),
    reviews: reviews.rows.map((row) => ({
      id: row.id,
      name: row.author_name,
      initials: row.initials,
      color: row.color,
      time: row.time_label,
      text: row.text,
    })),
    hours: hours.rows.map((row) => ({
      day: row.day_name,
      jsDay: row.weekday,
      open: row.open_time,
      close: row.close_time,
      closed: row.is_closed,
    })),
    banners: banners.rows.map((row) => ({
      id: row.id,
      text: row.text,
      linkUrl: row.link_url || undefined,
      linkLabel: row.link_label || undefined,
      variant: row.variant,
      version: iso(row.updated_at),
      endsAt: iso(row.ends_at),
    })),
    promotions: promotions.rows.map((row) => ({
      id: row.id,
      title: row.title,
      text: row.description,
      badge: row.badge || undefined,
      priceText: row.price_text || undefined,
      emoji: row.emoji,
      image: mediaUrl(row.image_media_id, row.checksum),
      endsAt: iso(row.ends_at),
    })),
  };
}
