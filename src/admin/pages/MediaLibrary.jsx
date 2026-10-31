import { useRef, useState } from 'react';
import { api, formatDateTime, uploadImage, useApi } from '../api';
import {
  Badge, Button, EmptyState, ErrorBox, Modal, PageHeader, SearchInput, Spinner, TextField, Toggle, UploadButton, formatBytes,
  useAction, useConfirm, useToast,
} from '../ui';

function MediaDetail({ id, maxBytes, onClose, onChanged, onDeleted }) {
  const { data, error, loading, reload } = useApi(`/admin/media/${id}`);
  const toast = useToast();
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [alt, setAlt] = useState(null);
  const replaceInput = useRef(null);

  const item = data?.item;
  const usage = data?.usage ?? [];
  const altText = alt ?? item?.altText ?? '';

  async function saveAlt() {
    const result = await run(() => api(`/admin/media/${id}`, { method: 'PATCH', body: { altText } }), 'Beschreibung gespeichert.');
    if (result?.item) onChanged(result.item);
  }

  async function setAiGenerated(aiGenerated) {
    const message = aiGenerated ? 'Wird jetzt als KI-generiertes Symbolbild gekennzeichnet.' : 'KI-Kennzeichnung entfernt.';
    const result = await run(() => api(`/admin/media/${id}`, { method: 'PATCH', body: { aiGenerated } }), message);
    if (result?.item) {
      onChanged(result.item);
      reload();
    }
  }

  async function replace(file) {
    try {
      const { item: updated } = await uploadImage(file, { maxBytes, replaceId: id });
      toast.success('Bild ersetzt — überall, wo es verwendet wird.');
      onChanged(updated);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove() {
    const ok = await confirm({ title: 'Bild löschen?', message: `„${item.originalName}“ wird endgültig gelöscht.`, confirmLabel: 'Löschen', danger: true });
    if (ok && (await run(() => api(`/admin/media/${id}`, { method: 'DELETE' }), 'Bild gelöscht.'))) onDeleted(id);
  }

  return (
    <Modal title="Bilddetails" onClose={onClose} size="large">
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <div className="media-detail">
          <div className="media-detail-preview">
            <img src={item.url} alt={item.altText} />
          </div>
          <div className="media-detail-info">
            <dl>
              <dt>Datei</dt><dd>{item.originalName}</dd>
              <dt>Größe</dt><dd>{item.width} × {item.height} px · {formatBytes(item.sizeBytes)} · {item.mimeType.replace('image/', '').toUpperCase()}</dd>
              <dt>Hochgeladen</dt><dd>{formatDateTime(item.createdAt)}</dd>
              <dt>Verwendet in</dt>
              <dd>
                {usage.length ? (
                  <ul className="usage-list">{usage.map((use, i) => <li key={i}><Badge>{use.type}</Badge> {use.name}</li>)}</ul>
                ) : 'Nirgends — kann gelöscht werden.'}
              </dd>
            </dl>
            <Toggle
              label="KI-generiertes Bild"
              hint="Komplett mit KI erstellt (z. B. ChatGPT): Die Webseite zeigt dann unter dem Bild „KI-generiertes Symbolbild“."
              checked={item.aiGenerated}
              onChange={setAiGenerated}
              disabled={busy}
            />
            <TextField label="Bildbeschreibung (für Barrierefreiheit & Google)" value={altText} onChange={setAlt} maxLength={200} />
            <div className="button-row">
              <Button variant="ghost" size="small" busy={busy} onClick={saveAlt} disabled={altText === item.altText}>Beschreibung speichern</Button>
              <Button variant="ghost" size="small" onClick={() => replaceInput.current?.click()}>Bild ersetzen</Button>
              <input
                ref={replaceInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];
                  e.target.value = '';
                  if (file) replace(file);
                }}
              />
              <Button
                variant="danger-ghost"
                size="small"
                onClick={remove}
                disabled={usage.length > 0 || busy}
                title={usage.length ? 'Wird noch verwendet — entferne es zuerst dort' : undefined}
              >Löschen</Button>
            </div>
            {usage.length > 0 && <p className="muted small">Löschen ist erst möglich, wenn das Bild nirgends mehr verwendet wird.</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function MediaLibrary() {
  const { data, error, loading, reload, setData } = useApi('/admin/media');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const toast = useToast();

  const items = (data?.items ?? []).filter(
    (item) =>
      `${item.originalName} ${item.altText}`.toLowerCase().includes(search.trim().toLowerCase()) &&
      (filter === 'all' || (filter === 'unused' ? item.usageCount === 0 : item.usageCount > 0))
  );
  const add = (item) => setData((prev) => ({ ...prev, items: [item, ...(prev?.items ?? [])] }));
  const update = (item) => setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, ...item } : i)) }));

  async function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files].filter((file) => file.type.startsWith('image/'));
    for (const file of files) {
      try {
        add((await uploadImage(file, { maxBytes: data?.maxUploadBytes })).item);
      } catch (err) {
        toast.error(`${file.name}: ${err.message}`);
      }
    }
    if (files.length) toast.success('Upload abgeschlossen.');
  }

  return (
    <div
      className={`dropzone ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={onDrop}
    >
      <PageHeader
        title="Medienbibliothek"
        description="Alle Bilder der Webseite. Uploads werden automatisch verkleinert und optimiert (WebP). Tipp: Bilder einfach hierher ziehen."
        actions={<UploadButton maxBytes={data?.maxUploadBytes} onUploaded={add} />}
      />
      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Bilder durchsuchen…" />
        <select className={`filter ${filter !== 'all' ? 'is-active' : ''}`} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter">
          <option value="all">Alle Bilder</option>
          <option value="used">In Verwendung</option>
          <option value="unused">Nicht verwendet</option>
        </select>
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : items.length === 0 ? (
        <EmptyState icon="image" title="Keine Bilder gefunden">Lade Bilder hoch oder ändere den Filter.</EmptyState>
      ) : (
        <div className="media-grid">
          {items.map((item) => (
            <button key={item.id} type="button" className="media-tile" onClick={() => setOpenId(item.id)}>
              <img src={item.thumbUrl} alt={item.altText} loading="lazy" />
              <span className="media-tile-name">{item.originalName}</span>
              <span className="media-tile-meta">
                {formatBytes(item.sizeBytes)} · {item.usageCount ? `${item.usageCount}× verwendet` : 'unbenutzt'}
              </span>
            </button>
          ))}
        </div>
      )}
      {openId && (
        <MediaDetail
          id={openId}
          maxBytes={data?.maxUploadBytes}
          onClose={() => setOpenId(null)}
          onChanged={update}
          onDeleted={(id) => {
            setOpenId(null);
            setData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
          }}
        />
      )}
    </div>
  );
}
