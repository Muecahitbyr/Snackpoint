import { useMemo, useState } from 'react';
import { api, formatEuro, useApi } from '../api';
import { navigate } from '../router';
import {
  Badge, Button, EmptyState, ErrorBox, MoveButtons, PageHeader, SearchInput, Spinner, SwitchButton, useAction, useConfirm,
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
  { id: 'highlight', label: 'Highlights (Startseite)' },
  { id: 'hidden', label: 'Nicht auf Produktseite' },
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

  // Reordering makes sense within one category (catalog order) or among highlights.
  const reorderMode = !search && (status === 'highlight' ? 'highlight' : categoryId && !status ? 'category' : null);
  const visibleIds = visible.map((product) => product.id);

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
    const path = reorderMode === 'highlight' ? '/admin/products/highlight-order' : '/admin/products/reorder';
    if (await run(() => api(path, { method: 'POST', body: { ids: order } }))) reload();
  }

  return (
    <>
      <PageHeader
        title="Produkte"
        description="Alles, was auf der Produktseite und unter „Frisch im Regal“ erscheint."
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
          Mit den Pfeilen änderst du die Reihenfolge {reorderMode === 'highlight' ? 'der Highlights auf der Startseite' : 'in dieser Kategorie'}.
        </p>
      )}
      {!reorderMode && !loading && (
        <p className="hint-bar subtle">Tipp: Wähle eine Kategorie (oder den Filter „Highlights“), um die Reihenfolge zu ändern.</p>
      )}

      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : visible.length === 0 ? (
        <EmptyState icon="search" title="Keine Produkte gefunden">Passe Suche oder Filter an.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
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
                <tr key={product.id} className={product.isActive ? '' : 'is-muted'}>
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
                    <span className="badges">
                      {product.availability !== 'available' && <Badge tone={AVAILABILITY[product.availability].tone}>{AVAILABILITY[product.availability].label}</Badge>}
                      {product.isHighlight && <Badge tone="accent"><Icon name="star" size={11} filled /> Highlight</Badge>}
                      {!product.showInCatalog && <Badge>Nicht auf Produktseite</Badge>}
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
    </>
  );
}
