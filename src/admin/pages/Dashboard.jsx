import { formatDateTime, formatRelative, useApi } from '../api';
import { navigate } from '../router';
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '../ui';

const ENTITY_LABELS = {
  product: 'Produkt', product_group: 'Bereich', product_category: 'Kategorie', event: 'Event', banner: 'Banner',
  promotion: 'Aktion', service: 'Leistung', review: 'Bewertung', content: 'Webseiteninhalt', settings: 'Einstellungen',
  opening_hours: 'Öffnungszeiten', media: 'Bild', password: 'Passwort', session: 'Sitzung',
};
const ACTION_LABELS = { create: 'erstellt', update: 'geändert', delete: 'gelöscht', reorder: 'sortiert' };

export function describeChange(entry) {
  return `${ENTITY_LABELS[entry.entityType] ?? entry.entityType} ${ACTION_LABELS[entry.action] ?? entry.action}`;
}

function Stat({ label, value, hint, href }) {
  return (
    <a className="stat" href={href}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </a>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useApi('/admin/dashboard');

  return (
    <>
      <PageHeader
        title="Willkommen zurück 👋"
        description="Hier siehst du auf einen Blick, was auf deiner Webseite los ist."
        actions={<a className="a-btn a-btn-ghost" href="/" target="_blank" rel="noopener noreferrer">↗ Webseite ansehen</a>}
      />

      <div className="quick-actions">
        <Button onClick={() => navigate('produkte/neu')}>＋ Neues Produkt</Button>
        <Button onClick={() => navigate('events/neu')}>＋ Neues Event</Button>
        <Button variant="ghost" onClick={() => navigate('banner')}>📣 Banner schalten</Button>
        <Button variant="ghost" onClick={() => navigate('medien')}>🖼️ Bilder hochladen</Button>
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <>
          <div className="stats">
            <Stat label="Produkte" value={data.counts.products} href="#/produkte" hint={`${data.counts.categories} Kategorien`} />
            <Stat label="Aktive Produkte" value={data.counts.active_products} href="#/produkte" hint={`${data.counts.highlights} Highlights`} />
            <Stat label="Kommende Events" value={data.counts.upcoming_events} href="#/events" hint={data.counts.draft_events ? `${data.counts.draft_events} Entwürfe` : null} />
            <Stat label="Veröffentlichte Events" value={data.counts.published_events} href="#/events" />
            <Stat label="Banner live" value={data.counts.live_banners} href="#/banner" hint={`${data.counts.live_promotions} Aktionen aktiv`} />
            <Stat label="Bilder" value={data.counts.media} href="#/medien" />
          </div>

          <div className="dashboard-grid">
            <Card title="Letzte Änderungen" actions={<a className="card-link" href="#/einstellungen">Alle ansehen</a>}>
              {data.recent.length ? (
                <ul className="activity">
                  {data.recent.map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <strong>{describeChange(entry)}</strong>
                        {entry.summary && <span className="activity-summary">{entry.summary}</span>}
                      </div>
                      <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>{formatRelative(entry.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon="🕊️" title="Noch keine Änderungen" />}
            </Card>

            <Card title="Nächste Events" actions={<a className="card-link" href="#/events">Alle Events</a>}>
              {data.nextEvents.length ? (
                <ul className="activity">
                  {data.nextEvents.map((event) => (
                    <li key={event.id}>
                      <a href={`#/events/${event.id}`}><strong>{event.title}</strong></a>
                      <span className="activity-side">
                        {formatDateTime(event.startsAt)}{' '}
                        {event.status === 'draft' && <Badge tone="warning">Entwurf</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="📅" title="Keine Events geplant">
                  <Button size="small" onClick={() => navigate('events/neu')}>Event anlegen</Button>
                </EmptyState>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
