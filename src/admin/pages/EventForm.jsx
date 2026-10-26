import { useEffect, useState } from 'react';
import { api, formatEuroInput, fromLocalInput, parseEuro, toLocalInput, useApi } from '../api';
import { navigate } from '../router';
import { DateTimeField } from '../DateTimePicker';
import {
  Badge, Button, Card, ErrorBox, Field, GalleryField, ImageField, PageHeader, Spinner, TextField, Toggle, useConfirm, useToast,
} from '../ui';
import { Icon } from '../icons';

const EMPTY = {
  title: '', description: '', location: '', startsAt: '', endsAt: '', priceMode: 'none', price: '', admissionNote: '',
  status: 'draft', isActive: true, isFeatured: false, sortOrder: 0, cover: null, gallery: [],
};

function fromEvent(event) {
  const priceMode = event.admissionPriceCents === null ? 'none' : event.admissionPriceCents === 0 ? 'free' : 'paid';
  return {
    ...EMPTY,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    priceMode,
    price: priceMode === 'paid' ? formatEuroInput(event.admissionPriceCents) : '',
    admissionNote: event.admissionNote,
    status: event.status,
    isActive: event.isActive,
    isFeatured: event.isFeatured,
    sortOrder: event.sortOrder,
    cover: event.cover,
    gallery: event.gallery,
  };
}

const PRICE_MODES = [
  { id: 'none', label: 'Keine Angabe' },
  { id: 'free', label: 'Eintritt frei' },
  { id: 'paid', label: 'Eintrittspreis' },
];

