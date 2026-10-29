import { useEffect, useState } from 'react';
import { api, useApi } from '../api';
import { TimeField } from '../DateTimePicker';
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Spinner, TextField, Toggle, useConfirm, useToast } from '../ui';

export default function Hours() {
  const { data, error, loading, reload } = useApi('/admin/hours');
  const toast = useToast();
  const [days, setDays] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setDays(data.days);
  }, [data]);

  const update = (index, changes) => setDays((list) => list.map((day, i) => (i === index ? { ...day, ...changes } : day)));
  const changed = JSON.stringify(days) !== JSON.stringify(data?.days ?? []);

  function copyFirstToAll() {
    const [first] = days;
    setDays((list) => list.map((day) => ({ ...day, open: first.open, close: first.close, closed: first.closed })));
  }

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const result = await api('/admin/hours', { method: 'PUT', body: { days: days.map(({ weekday, open, close, closed }) => ({ weekday, open, close, closed })) } });
      setDays(result.days);
      reload();
      toast.success('Öffnungszeiten gespeichert — die Webseite und der Chat-Assistent nutzen sie sofort.');
    } catch (err) {
      setErrors(err.fields);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Öffnungszeiten"
        description="Werden im Standort-Bereich, im „Geöffnet/Geschlossen“-Hinweis oben und vom Chat-Assistenten verwendet."
      />
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <Card
          actions={<Button variant="ghost" size="small" onClick={copyFirstToAll}>{days[0]?.day}s-Zeiten für alle Tage übernehmen</Button>}
        >
          <div className="hours-list">
            {days.map((day, i) => (
              <div key={day.weekday} className={`hours-row ${day.closed ? 'is-closed' : ''}`}>
                <strong className="hours-day">{day.day}</strong>
                <Toggle label={day.closed ? 'Geschlossen' : 'Geöffnet'} checked={!day.closed} onChange={(open) => update(i, { closed: !open })} />
                <div className="hours-times">
                  <TimeField value={day.open} disabled={day.closed} onChange={(open) => update(i, { open })} ariaLabel={`${day.day} öffnet`} />
                  <span>bis</span>
                  <TimeField value={day.close} disabled={day.closed} onChange={(close) => update(i, { close })} ariaLabel={`${day.day} schließt`} />
                </div>
                {errors[`days.${i}.close`] && <p className="field-error hours-error">{errors[`days.${i}.close`]}</p>}
              </div>
            ))}
          </div>
          <div className="card-foot">
            {changed && <Button variant="ghost" size="small" onClick={() => setDays(data.days)}>Verwerfen</Button>}
            <Button busy={busy} disabled={!changed} onClick={save}>Speichern</Button>
          </div>
        </Card>
      )}
      <SpecialDays />
    </>
  );
}

const DAY_LABEL = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const dayLabel = (day) => DAY_LABEL.format(new Date(`${day}T00:00:00Z`));
const todayKey = () => new Date().toLocaleDateString('sv-SE');
const EMPTY = { id: null, day: '', closed: true, open: '08:00', close: '14:00', note: '' };

/** Holidays, closures and short days: they override the weekly plan on that date. */
function SpecialDays() {
  const { data, error, loading, reload } = useApi('/admin/hours/special');
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const body = { day: form.day, closed: form.closed, open: form.closed ? null : form.open, close: form.closed ? null : form.close, note: form.note };
      await api(form.id ? `/admin/hours/special/${form.id}` : '/admin/hours/special', { method: form.id ? 'PUT' : 'POST', body });
      toast.success(form.id ? 'Tag geändert.' : 'Tag eingetragen — die Webseite und der Chat-Assistent nutzen ihn sofort.');
      setForm(EMPTY);
      reload();
    } catch (err) {
      setErrors(err.fields);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    const ok = await confirm({ title: 'Eintrag löschen?', message: `Am ${dayLabel(item.day)} gilt dann wieder der normale Wochenplan.`, confirmLabel: 'Löschen', danger: true });
    if (!ok) return;
    try {
      await api(`/admin/hours/special/${item.id}`, { method: 'DELETE' });
      toast.success('Eintrag gelöscht.');
      if (form.id === item.id) setForm(EMPTY);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const today = todayKey();
  return (
    <Card title="Abweichende Tage" description="Feiertage, Urlaub oder kürzere Tage. An diesen Tagen gelten die Zeiten hier statt des Wochenplans, auch für den „Geöffnet“-Hinweis und den Chat-Assistenten.">
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : data.items.length === 0 ? (
        <EmptyState icon="calendar" title="Keine abweichenden Tage eingetragen" />
      ) : (
        <div className="hours-list">
          {data.items.map((item) => (
            <div key={item.id} className={`hours-row special-row ${item.day < today ? 'is-past' : ''}`}>
              <strong className="hours-day">{dayLabel(item.day)}</strong>
              <span className="special-info">
                {item.closed ? <Badge tone="danger">Geschlossen</Badge> : <Badge tone="warning">{item.open} – {item.close} Uhr</Badge>}
                {item.note && <span>{item.note}</span>}
                {item.day < today && <small>vorbei</small>}
              </span>
              <span className="row-actions">
                <Button variant="ghost" size="small" onClick={() => { setErrors({}); setForm({ ...EMPTY, ...item, open: item.open ?? EMPTY.open, close: item.close ?? EMPTY.close }); }}>Bearbeiten</Button>
                <Button variant="ghost" size="small" onClick={() => remove(item)}>Löschen</Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <form className="special-form" onSubmit={save}>
        <h3>{form.id ? `${dayLabel(form.day)} bearbeiten` : 'Tag eintragen'}</h3>
        <div className="field-row">
          <TextField label="Datum" type="date" required min={form.id ? undefined : today} value={form.day} onChange={set('day')} error={errors.day} />
          <TextField label="Hinweis" hint="Optional, z. B. „Heiligabend“ oder „Betriebsurlaub“" value={form.note} onChange={set('note')} error={errors.note} maxLength={80} />
        </div>
        <div className={`hours-row ${form.closed ? 'is-closed' : ''}`}>
          <strong className="hours-day">Zeiten</strong>
          <Toggle label={form.closed ? 'Geschlossen' : 'Geöffnet'} checked={!form.closed} onChange={(open) => set('closed')(!open)} />
          <div className="hours-times">
            <TimeField value={form.open} disabled={form.closed} onChange={set('open')} ariaLabel="Öffnet" />
            <span>bis</span>
            <TimeField value={form.close} disabled={form.closed} onChange={set('close')} ariaLabel="Schließt" />
          </div>
          {(errors.open || errors.close) && <p className="field-error hours-error">{errors.open || errors.close}</p>}
        </div>
        <div className="card-foot">
          {form.id && <Button variant="ghost" size="small" onClick={() => { setForm(EMPTY); setErrors({}); }}>Abbrechen</Button>}
          <Button type="submit" busy={busy} disabled={!form.day}>{form.id ? 'Änderung speichern' : 'Eintragen'}</Button>
        </div>
      </form>
    </Card>
  );
}
