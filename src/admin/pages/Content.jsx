import { useEffect, useState } from 'react';
import { api, formatRelative, useApi } from '../api';
import { Badge, Button, Card, ErrorBox, ImageField, PageHeader, SelectField, Spinner, Tabs, TextField, Toggle, useToast } from '../ui';
import ManagedList, { FormActions } from './ManagedList';

function ContentSection({ section, values, onSaved }) {
  const toast = useToast();
  const initial = () =>
    Object.fromEntries(
      section.fields.map((field) => [
        field.key,
        field.type === 'image'
          ? values[field.key]?.mediaId ? { id: values[field.key].mediaId, url: values[field.key].mediaUrl, thumbUrl: values[field.key].thumbUrl } : null
          : values[field.key]?.value ?? '',
      ])
    );
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const changed = section.fields.filter((field) =>
    field.type === 'image' ? (form[field.key]?.id ?? null) !== (saved[field.key]?.id ?? null) : form[field.key] !== saved[field.key]
  );
  const lastUpdate = section.fields.map((field) => values[field.key]?.updatedAt).filter(Boolean).sort().pop();

  async function save() {
    const body = { values: {}, media: {} };
    for (const field of changed) {
      if (field.type === 'image') body.media[field.key] = form[field.key]?.id ?? null;
      else body.values[field.key] = form[field.key];
    }
    setBusy(true);
    setErrors({});
    try {
      await api('/admin/content', { method: 'PUT', body });
      setSaved(form);
      toast.success(`„${section.title}“ gespeichert — jetzt auf der Webseite sichtbar.`);
      onSaved?.();
    } catch (error) {
      setErrors(error.fields);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={section.title}
      description={section.description}
      actions={lastUpdate && <span className="muted small">geändert {formatRelative(lastUpdate)}</span>}
    >
      {section.fields.map((field) =>
        field.type === 'image' ? (
          <ImageField
            key={field.key}
            label={field.label}
            hint="Ohne Bild wird das Standard-Logo verwendet."
            value={form[field.key]}
            onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
          />
        ) : (
          <TextField
            key={field.key}
            label={field.label}
            multiline={field.type === 'textarea'}
            rows={3}
            value={form[field.key]}
            maxLength={field.max ?? (field.type === 'textarea' ? 3000 : 300)}
            error={errors[field.key]}
            onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
          />
        )
      )}
      <div className="card-foot">
        {changed.length > 0 && <span className="muted small">{changed.length} ungespeicherte Änderung{changed.length > 1 ? 'en' : ''}</span>}
        {changed.length > 0 && <Button variant="ghost" size="small" onClick={() => setForm(saved)}>Verwerfen</Button>}
        <Button size="small" busy={busy} disabled={!changed.length} onClick={save}>Speichern</Button>
      </div>
    </Card>
  );
}

function Texts() {
  const { data, error, loading, reload } = useApi('/admin/content');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <div className="stack">
      <p className="hint-bar subtle">Jeder Bereich wird einzeln gespeichert. Änderungen sind sofort auf der Webseite sichtbar.</p>
      {data.sections.map((section) => (
        <ContentSection key={section.id} section={section} values={data.values} />
      ))}
    </div>
  );
}

const GRADIENTS = [
  { id: 'red', label: 'Rot' },
  { id: 'gold', label: 'Gold' },
  { id: 'deep', label: 'Dunkelrot' },
];

