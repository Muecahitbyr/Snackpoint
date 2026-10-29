import { useEffect, useState } from 'react';
import { api, useApi } from '../api';
import { Calendar, TimeField } from '../DateTimePicker';
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
const SHORT_LABEL = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const dayLabel = (day) => DAY_LABEL.format(new Date(`${day}T00:00:00Z`));
const shortLabel = (day) => SHORT_LABEL.format(new Date(`${day}T00:00:00Z`));
const todayKey = () => new Date().toLocaleDateString('sv-SE');
const EMPTY_FORM = { closed: true, open: '08:00', close: '14:00', note: '' };

/**
 * Holidays, closures and short days: pick one or several days in the
 * calendar and give them other hours than the weekly plan.
 */
function SpecialDays() {
  const { data, error, loading, reload } = useApi('/admin/hours/special');
  const toast = useToast();
  const confirm = useConfirm();
  const [selected, setSelected] = useState(() => new Set());
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const items = data?.items ?? [];
  const byDay = new Map(items.map((item) => [item.day, item]));
  const marked = new Set(byDay.keys());
  const days = [...selected].sort();
  const withEntry = days.filter((day) => byDay.has(day));
  const today = todayKey();

  // A single day that already has an entry: start from its hours.
  function fill(day) {
    const item = byDay.get(day);
    setForm(item ? { closed: item.closed, open: item.open ?? EMPTY_FORM.open, close: item.close ?? EMPTY_FORM.close, note: item.note } : EMPTY_FORM);
  }

  function toggle(day) {
    const next = new Set(selected);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    setSelected(next);
    setErrors({});
    if (next.size === 1) fill([...next][0]);
  }

  function edit(item) {
    setSelected(new Set([item.day]));
    setErrors({});
    fill(item.day);
  }

  const clear = () => {
    setSelected(new Set());
    setForm(EMPTY_FORM);
    setErrors({});
  };

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const body = { days, closed: form.closed, open: form.closed ? null : form.open, close: form.closed ? null : form.close, note: form.note };
      await api('/admin/hours/special/days', { method: 'POST', body });
      toast.success(`${days.length === 1 ? 'Tag' : `${days.length} Tage`} gespeichert. Die Webseite und der Chat-Assistent nutzen das sofort.`);
      clear();
      reload();
    } catch (err) {
      setErrors(err.fields);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(list) {
    const ok = await confirm({
      title: list.length === 1 ? 'Wieder normaler Wochenplan?' : `${list.length} Tage zurücksetzen?`,
      message: `${list.map(shortLabel).join(', ')}: dann gelten wieder die normalen Öffnungszeiten.`,
      confirmLabel: 'Zurücksetzen',
      danger: true,
    });
    if (!ok) return;
    try {
      await api('/admin/hours/special/days/remove', { method: 'POST', body: { days: list } });
      toast.success('Wieder normaler Wochenplan.');
      clear();
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Card title="Abweichende Tage" description="Feiertage, Urlaub oder kürzere Tage. Tippe im Kalender einen oder mehrere Tage an und lege die Zeiten dafür fest. An diesen Tagen gelten sie statt des Wochenplans, auch für den „Geöffnet“-Hinweis und den Chat-Assistenten.">
      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <>
          <div className="special-layout">
            <div className="special-calendar">
              <Calendar selected={selected} min={today} marked={marked} onPick={toggle} autoFocus={false} />
              <p className="special-legend"><span className="legend-marked" aria-hidden="true" /> schon eingetragen</p>
            </div>

            <div className="special-editor">
              {days.length === 0 ? (
                <p className="special-empty">Wähle im Kalender die Tage aus, z. B. 24.12. für früheren Feierabend oder 31.12. bis 2.1. für mehrere geschlossene Tage.</p>
              ) : (
                <>
                  <h3>{days.length === 1 ? dayLabel(days[0]) : `${days.length} Tage ausgewählt`}</h3>
                  {days.length > 1 && <p className="special-chosen">{days.map(shortLabel).join(' · ')}</p>}
                  {withEntry.length > 0 && days.length > 1 && (
                    <p className="special-chosen subtle">{withEntry.length === 1 ? 'Ein Tag hat' : `${withEntry.length} Tage haben`} schon einen Eintrag, er wird überschrieben.</p>
                  )}
                  <div className={`hours-row special-times ${form.closed ? 'is-closed' : ''}`}>
                    <Toggle label={form.closed ? 'Geschlossen' : 'Geöffnet'} checked={!form.closed} onChange={(open) => set('closed')(!open)} />
                    <div className="hours-times">
                      <TimeField value={form.open} disabled={form.closed} onChange={set('open')} ariaLabel="Öffnet" />
                      <span>bis</span>
                      <TimeField value={form.close} disabled={form.closed} onChange={set('close')} ariaLabel="Schließt" />
                    </div>
                    {(errors.open || errors.close) && <p className="field-error hours-error">{errors.open || errors.close}</p>}
                  </div>
                  <TextField label="Hinweis" hint="Optional, z. B. „Heiligabend“ oder „Betriebsurlaub“" value={form.note} onChange={set('note')} error={errors.note} maxLength={80} />
                  <div className="special-actions">
                    <Button busy={busy} onClick={save}>{days.length === 1 ? 'Speichern' : `Für ${days.length} Tage speichern`}</Button>
                    {withEntry.length > 0 && <Button variant="ghost" onClick={() => reset(withEntry)}>Auf Wochenplan zurücksetzen</Button>}
                    <Button variant="ghost" onClick={clear}>Auswahl leeren</Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState icon="calendar" title="Keine abweichenden Tage eingetragen" />
          ) : (
            <div className="hours-list special-list">
              {items.map((item) => (
                <div key={item.id} className={`hours-row special-row ${item.day < today ? 'is-past' : ''}`}>
                  <strong className="hours-day">{dayLabel(item.day)}</strong>
                  <span className="special-info">
                    {item.closed ? <Badge tone="danger">Geschlossen</Badge> : <Badge tone="warning">{item.open} – {item.close} Uhr</Badge>}
                    {item.note && <span>{item.note}</span>}
                    {item.day < today && <small>vorbei</small>}
                  </span>
                  <span className="row-actions">
                    {item.day >= today && <Button variant="ghost" size="small" onClick={() => edit(item)}>Bearbeiten</Button>}
                    <Button variant="ghost" size="small" onClick={() => reset([item.day])}>Löschen</Button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
