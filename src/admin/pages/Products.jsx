import { useMemo, useState } from 'react';
import { api, formatEuro, parseEuro, useApi } from '../api';
import { navigate } from '../router';
import {
  Badge, Button, EmptyState, ErrorBox, Modal, MoveButtons, PageHeader, SearchInput, SelectField, Spinner, SwitchButton, TextField,
  useAction, useConfirm, useToast,
} from '../ui';
import { Icon } from '../icons';

export const AVAILABILITY = {
  available: { label: 'Verfügbar', tone: 'success' },
  coming_soon: { label: 'Bald verfügbar', tone: 'warning' },
  sold_out: { label: 'Ausverkauft', tone: 'danger' },
};

const STATUS_FILTERS = [
  { id: '', label: 'Alle Status' },
  { id: 'active', label: 'Aktiv' },
  { id: 'inactive', label: 'Inaktiv' },
  { id: 'coming_soon', label: 'Bald verfügbar' },
  { id: 'sold_out', label: 'Ausverkauft' },
  { id: 'highlight', label: 'Frisch im Regal' },
  { id: 'hidden', label: 'Nicht im Katalog' },
];

function matchesStatus(product, status) {
  switch (status) {
    case 'active': return product.isActive;
    case 'inactive': return !product.isActive;
    case 'coming_soon':
    case 'sold_out': return product.availability === status;
    case 'highlight': return product.isHighlight;
    case 'hidden': return !product.showInCatalog;
    default: return true;
  }
}

