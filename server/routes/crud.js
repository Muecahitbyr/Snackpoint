// Shared list/create/update/delete/reorder endpoints for the admin's simple
// tables. Column names only ever come from the fixed `columns` map below, and
// every value is passed as a query parameter.
import { Hono } from 'hono';
import { query, transaction } from '../db/pool.js';
import { audit } from '../lib/audit.js';
import { mapDbError, notFound } from '../lib/errors.js';
import { parse, parseId, readJson, uuid } from '../lib/validation.js';
import { z } from 'zod';

const reorderSchema = z.object({ ids: z.array(uuid).min(1).max(1000) });

/**
 * @param {object} options
 * @param {string} options.entity      audit-log type, e.g. "product"
 * @param {string} options.table
 * @param {Record<string,string>} options.columns  body field → column
 * @param {import('zod').ZodObject} options.schema
 * @param {string} options.select      SELECT … FROM … (main table aliased as `t`)
 * @param {string} options.orderBy
 * @param {(row:any)=>any} options.toJson
 * @param {(row:any)=>string} options.describe  name for the change log
 * @param {(data:any, ctx:{db:any, existing:any})=>Promise<object>|object} [options.extraColumns]
 * @param {(id:string, data:any, db:any)=>Promise<void>} [options.afterWrite]
 * @param {string} [options.inUseMessage]  shown when a delete is blocked by references
 */
export function crudRoutes(options) {
  const { entity, table, columns, schema, select, orderBy, toJson, describe, extraColumns, afterWrite, inUseMessage } = options;
  const app = new Hono();
  const partialSchema = schema.partial();

  const fetchOne = async (db, id) => (await db.query(`${select} WHERE t.id = $1`, [id])).rows[0];

  async function write(c, id, data) {
    try {
      return await transaction(async (db) => {
        const existing = id ? await fetchOne(db, id) : null;
        if (id && !existing) throw notFound();
        const values = {};
        for (const [field, column] of Object.entries(columns)) {
          if (data[field] !== undefined) values[column] = data[field];
        }
        Object.assign(values, (await extraColumns?.(data, { db, existing })) ?? {});
        // New rows go to the end unless an explicit position was given.
        if (!id && 'sortOrder' in columns && values.sort_order === undefined) {
          values.sort_order = (await db.query(`SELECT coalesce(max(sort_order), 0) + 10 AS next FROM ${table}`)).rows[0].next;
        }
        const names = Object.keys(values);
        const params = Object.values(values);
        let rowId = id;
        if (id) {
          if (names.length) {
            const sets = names.map((name, i) => `${name} = $${i + 2}`).join(', ');
            await db.query(`UPDATE ${table} SET ${sets} WHERE id = $1`, [id, ...params]);
          }
        } else {
          const placeholders = names.map((_, i) => `$${i + 1}`).join(', ');
          const { rows } = await db.query(`INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders}) RETURNING id`, params);
          rowId = rows[0].id;
        }
        await afterWrite?.(rowId, data, db);
        return toJson(await fetchOne(db, rowId));
      });
    } catch (error) {
      throw mapDbError(error);
    }
  }

  app.get('/', async (c) => {
    const { rows } = await query(`${select} ORDER BY ${orderBy}`);
    return c.json({ items: rows.map(toJson) });
  });

  app.get('/:id', async (c) => {
    const row = await fetchOne({ query }, parseId(c.req.param('id')));
    if (!row) throw notFound();
    return c.json({ item: toJson(row) });
  });

  app.post('/', async (c) => {
    const data = parse(schema, await readJson(c));
    const item = await write(c, null, data);
    await audit(c, 'create', entity, item.id, describe(item));
    return c.json({ item }, 201);
  });

  app.put('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const item = await write(c, id, parse(schema, await readJson(c)));
    await audit(c, 'update', entity, id, describe(item));
    return c.json({ item });
  });

  // Partial update, e.g. a single toggle in a list.
  app.patch('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const item = await write(c, id, parse(partialSchema, await readJson(c)));
    await audit(c, 'update', entity, id, describe(item));
    return c.json({ item });
  });

  app.delete('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const existing = await fetchOne({ query }, id);
    if (!existing) throw notFound();
    try {
      await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    } catch (error) {
      throw mapDbError(error, { inUseMessage });
    }
    await audit(c, 'delete', entity, id, describe(toJson(existing)));
    return c.json({ ok: true });
  });

  // New order for (a subset of) rows: sort_order = position × 10.
  app.post('/reorder', async (c) => {
    const { ids } = parse(reorderSchema, await readJson(c));
    await transaction(async (db) => {
      for (const [i, id] of ids.entries()) {
        await db.query(`UPDATE ${table} SET sort_order = $2 WHERE id = $1`, [id, (i + 1) * 10]);
      }
    });
    await audit(c, 'reorder', entity, '', `${ids.length} Einträge neu sortiert`);
    return c.json({ ok: true });
  });

  return app;
}
