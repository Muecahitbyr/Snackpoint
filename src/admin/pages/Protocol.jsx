import { useEffect, useState } from 'react';
import { formatDateTime, useApi } from '../api';
import { Button, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '../ui';
import { describeChange } from './Dashboard';

const PAGE = 50;

/** Change log: who changed what, when (developer only). */
export default function Protocol() {
  const [offset, setOffset] = useState(0);
  const [entries, setEntries] = useState([]);
  const page = useApi(`/admin/audit?limit=${PAGE}&offset=${offset}`);

  useEffect(() => {
    if (page.data) setEntries((list) => (offset === 0 ? page.data.items : [...list, ...page.data.items]));
  }, [page.data, offset]);

  return (
    <>
      <PageHeader title="Protokoll" description="Wer hat wann was geändert. Passwörter und andere sensible Daten werden nie protokolliert." />
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
