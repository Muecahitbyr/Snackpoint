const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

export function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => UMLAUTS[char])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug || 'eintrag';
}

/** A slug not yet used in `table` ("lotto", "lotto-2", …). */
export async function uniqueSlug(db, table, text) {
  const base = slugify(text);
  const { rows } = await db.query(`SELECT slug FROM ${table} WHERE slug = $1 OR slug LIKE $2`, [base, `${base}-%`]);
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
