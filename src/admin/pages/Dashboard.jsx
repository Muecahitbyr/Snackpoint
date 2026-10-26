import { formatDateTime, formatRelative, useApi } from '../api';
import { navigate } from '../router';
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '../ui';
import { Icon } from '../icons';

const ENTITY_LABELS = {
  product: 'Produkt', product_group: 'Bereich', product_category: 'Kategorie', event: 'Event', banner: 'Banner',
  promotion: 'Aktion', service: 'Leistung', review: 'Bewertung', content: 'Webseiteninhalt', settings: 'Einstellungen',
  opening_hours: 'Öffnungszeiten', media: 'Bild', password: 'Passwort', session: 'Sitzung',
  admin_user: 'Benutzerkonto', backup: 'Datensicherung', wish: 'Produktwunsch',
};
const ACTION_LABELS = { create: 'erstellt', update: 'geändert', delete: 'gelöscht', reorder: 'sortiert' };
const BACKUP_DUE_DAYS = 14;

/** Nudges towards a fresh backup when the last download is old (or never happened). */
function BackupReminder({ lastBackupAt }) {
  const days = lastBackupAt ? (Date.now() - new Date(lastBackupAt).getTime()) / 86400000 : Infinity;
  if (days < BACKUP_DUE_DAYS) return null;
  return (
    <div className="hint-bar backup-reminder">
      <span>
        <Icon name="save" size={16} /> {lastBackupAt ? `Letzte Datensicherung ${formatRelative(lastBackupAt)}.` : 'Es wurde noch keine Datensicherung heruntergeladen.'} Lade
        regelmäßig eine Sicherung herunter (alle 1–2 Wochen) und bewahre sie gut auf.
      </span>
      <a className="a-btn a-btn-primary a-btn-small" href="/api/admin/backup" download>Jetzt sichern</a>
    </div>
  );
}

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

export default function Dashboard({ isDeveloper }) {
  const { data, error, loading, reload } = useApi('/admin/dashboard');

  return (
    <>
      <PageHeader
        title="Willkommen zurück"
        description="Hier siehst du auf einen Blick, was auf deiner Webseite los ist."
        actions={<a className="a-btn a-btn-ghost" href="/" target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> Webseite ansehen</a>}
      />

      <div className="quick-actions">
        <Button onClick={() => navigate('produkte/neu')}><Icon name="plus" size={16} /> Neues Produkt</Button>
        <Button onClick={() => navigate('events/neu')}><Icon name="plus" size={16} /> Neues Event</Button>
        <Button variant="ghost" onClick={() => navigate('banner')}><Icon name="megaphone" size={16} /> Banner schalten</Button>
        <Button variant="ghost" onClick={() => navigate('medien')}><Icon name="upload" size={16} /> Bilder hochladen</Button>
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : (
        <>
          {isDeveloper && <BackupReminder lastBackupAt={data.lastBackupAt} />}
          <div className="stats">
            <Stat label="Produkte" value={data.counts.products} href="#/produkte" hint={`${data.counts.categories} Kategorien`} />
            <Stat label="Aktive Produkte" value={data.counts.active_products} href="#/produkte" hint={`${data.counts.highlights} Highlights`} />
            <Stat label="Kommende Events" value={data.counts.upcoming_events} href="#/events" hint={data.counts.draft_events ? `${data.counts.draft_events} Entwürfe` : null} />
            <Stat label="Veröffentlichte Events" value={data.counts.published_events} href="#/events" />
            <Stat label="Banner live" value={data.counts.live_banners} href="#/banner" hint={`${data.counts.live_promotions} Aktionen aktiv`} />
            <Stat
              label="Neue Produktwünsche"
              value={data.counts.new_wishes}
              href="#/wuensche"
              hint={data.counts.new_wishes ? 'warten auf Freigabe' : `${data.counts.open_wishes} auf der Webseite`}
            />
            <Stat label="Bilder" value={data.counts.media} href="#/medien" />
          </div>

          <div className={`dashboard-grid ${isDeveloper ? '' : 'is-single'}`}>
            {isDeveloper && (
              <Card title="Letzte Änderungen" actions={<a className="card-link" href="#/protokoll">Alle ansehen</a>}>
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
                ) : <EmptyState icon="activity" title="Noch keine Änderungen" />}
              </Card>
            )}

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
                <EmptyState icon="calendar" title="Keine Events geplant">
                  <Button size="small" onClick={() => navigate('events/neu')}>Event anlegen</Button>
                </EmptyState>
              )}
            </Card>
          </div>

          {isDeveloper && (
            <Card
              title="Datensicherung"
              description="Eine Datei mit allen Produkten, Events, Bannern, Bildern und Benutzerkonten — kostenlos, ohne Zusatzdienst."
              className="backup-card"
              actions={<a className="a-btn a-btn-primary a-btn-small" href="/api/admin/backup" download><Icon name="download" size={15} /> Backup herunterladen</a>}
            >
              <p className="muted small">
                {data.lastBackupAt ? `Letzte Sicherung ${formatRelative(data.lastBackupAt)}.` : 'Noch keine Sicherung heruntergeladen.'} Empfehlung:
                alle 1–2 Wochen. Die Datei enthält auch die verschlüsselten Passwörter — sicher aufbewahren, nicht weitergeben.
              </p>
            </Card>
          )}
        </>
      )}
    </>
  );
}