export default function EventForm({ id }) {
  const event = useApi(id ? `/admin/events/${id}` : null);
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (event.data?.item) setForm(fromEvent(event.data.item));
  }, [event.data]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save(status) {
    const local = {};
    if (!form.startsAt) local.startsAt = 'Bitte Datum und Uhrzeit wählen';
    const priceCents = form.priceMode === 'paid' ? parseEuro(form.price) : form.priceMode === 'free' ? 0 : null;
    if (form.priceMode === 'paid' && (priceCents === null || Number.isNaN(priceCents))) local.admissionPriceCents = 'Bitte einen Betrag eingeben, z. B. 5,00';
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error('Bitte überprüfe die markierten Felder.');
      return;
    }
    const body = {
      title: form.title, description: form.description, location: form.location,
      startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt),
      admissionPriceCents: priceCents, admissionNote: form.admissionNote, status,
      isActive: form.isActive, isFeatured: form.isFeatured, sortOrder: Number(form.sortOrder) || 0,
      coverMediaId: form.cover?.id ?? null, galleryMediaIds: form.gallery.map((image) => image.id),
    };
    setBusy(status);
    setErrors({});
    try {
      const result = await api(id ? `/admin/events/${id}` : '/admin/events', { method: id ? 'PUT' : 'POST', body });
      toast.success(status === 'published' ? 'Event gespeichert und veröffentlicht.' : 'Als Entwurf gespeichert — noch nicht auf der Webseite.');
      if (!id) navigate(`events/${result.item.id}`);
      else setForm(fromEvent(result.item));
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    const ok = await confirm({ title: 'Event löschen?', message: `„${form.title}“ wird endgültig gelöscht.`, confirmLabel: 'Endgültig löschen', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/events/${id}`, { method: 'DELETE' });
      toast.success('Event gelöscht.');
      navigate('events');
    } catch (error) {
      toast.error(error.message);
    }
  }

  if (id && event.loading && !event.data) return <Spinner />;
  if (id && event.error) return <ErrorBox error={event.error} onRetry={event.reload} />;

  const published = form.status === 'published';
  const actions = (
    <>
      <Button variant="ghost" busy={busy === 'draft'} disabled={Boolean(busy)} onClick={() => save('draft')}>
        {published ? 'Als Entwurf zurückziehen' : 'Als Entwurf speichern'}
      </Button>
      <Button busy={busy === 'published'} disabled={Boolean(busy)} onClick={() => save('published')}>
        {published ? 'Speichern' : 'Veröffentlichen'}
      </Button>
    </>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(form.status); }} noValidate>
      <PageHeader
        title={id ? form.title || 'Event bearbeiten' : 'Neues Event'}
        description={
          <>
            <a href="#/events" className="back-link"><Icon name="arrowLeft" size={15} /> Zurück zur Übersicht</a>{' '}
            {id && (published ? <Badge tone="success">Veröffentlicht</Badge> : <Badge tone="warning">Entwurf</Badge>)}
          </>
        }
        actions={<>{id && <Button variant="danger-ghost" onClick={remove}>Löschen</Button>}{actions}</>}
      />

      <div className="form-layout">
        <div className="form-main">
          <Card title="Details">
            <TextField label="Titel" required value={form.title} onChange={set('title')} error={errors.title} maxLength={140} />
            <TextField label="Beschreibung" multiline rows={6} value={form.description} onChange={set('description')} error={errors.description} maxLength={5000} />
            <TextField label="Veranstaltungsort" placeholder="z. B. Vor dem Laden, Neugablonzer Str. 25" value={form.location} onChange={set('location')} error={errors.location} maxLength={200} />
          </Card>

          <Card title="Datum & Uhrzeit">
            <div className="field-row">
              <DateTimeField label="Beginn" required value={form.startsAt} onChange={set('startsAt')} error={errors.startsAt} defaultTime="18:00" />
              <DateTimeField
                label="Ende"
                hint="Optional"
                value={form.endsAt}
                onChange={set('endsAt')}
                error={errors.endsAt}
                min={form.startsAt || undefined}
                defaultTime={form.startsAt ? form.startsAt.slice(11, 16) : '20:00'}
                placeholder="Ende wählen (optional)"
              />
            </div>
          </Card>

          <Card title="Eintritt">
            <Field>
              <div className="radio-group">
                {PRICE_MODES.map((mode) => (
                  <label key={mode.id} className={`radio ${form.priceMode === mode.id ? 'is-checked' : ''}`}>
                    <input type="radio" name="priceMode" checked={form.priceMode === mode.id} onChange={() => set('priceMode')(mode.id)} />
                    {mode.label}
                  </label>
                ))}
              </div>
            </Field>
            <div className="field-row">
              {form.priceMode === 'paid' && (
                <TextField label="Preis (€)" inputMode="decimal" placeholder="5,00" value={form.price} onChange={set('price')} error={errors.admissionPriceCents} />
              )}
              <TextField label="Hinweis" placeholder="z. B. Kinder frei" value={form.admissionNote} onChange={set('admissionNote')} error={errors.admissionNote} maxLength={120} />
            </div>
          </Card>

          <Card title="Bilder">
            <ImageField label="Titelbild" value={form.cover} onChange={set('cover')} />
            <GalleryField label="Galerie" hint="Weitere Bilder, erscheinen auf der Event-Seite." value={form.gallery} onChange={set('gallery')} />
          </Card>
        </div>

        <div className="form-side">
          <Card title="Anzeige">
            <Toggle label="Aktiv" hint="Inaktive Events sind nicht auf der Webseite, auch wenn sie veröffentlicht sind." checked={form.isActive} onChange={set('isActive')} />
            <Toggle label="Hervorheben" hint="Wird als Highlight und ganz vorne angezeigt." checked={form.isFeatured} onChange={set('isFeatured')} />
            <TextField label="Reihenfolge" hint="Kleinere Zahl = weiter vorne. Sonst nach Datum." type="number" value={form.sortOrder} onChange={set('sortOrder')} error={errors.sortOrder} />
          </Card>
          <Card title="So geht's">
            <p className="muted small">
              <strong>Entwurf</strong> = nur hier sichtbar. <strong>Veröffentlichen</strong> = sofort auf der Webseite. Vergangene Events
              werden automatisch archiviert.
            </p>
          </Card>
        </div>
      </div>

      <div className="sticky-actions">{actions}</div>
    </form>
  );
}
