// Input validation shared by all admin endpoints. Every request body passes
// a zod schema before it gets anywhere near the database.
import { z } from 'zod';
import { badRequest } from './errors.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuid = z.string().regex(UUID_RE, 'Ungültige ID');
export const text = (max) => z.string().trim().max(max, `Höchstens ${max} Zeichen`);
export const requiredText = (max) => text(max).min(1, 'Pflichtfeld');
export const cents = z.number().int().min(0).max(100_000_00).nullable();
export const sortOrder = z.number().int().min(-1_000_000).max(1_000_000);
export const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Ungültiges Datum');

// Links may point to pages of the site, anchors, the web, mail or phone —
// never javascript: or data: URLs.
export const link = text(500).refine(
  (value) => value === '' || /^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(value),
  'Link muss mit https://, / oder # beginnen'
);
export const httpUrl = text(500).refine((value) => value === '' || /^https:\/\//i.test(value), 'Link muss mit https:// beginnen');

/** Validates `data` or throws a 400 with per-field messages. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const fields = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_';
    fields[path] ??= issue.message;
  }
  throw badRequest('Bitte überprüfe die markierten Felder.', { fields });
}

export function parseId(value) {
  if (!UUID_RE.test(value ?? '')) throw badRequest('Ungültige ID.');
  return value;
}

export async function readJson(c) {
  try {
    return await c.req.json();
  } catch {
    throw badRequest('Ungültige Anfrage.');
  }
}
