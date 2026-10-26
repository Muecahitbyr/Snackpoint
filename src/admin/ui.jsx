// Small UI kit for the admin panel: form fields, buttons, dialogs, toasts,
// status badges and the media picker.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { api, uploadImage, useApi } from './api';

// ── Toasts ────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, type, message }]);
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), type === 'error' ? 7000 : 3500);
  }, []);
  const api = useRef({ success: (m) => show('success', m), error: (m) => show('error', m) });

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
            <span aria-hidden="true">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ── Confirm dialog ────────────────────────────────────────────────────────

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ ...options, resolve })),
    []
  );
  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <Modal title={dialog.title} onClose={() => close(false)} size="small">
          <p className="confirm-text">{dialog.message}</p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => close(false)}>Abbrechen</Button>
            <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {dialog.confirmLabel ?? 'OK'}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// ── Basics ────────────────────────────────────────────────────────────────

export function Button({ variant = 'primary', size, busy = false, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`a-btn a-btn-${variant} ${size === 'small' ? 'a-btn-small' : ''} ${className}`.trim()}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Spinner({ label = 'Lädt…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner spinner-dark" aria-hidden="true" /> {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="error-box" role="alert">
      <p>{error?.message ?? 'Fehler beim Laden.'}</p>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Erneut versuchen</Button>}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p className="card-description">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon = '📭', title, children }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`tab ${active === tab.id ? 'is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Form fields ───────────────────────────────────────────────────────────

export function Field({ label, hint, error, required, children, className = '' }) {
  const id = useId();
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`.trim()}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="required" aria-hidden="true"> *</span>}
        </label>
      )}
      {typeof children === 'function' ? children(id) : children}
      {error ? <p className="field-error">{error}</p> : hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function TextField({ label, hint, error, required, value, onChange, multiline, rows = 4, className, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={className}>
      {(id) =>
        multiline ? (
          <textarea id={id} value={value ?? ''} rows={rows} onChange={(e) => onChange(e.target.value)} {...rest} />
        ) : (
          <input id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
        )
      }
    </Field>
  );
}

export function SelectField({ label, hint, error, required, value, onChange, children, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(id) => (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`toggle ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="toggle-track" aria-hidden="true"><span className="toggle-thumb" /></span>
      <span className="toggle-text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/** Small on/off switch for table rows. */
export function SwitchButton({ checked, onChange, label, busy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      className={`switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
      disabled={busy}
    >
      <span className="toggle-thumb" />
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Suchen…' }) {
  return (
    <div className="search">
      <span aria-hidden="true">🔍</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────

export function Modal({ title, onClose, children, size = 'medium' }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement;
    ref.current?.querySelector('input, textarea, select, button[autofocus]')?.focus();
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Reorder buttons ───────────────────────────────────────────────────────

/** ↑/↓ buttons that move `id` within `ids` and hand the new order back. */
export function MoveButtons({ ids, id, onMove, disabled }) {
  const index = ids.indexOf(id);
  const move = (delta) => {
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onMove(next);
  };
  return (
    <span className="move-buttons">
      <button type="button" onClick={() => move(-1)} disabled={disabled || index <= 0} aria-label="Nach oben">↑</button>
      <button type="button" onClick={() => move(1)} disabled={disabled || index === -1 || index >= ids.length - 1} aria-label="Nach unten">↓</button>
    </span>
  );
}

// ── Media ─────────────────────────────────────────────────────────────────

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Upload button accepting one or several images; calls onUploaded(item) per file. */
export function UploadButton({ onUploaded, multiple = true, maxBytes, label = 'Bilder hochladen', variant = 'primary' }) {
  const input = useRef(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handleFiles(files) {
    setBusy(true);
    let done = 0;
    for (const file of files) {
      try {
        const { item } = await uploadImage(file, { maxBytes });
        onUploaded(item);
        done += 1;
      } catch (error) {
        toast.error(`${file.name}: ${error.message}`);
      }
    }
    setBusy(false);
    if (done) toast.success(done === 1 ? 'Bild hochgeladen.' : `${done} Bilder hochgeladen.`);
  }

  return (
    <>
      <Button variant={variant} busy={busy} onClick={() => input.current?.click()}>⬆ {label}</Button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic"
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = [...e.target.files];
          e.target.value = '';
          if (files.length) handleFiles(files);
        }}
      />
    </>
  );
}

/** Library dialog: pick an existing image or upload a new one. */
export function MediaPickerModal({ onSelect, onClose, multiple = false, initial = [] }) {
  const { data, error, loading, setData, reload } = useApi('/admin/media');
  const [selected, setSelected] = useState(initial);
  const [search, setSearch] = useState('');
  const items = (data?.items ?? []).filter((item) =>
    `${item.originalName} ${item.altText}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  function pick(item) {
    if (!multiple) {
      onSelect(item);
      return;
    }
    setSelected((list) => (list.some((entry) => entry.id === item.id) ? list.filter((entry) => entry.id !== item.id) : [...list, item]));
  }

  return (
    <Modal title={multiple ? 'Bilder auswählen' : 'Bild auswählen'} onClose={onClose} size="large">
      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Bilder durchsuchen…" />
        <UploadButton
          maxBytes={data?.maxUploadBytes}
          multiple={multiple}
          label="Neu hochladen"
          onUploaded={(item) => {
            setData((prev) => ({ ...prev, items: [item, ...(prev?.items ?? [])] }));
            if (multiple) setSelected((list) => [...list, item]);
            else onSelect(item);
          }}
        />
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        items.length ? (
          <div className="media-grid media-grid-picker">
            {items.map((item) => {
              const isSelected = selected.some((entry) => entry.id === item.id);
              return (
                <button key={item.id} type="button" className={`media-tile ${isSelected ? 'is-selected' : ''}`} onClick={() => pick(item)}>
                  <img src={item.thumbUrl} alt={item.altText} loading="lazy" />
                  <span className="media-tile-name">{item.originalName}</span>
                  {isSelected && <span className="media-tile-check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        ) : <EmptyState icon="🖼️" title="Noch keine Bilder">Lade oben ein Bild hoch.</EmptyState>
      )}
      {multiple && (
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={() => onSelect(selected)}>{selected.length} übernehmen</Button>
        </div>
      )}
    </Modal>
  );
}

/** Form field: one image (preview + choose/remove). `value` = { id, url, thumbUrl } | null. */
export function ImageField({ label, hint, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div className="image-field">
        <div className="image-field-preview">
          {value ? <img src={value.thumbUrl ?? value.url} alt="" /> : <span aria-hidden="true">🖼️</span>}
        </div>
        <div className="image-field-actions">
          <Button variant="ghost" size="small" onClick={() => setOpen(true)}>{value ? 'Bild ändern' : 'Bild wählen'}</Button>
          {value && <Button variant="ghost" size="small" onClick={() => onChange(null)}>Entfernen</Button>}
        </div>
      </div>
      {open && (
        <MediaPickerModal
          onClose={() => setOpen(false)}
          onSelect={(item) => {
            onChange({ id: item.id, url: item.url, thumbUrl: item.thumbUrl });
            setOpen(false);
          }}
        />
      )}
    </Field>
  );
}

/** Form field: several images in order (event gallery). */
export function GalleryField({ label, hint, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ids = value.map((image) => image.id);
  return (
    <Field label={label} hint={hint}>
      <div className="gallery-field">
        {value.map((image) => (
          <div key={image.id} className="gallery-item">
            <img src={image.thumbUrl ?? image.url} alt="" />
            <div className="gallery-item-actions">
              <MoveButtons ids={ids} id={image.id} onMove={(order) => onChange(order.map((id) => value.find((v) => v.id === id)))} />
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== image.id))} aria-label="Entfernen">✕</button>
            </div>
          </div>
        ))}
        <button type="button" className="gallery-add" onClick={() => setOpen(true)}>＋ Bilder</button>
      </div>
      {open && (
        <MediaPickerModal
          multiple
          initial={value}
          onClose={() => setOpen(false)}
          onSelect={(items) => {
            onChange(items.map((item) => ({ id: item.id, url: item.url, thumbUrl: item.thumbUrl })));
            setOpen(false);
          }}
        />
      )}
    </Field>
  );
}

/** Runs an async action with busy state and toasts; returns the result or undefined. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, successMessage) => {
      setBusy(true);
      try {
        const result = await fn();
        if (successMessage) toast.success(successMessage);
        return result ?? true;
      } catch (error) {
        toast.error(error.message);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );
  return [run, busy];
}

export { api };
