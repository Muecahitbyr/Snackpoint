import { useMemo, useState } from 'react';
import { api, formatDateTime, formatRelative, useApi } from '../api';
import { Icon } from '../icons';
import {
  Badge, Button, EmptyState, ErrorBox, Modal, PageHeader, SearchInput, SelectField, Spinner, Tabs, TextField, useAction,
  useConfirm, useToast,
} from '../ui';

export const WISH_STATUS = {
  new: { label: 'Neu', tone: 'warning', hint: 'Noch nicht auf der Webseite' },
  approved: { label: 'Freigegeben', tone: 'success', hint: 'Sichtbar, Abstimmung offen' },
  planned: { label: 'Geplant', tone: 'accent', hint: 'Sichtbar mit „Geplant“' },
  available: { label: 'Im Laden', tone: 'success', hint: 'Sichtbar mit „Jetzt im Laden“, keine Abstimmung mehr' },
  rejected: { label: 'Abgelehnt', tone: 'neutral', hint: 'Nicht sichtbar' },
};

const TABS = [
  { id: 'new', statuses: ['new'], label: 'Neu' },
  { id: 'open', statuses: ['approved', 'planned'], label: 'Auf der Webseite' },
  { id: 'available', statuses: ['available'], label: 'Im Laden' },
  { id: 'rejected', statuses: ['rejected'], label: 'Abgelehnt' },
  { id: 'all', statuses: null, label: 'Alle' },
];

function EditModal({ wish, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: wish.name, note: wish.note });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { item } = await api(`/admin/wishes/${wish.id}`, { method: 'PATCH', body: form });
      toast.success('Gespeichert.');
      onSaved(item);
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Wunsch bearbeiten" onClose={onClose}>
      <form onSubmit={save}>
        <p className="modal-intro">Z. B. Tippfehler korrigieren, bevor du den Wunsch freigibst. So erscheint der Name auf der Webseite.</p>
        <TextField label="Produkt" required value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} error={errors.name} maxLength={80} />
        <TextField label="Hinweis des Kunden" multiline rows={2} value={form.note} onChange={(note) => setForm((f) => ({ ...f, note }))} error={errors.note} maxLength={300} hint="Nur hier im Adminpanel sichtbar." />
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" busy={busy}>Speichern</Button>
        </div>
      </form>
    </Modal>
  );
}

