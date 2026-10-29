import { useEffect, useState } from 'react';
import { api, formatDateTime, useApi } from '../api';
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Spinner, Tabs, useAction, useConfirm } from '../ui';
import { describeChange } from './Dashboard';

const PAGE = 50;

/** Recent login attempts — failed ones in red, to spot password guessing. */
function Logins() {
  const { data, error, loading, reload } = useApi('/admin/audit/logins');
  const confirm = useConfirm();
  const [run, busy] = useAction();
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { summary, items, locks } = data;

  async function unlock(lock) {
    const what = lock.type === 'account' ? `das Konto „${lock.value}“` : `die Adresse ${lock.value}`;
    const ok = await confirm({
      title: 'Sperre aufheben?',
      message: `Die Fehlversuche für ${what} werden gelöscht, eine Anmeldung ist sofort wieder möglich. Nur aufheben, wenn du weißt, dass es kein Angriff ist.`,
      confirmLabel: 'Sperre aufheben',
    });
    if (ok && (await run(() => api('/admin/audit/logins/unlock', { method: 'POST', body: { type: lock.type, value: lock.value } }), 'Sperre aufgehoben.'))) reload();
  }

  return (
    <>
      {locks.length > 0 && (
        <Card title="Gerade gesperrt" description="Nach zu vielen Fehlversuchen sperrt die Anmeldung automatisch. Die Sperre endet von selbst, du kannst sie hier aber auch früher aufheben.">
          <ul className="activity">
            {locks.map((lock) => (
              <li key={`${lock.type}:${lock.value}`}>
                <div>
                  <strong>{lock.value}</strong>
                  <span className="activity-summary">{lock.type === 'account' ? 'Konto' : 'IP-Adresse'} · gesperrt bis {formatDateTime(lock.until)}</span>
                </div>
                <span className="activity-side">
                  <Button variant="ghost" size="small" busy={busy} onClick={() => unlock(lock)}>Sperre aufheben</Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="stats">
        <div className="stat"><span className="stat-value">{summary.failed_24h}</span><span className="stat-label">Fehlgeschlagen (24 h)</span><span className="stat-hint">von {summary.failed_ips_24h} Adressen</span></div>
        <div className="stat"><span className="stat-value">{summary.success_24h}</span><span className="stat-label">Erfolgreich (24 h)</span></div>
      </div>
      <Card description="Die letzten Anmeldeversuche (7 Tage). Viele Fehlversuche von unbekannten Adressen werden automatisch immer länger gesperrt.">
        {items.length === 0 ? <EmptyState icon="key" title="Noch keine Anmeldeversuche" /> : (
          <ul className="activity">
            {items.map((item, i) => (
              <li key={i}>
                <div>
                  <strong>{item.identifier}</strong>
                  <span className="activity-summary">IP {item.ip}</span>
                </div>
                <span className="activity-side">
                  {item.success ? <Badge tone="success">Erfolgreich</Badge> : <Badge tone="danger">Fehlgeschlagen</Badge>}{' '}
                  {formatDateTime(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

/** Change log: who changed what, when (developer only). */
export default function Protocol() {
  const [tab, setTab] = useState('changes');
  return (
    <>
      <PageHeader title="Protokoll" description="Wer hat wann was geändert, und wer hat sich wann angemeldet. Passwörter werden nie gespeichert." />
      <Tabs active={tab} onChange={setTab} tabs={[{ id: 'changes', label: 'Änderungen', icon: 'activity' }, { id: 'logins', label: 'Anmeldungen', icon: 'key' }]} />
      {tab === 'changes' ? <Changes /> : <Logins />}
    </>
  );
}

function Changes() {
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState([]);
  const page = useApi(`/admin/audit?limit=${PAGE}&offset=${offset}`);

  useEffect(() => {
    if (page.data) setEntries((list) => (offset === 0 ? page.data.items : [...list, ...page.data.items]));
  }, [page.data, offset]);

  return (
    <>
      <Card>
        {page.error ? <ErrorBox error={page.error} onRetry={page.reload} /> : entries.length === 0 && !page.loading ? (
          <EmptyState icon="activity" title="Noch keine Einträge" />
        ) : (
          <>
            <ul className="activity">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>{describeChange(entry)}</strong>
                    {entry.summary && <span className="activity-summary">{entry.summary}</span>}
                  </div>
                  <span className="activity-side">
                    {formatDateTime(entry.createdAt)}
                    {entry.user && <small className="activity-user">{entry.user}</small>}
                  </span>
                </li>
              ))}
            </ul>
            {page.loading && <Spinner />}
            {page.data?.items.length === PAGE && (
              <div className="card-foot">
                <Button variant="ghost" size="small" onClick={() => setOffset((value) => value + PAGE)}>Ältere laden</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