/** The same change for several products at once ("" = leave as it is). */
function BulkEditModal({ ids, categories, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ availability: '', isActive: '', showInCatalog: '', categoryId: '', price: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save(e) {
    e.preventDefault();
    const changes = {};
    if (form.availability) changes.availability = form.availability;
    if (form.isActive) changes.isActive = form.isActive === 'yes';
    if (form.showInCatalog) changes.showInCatalog = form.showInCatalog === 'yes';
    if (form.categoryId) changes.categoryId = form.categoryId;
    if (form.price.trim()) {
      const priceCents = parseEuro(form.price);
      if (Number.isNaN(priceCents)) {
        setErrors({ price: 'Bitte als Betrag eingeben, z. B. 1,50' });
        return;
      }
      changes.priceCents = priceCents;
    }
    if (!Object.keys(changes).length) {
      toast.error('Bitte wähle mindestens eine Änderung aus.');
      return;
    }
    setBusy(true);
    try {
      const result = await api('/admin/products/bulk', { method: 'POST', body: { ids, changes } });
      toast.success(`${result.updated} ${result.updated === 1 ? 'Produkt' : 'Produkte'} geändert.`);
      onDone();
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`${ids.length} ${ids.length === 1 ? 'Produkt' : 'Produkte'} bearbeiten`} onClose={onClose}>
      <form onSubmit={save}>
        <p className="modal-intro">Nur was du hier auswählst, wird bei allen gewählten Produkten geändert. Alles andere bleibt, wie es ist.</p>
        <div className="field-row">
          <SelectField label="Verfügbarkeit" value={form.availability} onChange={set('availability')}>
            <option value="">Unverändert</option>
            {Object.entries(AVAILABILITY).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
          </SelectField>
          <SelectField label="Sichtbar auf der Webseite" value={form.isActive} onChange={set('isActive')}>
            <option value="">Unverändert</option>
            <option value="yes">Aktiv</option>
            <option value="no">Inaktiv (ausgeblendet)</option>
          </SelectField>
        </div>
        <div className="field-row">
          <SelectField label="Im Produktkatalog" value={form.showInCatalog} onChange={set('showInCatalog')}>
            <option value="">Unverändert</option>
            <option value="yes">Anzeigen</option>
            <option value="no">Nicht anzeigen</option>
          </SelectField>
          <SelectField label="Kategorie" value={form.categoryId} onChange={set('categoryId')} error={errors.categoryId}>
            <option value="">Unverändert</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.groupName} › {category.name}</option>)}
          </SelectField>
        </div>
        <TextField label="Neuer Preis (€)" hint="Leer lassen, damit jedes Produkt seinen Preis behält." inputMode="decimal" placeholder="z. B. 1,50" value={form.price} onChange={set('price')} error={errors.price || errors['changes.priceCents']} />
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" busy={busy}>Übernehmen</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const { data, error, loading, reload, setData } = useApi('/admin/products');
  const categories = useApi('/admin/categories');
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [search, setSearch] = useState('');
  // "Produkte" on the categories page opens this list filtered.
  const [categoryId, setCategoryId] = useState(() => {
    try {
      const preset = sessionStorage.getItem('admin-product-category');
      sessionStorage.removeItem('admin-product-category');
      return preset ?? '';
    } catch {
      return '';
    }
  });
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const products = data?.items ?? [];
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = products.filter(
      (product) =>
        (!categoryId || product.categoryId === categoryId) &&
        matchesStatus(product, status) &&
        (!term || `${product.name} ${product.brand} ${product.description} ${product.categoryName}`.toLowerCase().includes(term))
    );
    return status === 'highlight' ? [...list].sort((a, b) => a.highlightOrder - b.highlightOrder) : list;
  }, [products, search, categoryId, status]);

  // Reordering makes sense within one category (catalog order); the homepage has its own page.
  const reorderMode = !search && categoryId && !status;
  const visibleIds = visible.map((product) => product.id);

  // Only products that still exist count (one might have been deleted meanwhile).
  const selectedIds = products.filter((product) => selected.has(product.id)).map((product) => product.id);
  const allVisibleSelected = visible.length > 0 && visible.every((product) => selected.has(product.id));
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleVisible = () => setSelected((prev) => {
    const next = new Set(prev);
    for (const product of visible) {
      if (allVisibleSelected) next.delete(product.id);
      else next.add(product.id);
    }
    return next;
  });

  const replace = (item) => setData((prev) => ({ ...prev, items: prev.items.map((p) => (p.id === item.id ? item : p)) }));

  async function patch(product, changes, message) {
    const result = await run(() => api(`/admin/products/${product.id}`, { method: 'PATCH', body: changes }), message);
    if (result?.item) replace(result.item);
  }

  async function remove(product) {
    const ok = await confirm({
      title: 'Produkt löschen?',
      message: `„${product.name}“ wird endgültig gelöscht. Tipp: Wenn du es nur vorübergehend ausblenden willst, schalte es stattdessen auf inaktiv.`,
      confirmLabel: 'Endgültig löschen',
      danger: true,
    });
    if (!ok) return;
    if (await run(() => api(`/admin/products/${product.id}`, { method: 'DELETE' }), 'Produkt gelöscht.')) {
      setData((prev) => ({ ...prev, items: prev.items.filter((p) => p.id !== product.id) }));
    }
  }

  async function move(order) {
    if (await run(() => api('/admin/products/reorder', { method: 'POST', body: { ids: order } }))) reload();
  }

  return (
    <>
      <PageHeader
        title="Produkte"
        description="Alle Produkte der Webseite: im Produktkatalog (die Seite „Produkte“) und in „Frisch im Regal“ auf der Startseite."
        actions={<Button onClick={() => navigate('produkte/neu')}><Icon name="plus" size={16} /> Neues Produkt</Button>}
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Produkt suchen…" />
        <select className={`filter ${categoryId ? 'is-active' : ''}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Kategorie">
          <option value="">Alle Kategorien</option>
          {(categories.data?.items ?? []).map((category) => (
            <option key={category.id} value={category.id}>{category.groupName} › {category.name}</option>
          ))}
        </select>
        <select className={`filter ${status ? 'is-active' : ''}`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          {STATUS_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
        </select>
      </div>
      {reorderMode && (
        <p className="hint-bar">
          Mit den Pfeilen änderst du die Reihenfolge in dieser Kategorie.
        </p>
      )}
      {!reorderMode && !loading && (
        <p className="hint-bar subtle">Tipp: Wähle eine Kategorie, um die Reihenfolge zu ändern. Die 4 Produkte für „Frisch im Regal“ auf der Startseite wählst du unter <a href="#/startseite">Startseite</a>.</p>
      )}

      {selectedIds.length > 0 && (
        <div className="hint-bar bulk-bar">
          <span><strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? 'Produkt' : 'Produkte'} ausgewählt</span>
          <span className="row-actions">
            <Button size="small" onClick={() => setBulkOpen(true)}>Gemeinsam bearbeiten</Button>
            <Button variant="ghost" size="small" onClick={() => setSelected(new Set())}>Auswahl aufheben</Button>
          </span>
        </div>
      )}

      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : visible.length === 0 ? (
        <EmptyState icon="search" title="Keine Produkte gefunden">Passe Suche oder Filter an.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="select-cell">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Alle angezeigten Produkte auswählen" />
                </th>
                <th>Produkt</th>
                <th>Kategorie</th>
                <th>Preis</th>
                <th>Status</th>
                <th>Aktiv</th>
                <th><span className="sr-only">Aktionen</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr key={product.id} className={`${product.isActive ? '' : 'is-muted'} ${selected.has(product.id) ? 'is-selected' : ''}`.trim()}>
                  <td className="select-cell" data-label="Auswählen">
                    <input type="checkbox" checked={selected.has(product.id)} onChange={() => toggle(product.id)} aria-label={`${product.name} auswählen`} />
                  </td>
                  <td data-label="Produkt">
                    <a className="row-title" href={`#/produkte/${product.id}`}>
                      <span className="thumb">{product.image ? <img src={product.image.thumbUrl} alt="" /> : product.emoji || <Icon name="package" />}</span>
                      <span>
                        <strong>{product.name}</strong>
                        {product.brand && <small>{product.brand}</small>}
                      </span>
                    </a>
                  </td>
                  <td data-label="Kategorie">{product.categoryName}</td>
                  <td data-label="Preis">{formatEuro(product.priceCents)}</td>
                  <td data-label="Status">
                    <select
                      className={`filter filter-inline ${product.availability !== 'available' ? `is-${AVAILABILITY[product.availability].tone}` : ''}`}
                      value={product.availability}
                      disabled={busy}
                      onChange={(e) => patch(product, { availability: e.target.value }, `„${product.name}“: ${AVAILABILITY[e.target.value].label}.`)}
                      aria-label={`Verfügbarkeit von ${product.name}`}
                    >
                      {Object.entries(AVAILABILITY).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                    <span className="badges">
                      {product.isHighlight && <Badge tone="accent"><Icon name="star" size={11} filled /> Frisch im Regal</Badge>}
                      {!product.showInCatalog && <Badge>Nicht im Produktkatalog</Badge>}
                    </span>
                  </td>
                  <td data-label="Aktiv">
                    <SwitchButton
                      checked={product.isActive}
                      busy={busy}
                      label={product.isActive ? 'Deaktivieren' : 'Aktivieren'}
                      onChange={(isActive) => patch(product, { isActive }, isActive ? 'Produkt ist jetzt sichtbar.' : 'Produkt ausgeblendet.')}
                    />
                  </td>
                  <td className="actions-cell">
                    <div className="row-actions">
                      {reorderMode && <MoveButtons ids={visibleIds} id={product.id} onMove={move} disabled={busy} />}
                      <Button variant="ghost" size="small" onClick={() => navigate(`produkte/${product.id}`)}>Bearbeiten</Button>
                      <Button variant="icon" size="small" onClick={() => remove(product)} aria-label={`${product.name} löschen`} title="Löschen"><Icon name="trash" size={16} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <p className="table-foot">{visible.length} von {products.length} Produkten</p>}
      {bulkOpen && (
        <BulkEditModal
          ids={selectedIds}
          categories={categories.data?.items ?? []}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setBulkOpen(false);
            setSelected(new Set());
            reload();
          }}
        />
      )}
    </>
  );
}