function ServiceForm({ item, errors, busy, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: item?.title ?? '', description: item?.description ?? '', icon: item?.icon ?? '', logo: item?.logo ?? null,
    gradient: item?.gradient ?? 'red', badge: item?.badge ?? '', isActive: item?.isActive ?? true,
  });
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const { logo, ...rest } = form;
        onSave({ ...rest, logoMediaId: logo?.id ?? null });
      }}
    >
      <TextField label="Titel" required value={form.title} onChange={set('title')} error={errors.title} maxLength={80} />
      <TextField label="Text" multiline rows={3} value={form.description} onChange={set('description')} error={errors.description} maxLength={600} />
      <div className="field-row">
        <ImageField label="Logo" value={form.logo} onChange={set('logo')} />
        <div>
          <TextField label="Emoji (ohne Logo)" value={form.icon} onChange={set('icon')} error={errors.icon} maxLength={16} />
          <SelectField label="Farbe (ohne Logo)" value={form.gradient} onChange={set('gradient')}>
            {GRADIENTS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </SelectField>
        </div>
      </div>
      <TextField
        label="Laufband-Hinweis"
        hint="Optional — z. B. „BALD VERFÜGBAR“ als schräges Laufband über der Karte. Leer = kein Laufband."
        value={form.badge}
        onChange={set('badge')}
        error={errors.badge}
        maxLength={40}
      />
      <Toggle label="Aktiv" checked={form.isActive} onChange={set('isActive')} />
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  );
}

function ReviewForm({ item, errors, busy, onSave, onCancel }) {
  const [form, setForm] = useState({
    authorName: item?.authorName ?? '', text: item?.text ?? '', timeLabel: item?.timeLabel ?? '', initials: item?.initials ?? '',
    color: item?.color ?? '#e0201f', isActive: item?.isActive ?? true,
  });
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div className="field-row">
        <TextField label="Name" required value={form.authorName} onChange={set('authorName')} error={errors.authorName} maxLength={80} />
        <TextField label="Zeitangabe" placeholder="z. B. vor 2 Monaten" value={form.timeLabel} onChange={set('timeLabel')} error={errors.timeLabel} maxLength={40} />
      </div>
      <TextField label="Bewertungstext" required multiline rows={4} value={form.text} onChange={set('text')} error={errors.text} maxLength={1000} />
      <div className="field-row">
        <TextField label="Initialen" hint="Leer = automatisch aus dem Namen" value={form.initials} onChange={set('initials')} error={errors.initials} maxLength={4} />
        <TextField label="Farbe" type="color" value={form.color} onChange={set('color')} error={errors.color} />
      </div>
      <Toggle label="Aktiv" checked={form.isActive} onChange={set('isActive')} />
      <FormActions busy={busy} onCancel={onCancel} />
    </form>
  );
}

export default function Content() {
  const [tab, setTab] = useState(() => (window.location.hash.includes('leistungen') ? 'services' : 'texts'));
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <>
      <PageHeader title="Webseiteninhalte" description="Überschriften, Texte, Bilder, Leistungen und Kundenbewertungen der Webseite." />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[{ id: 'texts', label: '📝 Texte & Bilder' }, { id: 'services', label: '🧰 Leistungen' }, { id: 'reviews', label: '⭐ Bewertungen' }]}
      />
      {tab === 'texts' && <Texts />}
      {tab === 'services' && (
        <ManagedList
          key="services"
          endpoint="/admin/services"
          noun="Leistung"
          newLabel="Neue Leistung"
          emptyIcon="🧰"
          emptyText="Noch keine Leistungen"
          Form={ServiceForm}
          describe={(item) => ({
            thumb: item.logo ? <img src={item.logo.thumbUrl} alt="" /> : item.icon || '🧰',
            title: item.title,
            subtitle: item.description,
            badges: item.badge ? <Badge tone="accent">Laufband: {item.badge}</Badge> : null,
          })}
        />
      )}
      {tab === 'reviews' && (
        <ManagedList
          key="reviews"
          endpoint="/admin/reviews"
          noun="Bewertung"
          newLabel="Neue Bewertung"
          emptyIcon="⭐"
          emptyText="Noch keine Bewertungen"
          Form={ReviewForm}
          describe={(item) => ({
            thumb: <span className="avatar" style={{ background: item.color }}>{item.initials}</span>,
            title: item.authorName,
            subtitle: item.text.length > 90 ? `${item.text.slice(0, 90)}…` : item.text,
          })}
        />
      )}
    </>
  );
}
