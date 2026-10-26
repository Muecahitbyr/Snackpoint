import { useState } from 'react';
import { api, useApi } from '../api';
import { Button, EmptyState, ErrorBox, Modal, MoveButtons, Spinner, SwitchButton, useAction, useConfirm, useToast } from '../ui';
import { Icon } from '../icons';

/**
 * List + edit dialog for the simple content types (banners, promotions,
 * services, reviews): active switch, ↑/↓ order, edit, delete.
 *
 * `Form` gets { item, errors, busy, onSave(body), onCancel }.
 * `describe(item)` → { thumb, title, subtitle, badges }.
 */
export default function ManagedList({ endpoint, noun, newLabel, emptyText, emptyIcon, Form, describe, deleteHint }) {
  const { data, error, loading, reload, setData } = useApi(endpoint);
  const toast = useToast();
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const items = data?.items ?? [];
  const ids = items.map((item) => item.id);

  async function save(body) {
    const item = editing?.item;
    setSaving(true);
    setErrors({});
    try {
      await api(item ? `${endpoint}/${item.id}` : endpoint, { method: item ? 'PUT' : 'POST', body });
      toast.success(item ? `${noun} gespeichert.` : `${noun} angelegt.`);
      setEditing(null);
      reload();
    } catch (err) {
      setErrors(err.fields);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item, isActive) {
    const result = await run(
      () => api(`${endpoint}/${item.id}`, { method: 'PATCH', body: { isActive } }),
      isActive ? `${noun} ist jetzt aktiv.` : `${noun} deaktiviert.`
    );
    if (result?.item) setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === item.id ? result.item : i)) }));
  }

  async function remove(item) {
    const ok = await confirm({
      title: `${noun} löschen?`,
      message: `${describe(item).title} wird endgültig gelöscht.${deleteHint ? ` ${deleteHint}` : ''}`,
      confirmLabel: 'Endgültig löschen',
      danger: true,
    });
    if (ok && (await run(() => api(`${endpoint}/${item.id}`, { method: 'DELETE' }), `${noun} gelöscht.`))) reload();
  }

  async function move(order) {
    if (await run(() => api(`${endpoint}/reorder`, { method: 'POST', body: { ids: order } }))) reload();
  }

  return (
    <>
      <div className="toolbar toolbar-end">
        <Button onClick={() => { setErrors({}); setEditing({ item: null }); }}><Icon name="plus" size={16} /> {newLabel}</Button>
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : items.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyText}>
          <Button size="small" onClick={() => setEditing({ item: null })}>{newLabel}</Button>
        </EmptyState>
      ) : (
        <ul className="list">
          {items.map((item) => {
            const info = describe(item);
            return (
              <li key={item.id} className={`list-row ${item.isActive ? '' : 'is-muted'}`}>
                <button type="button" className="row-title" onClick={() => { setErrors({}); setEditing({ item }); }}>
                  {info.thumb !== undefined && <span className="thumb">{info.thumb}</span>}
                  <span>
                    <strong>{info.title}</strong>
                    {info.subtitle && <small>{info.subtitle}</small>}
                    {info.badges && <span className="badges">{info.badges}</span>}
                  </span>
                </button>
                <div className="row-actions">
                  <SwitchButton checked={item.isActive} busy={busy} label={item.isActive ? 'Deaktivieren' : 'Aktivieren'} onChange={(on) => toggle(item, on)} />
                  <MoveButtons ids={ids} id={item.id} onMove={move} disabled={busy} />
                  <Button variant="ghost" size="small" onClick={() => { setErrors({}); setEditing({ item }); }}>Bearbeiten</Button>
                  <Button variant="icon" size="small" onClick={() => remove(item)} title="Löschen" aria-label="Löschen"><Icon name="trash" size={16} /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <Modal title={editing.item ? `${noun} bearbeiten` : newLabel} onClose={() => setEditing(null)}>
          <Form item={editing.item} errors={errors} busy={saving} onSave={save} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}

export function FormActions({ busy, onCancel }) {
  return (
    <div className="modal-actions">
      <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
      <Button type="submit" busy={busy}>Speichern</Button>
    </div>
  );
}
