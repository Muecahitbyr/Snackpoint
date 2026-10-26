import { useEffect, useState } from 'react';
import { api, useApi } from '../api';
import { TimeField } from '../DateTimePicker';
import { Button, Card, ErrorBox, PageHeader, Spinner, Toggle, useToast } from '../ui';

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
      <p className="hint-bar subtle">Für einmalige Schließungen (z. B. Feiertage) einfach einen Banner unter „Banner & Aktionen“ schalten.</p>
    </>
  );
}
