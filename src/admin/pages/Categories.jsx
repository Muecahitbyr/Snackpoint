import { useState } from 'react';
import { api, useApi } from '../api';
import {
  Badge, Button, Card, EmptyState, ErrorBox, Modal, MoveButtons, PageHeader, SelectField, Spinner, TextField, Toggle,
  useAction, useConfirm, useToast,
} from '../ui';
import { Icon } from '../icons';

function GroupModal({ group, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: group?.name ?? '', emoji: group?.emoji ?? '', notice: group?.notice ?? '', ageRestricted: group?.ageRestricted ?? false,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(group ? `/admin/groups/${group.id}` : '/admin/groups', { method: group ? 'PUT' : 'POST', body: form });
      toast.success(group ? 'Bereich gespeichert.' : 'Bereich angelegt.');
      onSaved();
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={group ? 'Bereich bearbeiten' : 'Neuer Bereich'} onClose={onClose}>
      <form onSubmit={save}>
        <p className="modal-intro">Bereiche sind die großen Reiter auf der Produktseite, z. B. „Getränke“.</p>
        <div className="field-row">
          <TextField label="Name" required value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
          <TextField label="Emoji" value={form.emoji} onChange={set('emoji')} error={errors.emoji} maxLength={16} />
        </div>
        <TextField label="Hinweistext" hint="Optional — erscheint über den Produkten dieses Bereichs." multiline rows={2} value={form.notice} onChange={set('notice')} error={errors.notice} maxLength={500} />
        <Toggle label="Nur ab 18" hint="Zeigt ein „18+“-Zeichen auf allen Produkten des Bereichs." checked={form.ageRestricted} onChange={set('ageRestricted')} />
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" busy={busy}>Speichern</Button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({ category, groups, chatCategories, defaultGroupId, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: category?.name ?? '',
    groupId: category?.groupId ?? defaultGroupId ?? groups[0]?.id ?? '',
    chatCategory: category ? category.chatCategory ?? '' : 'snacks',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, chatCategory: form.chatCategory || null };
      await api(category ? `/admin/categories/${category.id}` : '/admin/categories', { method: category ? 'PUT' : 'POST', body });
      toast.success(category ? 'Kategorie gespeichert.' : 'Kategorie angelegt.');
      onSaved();
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={category ? 'Kategorie bearbeiten' : 'Neue Kategorie'} onClose={onClose}>
      <form onSubmit={save}>
        <TextField label="Name" required value={form.name} onChange={set('name')} error={errors.name} maxLength={80} />
        <SelectField label="Bereich" required value={form.groupId} onChange={set('groupId')} error={errors.groupId}>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.emoji} {group.name}</option>)}
        </SelectField>
        <SelectField label="Chat-Assistent" value={form.chatCategory} onChange={set('chatCategory')} hint="Unter welchem Thema der SnackBot die Produkte dieser Kategorie findet.">
          <option value="">Nicht im Chat</option>
          {chatCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </SelectField>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" busy={busy}>Speichern</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Categories() {
  const groups = useApi('/admin/groups');
  const categories = useApi('/admin/categories');
  const meta = useApi('/admin/meta');
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [modal, setModal] = useState(null);

  const reload = () => {
    groups.reload();
    categories.reload();
  };
  const closeAndReload = () => {
    setModal(null);
    reload();
  };

  const groupList = groups.data?.items ?? [];
  const categoryList = categories.data?.items ?? [];
  const chatLabels = Object.fromEntries((meta.data?.chatCategories ?? []).map((c) => [c.id, c.label]));

  async function removeGroup(group) {
    if (group.categoryCount > 0) return;
    const ok = await confirm({ title: 'Bereich löschen?', message: `„${group.name}“ wird gelöscht.`, confirmLabel: 'Löschen', danger: true });
    if (ok && (await run(() => api(`/admin/groups/${group.id}`, { method: 'DELETE' }), 'Bereich gelöscht.'))) reload();
  }

  async function removeCategory(category) {
    if (category.productCount > 0) return;
    const ok = await confirm({ title: 'Kategorie löschen?', message: `„${category.name}“ wird gelöscht.`, confirmLabel: 'Löschen', danger: true });
    if (ok && (await run(() => api(`/admin/categories/${category.id}`, { method: 'DELETE' }), 'Kategorie gelöscht.'))) reload();
  }

  const reorder = (path) => async (ids) => {
    if (await run(() => api(path, { method: 'POST', body: { ids } }))) reload();
  };

  const loading = (groups.loading && !groups.data) || (categories.loading && !categories.data);
  const error = groups.error || categories.error;

  return (
    <>
      <PageHeader
        title="Kategorien"
        description="Bereiche (Reiter auf der Produktseite) und ihre Kategorien (Filter darunter)."
        actions={
          <>
            <Button variant="ghost" onClick={() => setModal({ type: 'group' })}><Icon name="plus" size={16} /> Neuer Bereich</Button>
            <Button onClick={() => setModal({ type: 'category' })} disabled={!groupList.length}><Icon name="plus" size={16} /> Neue Kategorie</Button>
          </>
        }
      />

      {loading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : groupList.length === 0 ? (
        <EmptyState icon="folder" title="Noch keine Bereiche">Lege zuerst einen Bereich an.</EmptyState>
      ) : (
        <div className="group-list">
          {groupList.map((group) => {
            const own = categoryList.filter((category) => category.groupId === group.id);
            const ownIds = own.map((category) => category.id);
            return (
              <Card
                key={group.id}
                className="group-card"
                title={<>{group.emoji} {group.name} {group.ageRestricted && <Badge tone="danger">18+</Badge>}</>}
                description={group.notice || undefined}
                actions={
                  <div className="row-actions">
                    <MoveButtons ids={groupList.map((g) => g.id)} id={group.id} onMove={reorder('/admin/groups/reorder')} disabled={busy} />
                    <Button variant="ghost" size="small" onClick={() => setModal({ type: 'group', item: group })}>Bearbeiten</Button>
                    <Button
                      variant="icon"
                      size="small"
                      onClick={() => removeGroup(group)}
                      disabled={group.categoryCount > 0}
                      title={group.categoryCount > 0 ? 'Enthält noch Kategorien' : 'Löschen'}
                      aria-label={`${group.name} löschen`}
                    ><Icon name="trash" size={16} /></Button>
                  </div>
                }
              >
                {own.length ? (
                  <ul className="category-list">
                    {own.map((category) => (
                      <li key={category.id}>
                        <div>
                          <strong>{category.name}</strong>
                          <small>
                            {category.productCount} {category.productCount === 1 ? 'Produkt' : 'Produkte'} · Chat:{' '}
                            {category.chatCategory ? chatLabels[category.chatCategory] ?? category.chatCategory : 'nicht im Chat'}
                          </small>
                        </div>
                        <div className="row-actions">
                          <MoveButtons ids={ownIds} id={category.id} onMove={reorder('/admin/categories/reorder')} disabled={busy} />
                          <a className="a-btn a-btn-ghost a-btn-small" href={`#/produkte`} onClick={() => sessionStorage.setItem('admin-product-category', category.id)}>Produkte</a>
                          <Button variant="ghost" size="small" onClick={() => setModal({ type: 'category', item: category })}>Bearbeiten</Button>
                          <Button
                            variant="icon"
                            size="small"
                            onClick={() => removeCategory(category)}
                            disabled={category.productCount > 0}
                            title={category.productCount > 0 ? 'Enthält noch Produkte — verschiebe oder lösche sie zuerst' : 'Löschen'}
                            aria-label={`${category.name} löschen`}
                          ><Icon name="trash" size={16} /></Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Noch keine Kategorien.</p>
                )}
                <Button variant="link" size="small" onClick={() => setModal({ type: 'category', groupId: group.id })}><Icon name="plus" size={14} /> Kategorie in „{group.name}“</Button>
              </Card>
            );
          })}
        </div>
      )}

      {modal?.type === 'group' && <GroupModal group={modal.item} onClose={() => setModal(null)} onSaved={closeAndReload} />}
      {modal?.type === 'category' && (
        <CategoryModal
          category={modal.item}
          groups={groupList}
          defaultGroupId={modal.groupId}
          chatCategories={meta.data?.chatCategories ?? []}
          onClose={() => setModal(null)}
          onSaved={closeAndReload}
        />
      )}
    </>
  );
}