function MergeModal({ wish, wishes, onClose, onMerged }) {
  const toast = useToast();
  const candidates = wishes.filter((other) => other.id !== wish.id).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  async function merge(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/admin/wishes/${wish.id}/merge`, { method: 'POST', body: { targetId } });
      toast.success('Zusammengeführt. Stimmen und Nennungen wurden übernommen.');
      onMerged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Doppelten Wunsch zusammenführen" onClose={onClose}>
      <form onSubmit={merge}>
        <p className="modal-intro">
          „{wish.name}“ wird in den gewählten Wunsch übernommen (Stimmen und Nennungen zählen dort weiter) und danach gelöscht.
        </p>
        <SelectField label="Zusammenführen mit" value={targetId} onChange={setTargetId}>
          {candidates.map((other) => <option key={other.id} value={other.id}>{other.name} ({WISH_STATUS[other.status].label})</option>)}
        </SelectField>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" busy={busy} disabled={!targetId}>Zusammenführen</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Wishes() {
  const { data, error, loading, reload, setData } = useApi('/admin/wishes');
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [tab, setTab] = useState('new');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const wishes = data?.items ?? [];
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, t.statuses ? wishes.filter((w) => t.statuses.includes(w.status)).length : wishes.length])),
    [wishes]
  );
  const term = search.trim().toLowerCase();
  const active = TABS.find((t) => t.id === tab);
  const visible = wishes
    .filter((w) => (!active.statuses || active.statuses.includes(w.status)) && (!term || `${w.name} ${w.note}`.toLowerCase().includes(term)))
    .sort((a, b) => (tab === 'new' ? b.createdAt.localeCompare(a.createdAt) : b.votes - a.votes || b.mentions - a.mentions));

  const replace = (item) => setData((prev) => ({ ...prev, items: prev.items.map((w) => (w.id === item.id ? item : w)) }));

  async function setStatus(wish, status, message) {
    const result = await run(() => api(`/admin/wishes/${wish.id}`, { method: 'PATCH', body: { status } }), message);
    if (result?.item) replace(result.item);
  }

  async function remove(wish) {
    const ok = await confirm({
      title: 'Wunsch löschen?',
      message: `„${wish.name}“ wird mit allen ${wish.votes} Stimmen gelöscht. Tipp: „Ablehnen“ blendet ihn nur aus.`,
      confirmLabel: 'Endgültig löschen',
      danger: true,
    });
    if (ok && (await run(() => api(`/admin/wishes/${wish.id}`, { method: 'DELETE' }), 'Wunsch gelöscht.'))) {
      setData((prev) => ({ ...prev, items: prev.items.filter((w) => w.id !== wish.id) }));
    }
  }

  return (
    <>
      <PageHeader
        title="Produktwünsche"
        description="Was Kunden sich auf der Webseite wünschen. Neue Wünsche erscheinen erst nach deiner Freigabe; dann kann jeder abstimmen."
      />
      <div className="toolbar">
        <Tabs active={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: counts[t.id] }))} />
        <SearchInput value={search} onChange={setSearch} placeholder="Wünsche durchsuchen…" />
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : visible.length === 0 ? (
        <EmptyState icon="message" title={tab === 'new' ? 'Keine neuen Wünsche' : 'Keine Wünsche'}>
          {tab === 'new' && 'Neue Wünsche von der Webseite landen hier zur Freigabe.'}
        </EmptyState>
      ) : (
        <ul className="list">
          {visible.map((wish) => (
            <li key={wish.id} className="list-row wish-row">
              <div className="row-title">
                <span className="thumb wish-score" title="Stimmen">
                  <strong>{wish.votes}</strong>
                  <small>Stimmen</small>
                </span>
                <span>
                  <strong>{wish.name}</strong>
                  {wish.note && <small>„{wish.note}“</small>}
                  <span className="badges">
                    <Badge tone={WISH_STATUS[wish.status].tone}>{WISH_STATUS[wish.status].label}</Badge>
                    {wish.mentions > 1 && <Badge>{wish.mentions}× gewünscht</Badge>}
                    <Badge><span title={formatDateTime(wish.createdAt)}>{formatRelative(wish.createdAt)}</span></Badge>
                  </span>
                </span>
              </div>
              <div className="row-actions">
                {wish.status === 'new' ? (
                  <>
                    <Button size="small" onClick={() => setStatus(wish, 'approved', 'Freigegeben: jetzt auf der Webseite.')} disabled={busy}>
                      <Icon name="check" size={15} /> Freigeben
                    </Button>
                    <Button variant="ghost" size="small" onClick={() => setStatus(wish, 'rejected', 'Abgelehnt.')} disabled={busy}>Ablehnen</Button>
                  </>
                ) : (
                  <select
                    className="filter"
                    value={wish.status}
                    onChange={(e) => setStatus(wish, e.target.value, `Status: ${WISH_STATUS[e.target.value].label}`)}
                    aria-label={`Status von ${wish.name}`}
                    disabled={busy}
                  >
                    {Object.entries(WISH_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
                  </select>
                )}
                <Button variant="icon" size="small" onClick={() => setModal({ type: 'edit', wish })} title="Bearbeiten" aria-label={`${wish.name} bearbeiten`}>
                  <Icon name="pencil" size={16} />
                </Button>
                <Button variant="icon" size="small" onClick={() => setModal({ type: 'merge', wish })} title="Mit anderem Wunsch zusammenführen" aria-label={`${wish.name} zusammenführen`} disabled={wishes.length < 2}>
                  <Icon name="copy" size={16} />
                </Button>
                <Button variant="icon" size="small" onClick={() => remove(wish)} title="Löschen" aria-label={`${wish.name} löschen`}>
                  <Icon name="trash" size={16} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="hint-bar subtle">
        Status: <strong>Freigegeben</strong> = sichtbar mit Abstimmung · <strong>Geplant</strong> = sichtbar mit „Geplant“ ·{' '}
        <strong>Im Laden</strong> = „Jetzt im Laden“ · <strong>Abgelehnt</strong> = unsichtbar.
      </p>

      {modal?.type === 'edit' && <EditModal wish={modal.wish} onClose={() => setModal(null)} onSaved={(item) => { replace(item); setModal(null); }} />}
      {modal?.type === 'merge' && (
        <MergeModal wish={modal.wish} wishes={wishes} onClose={() => setModal(null)} onMerged={() => { setModal(null); reload(); }} />
      )}
    </>
  );
}
