import { useEffect, useMemo, useState } from 'react';
import { api, formatEuro, useApi } from '../api';
import { Icon } from '../icons';
import {
  Badge, Button, EmptyState, ErrorBox, Modal, MoveButtons, PageHeader, SearchInput, Spinner, useAction,
} from '../ui';
import { AVAILABILITY } from './Products';

// Must match HIGHLIGHT_SLOTS in server/routes/adminEntities.js.
export const SLOTS = 4;

const Thumb = ({ product }) => (
  <span className="thumb">{product.image ? <img src={product.image.thumbUrl} alt="" /> : product.emoji || <Icon name="package" />}</span>
);

function ProductPicker({ products, taken, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const list = products
    .filter((p) => !taken.includes(p.id) && (!term || `${p.name} ${p.brand} ${p.categoryName}`.toLowerCase().includes(term)))
    .sort((a, b) => b.isActive - a.isActive);

  return (
    <Modal title="Produkt für die Startseite wählen" onClose={onClose} size="large">
      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Produkt suchen…" />
      </div>
      {list.length === 0 ? (
        <EmptyState icon="search" title="Kein passendes Produkt">Lege es zuerst unter „Produkte“ an.</EmptyState>
      ) : (
        <ul className="list picker-list">
          {list.map((product) => (
            <li key={product.id}>
              <button type="button" className={`list-row picker-row ${product.isActive ? '' : 'is-muted'}`} onClick={() => onPick(product)}>
                <span className="row-title">
                  <Thumb product={product} />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.categoryName} · {formatEuro(product.priceCents)}</small>
                  </span>
                </span>
                {!product.isActive && <Badge>Inaktiv</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

const fromProducts = (items) =>
  items
    .filter((p) => p.isHighlight)
    .sort((a, b) => a.highlightOrder - b.highlightOrder)
    .slice(0, SLOTS)
    .map((p) => ({ id: p.id, badge: p.highlightBadge }));

/** The "Frisch im Regal" tiles: which products, in which order, with which label. */
export default function Homepage() {
  const { data, error, loading, reload } = useApi('/admin/products');
  const [run, busy] = useAction();
  const [slots, setSlots] = useState([]);
  const [picking, setPicking] = useState(null); // slot index being filled/replaced

  const products = useMemo(() => data?.items ?? [], [data]);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const saved = useMemo(() => fromProducts(products), [products]);

  useEffect(() => setSlots(saved), [saved]);

  const dirty = JSON.stringify(slots) !== JSON.stringify(saved);
  const ids = slots.map((slot) => slot.id);

  function pick(product) {
    setSlots((list) => {
      const next = [...list];
      next[Math.min(picking, next.length)] = { id: product.id, badge: list[picking]?.badge ?? '' };
      return next;
    });
    setPicking(null);
  }

  const setBadge = (index, badge) => setSlots((list) => list.map((slot, i) => (i === index ? { ...slot, badge } : slot)));
  const remove = (index) => setSlots((list) => list.filter((_, i) => i !== index));
  const move = (order) => setSlots((list) => order.map((id) => list.find((slot) => slot.id === id)));

  async function save() {
    const items = slots.map((slot) => ({ id: slot.id, badge: slot.badge.trim() }));
    if (await run(() => api('/admin/products/highlights', { method: 'POST', body: { items } }), 'Gespeichert: die Startseite zeigt jetzt diese Produkte.')) {
      reload();
    }
  }

  return (
    <>
      <PageHeader
        title="Startseite"
        description={`Diese ${SLOTS} Produkte stehen auf der Startseite unter „Frisch im Regal“, in dieser Reihenfolge (auf dem Handy untereinander).`}
      />

      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <>
          <ol className="list homepage-slots">
            {Array.from({ length: SLOTS }, (_, index) => {
              const slot = slots[index];
              const product = slot && byId.get(slot.id);
              if (!product) {
                const next = index === slots.length;
                return (
                  <li key={`empty-${index}`} className="list-row homepage-slot is-empty">
                    <span className="row-title">
                      <span className="slot-number">{index + 1}</span>
                      <span><strong>Freier Platz</strong><small>Wird auf der Webseite nicht angezeigt.</small></span>
                    </span>
                    {next && (
                      <Button size="small" onClick={() => setPicking(index)}><Icon name="plus" size={15} /> Produkt wählen</Button>
                    )}
                  </li>
                );
              }
              return (
                <li key={product.id} className={`list-row homepage-slot ${product.isActive ? '' : 'is-muted'}`}>
                  <span className="row-title">
                    <span className="slot-number">{index + 1}</span>
                    <Thumb product={product} />
                    <span>
                      <strong>{product.name}</strong>
                      <small>{product.categoryName} · {formatEuro(product.priceCents)}</small>
                      <span className="badges">
                        {!product.isActive && <Badge tone="danger">Inaktiv: wird nicht angezeigt</Badge>}
                        {product.availability !== 'available' && (
                          <Badge tone={AVAILABILITY[product.availability].tone}>{AVAILABILITY[product.availability].label}</Badge>
                        )}
                      </span>
                    </span>
                  </span>
                  <div className="row-actions">
                    <input
                      className="slot-badge-input"
                      value={slot.badge}
                      onChange={(e) => setBadge(index, e.target.value.toUpperCase())}
                      placeholder="Etikett, z. B. NEU"
                      maxLength={30}
                      aria-label={`Etikett für ${product.name}`}
                    />
                    <MoveButtons ids={ids} id={product.id} onMove={move} disabled={busy} />
                    <Button variant="ghost" size="small" onClick={() => setPicking(index)}>Ersetzen</Button>
                    <Button variant="icon" size="small" onClick={() => remove(index)} title="Von der Startseite nehmen" aria-label={`${product.name} von der Startseite nehmen`}>
                      <Icon name="close" size={16} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="card-foot homepage-foot">
            {dirty && <span className="subtle-text">Noch nicht gespeichert.</span>}
            <Button variant="ghost" onClick={() => setSlots(saved)} disabled={!dirty || busy}>Verwerfen</Button>
            <Button onClick={save} busy={busy} disabled={!dirty}><Icon name="save" size={15} /> Speichern</Button>
          </div>
          <p className="hint-bar subtle">
            Das Etikett erscheint als kleines Schild auf der Kachel. Bild, Text und Preis änderst du beim Produkt selbst.
          </p>
        </>
      )}

      {picking !== null && <ProductPicker products={products} taken={ids} onPick={pick} onClose={() => setPicking(null)} />}
    </>
  );
}
