// Change log for the dashboard: who changed what, when. Only names and
// actions — never passwords, tokens or other sensitive values.
import { query } from '../db/pool.js';

export async function audit(c, action, entityType, entityId = '', summary = '') {
  // While a developer looks at the panel as an owner, the change is theirs.
  const user = c.get('session')?.user;
  const userId = user?.impersonatedBy?.id ?? user?.id ?? null;
  try {
    await query(
      'INSERT INTO audit_log (admin_user_id, action, entity_type, entity_id, summary) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, entityType, String(entityId), String(summary).slice(0, 300)]
    );
  } catch (error) {
    // The change itself already succeeded; a failed log entry mustn't undo it.
    console.error('[audit] could not write entry:', error.message);
  }
}
