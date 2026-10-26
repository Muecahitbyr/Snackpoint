import { useMemo, useState } from 'react';
import { api, formatDateTime, useApi } from '../api';
import { navigate } from '../router';
import {
  Badge, Button, EmptyState, ErrorBox, PageHeader, SearchInput, Spinner, SwitchButton, Tabs, useAction, useConfirm,
} from '../ui';

// Same rule as the website: without an end time, an event lasts until midnight.
export function isPast(event, now = Date.now()) {
  if (event.endsAt) return new Date(event.endsAt).getTime() < now;
  const end = new Date(event.startsAt);
  end.setHours(24, 0, 0, 0);
  return end.getTime() < now;
}

export default function Events() {
  const { data, error, loading, reload, setData } = useApi('/admin/events');
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');

  const events = data?.items ?? [];
  const groups = useMemo(() => {
    const upcoming = events.filter((e) => !isPast(e)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return {
      upcoming,
      drafts: events.filter((e) => e.status === 'draft'),
      past: events.filter((e) => isPast(e)),
      all: events,
    };
  }, [events]);
  const term = search.trim().toLowerCase();
  const visible = groups[tab].filter((e) => !term || `${e.title} ${e.location} ${e.description}`.toLowerCase().includes(term));

  const replace = (item) => setData((prev) => ({ ...prev, items: prev.items.map((e) => (e.id === item.id ? item : e)) }));

  async function patch(event, changes, message) {
    const result = await run(() => api(`/admin/events/${event.id}`, { method: 'PATCH', body: changes }), message);
    if (result?.item) replace(result.item);
  }

  async function duplicate(event) {
    const body = {
      title: `${event.title} (Kopie)`, description: event.description, location: event.location, startsAt: event.startsAt,
      endsAt: event.endsAt, admissionPriceCents: event.admissionPriceCents, admissionNote: event.admissionNote,
      status: 'draft', isActive: true, isFeatured: false, coverMediaId: event.coverMediaId,
      galleryMediaIds: event.gallery.map((image) => image.id),
    };
    const result = await run(() => api('/admin/events', { method: 'POST', body }), 'Kopie als Entwurf angelegt.');
    if (result?.item) navigate(`events/${result.item.id}`);
  }

  async function remove(event) {
    const ok = await confirm({
      title: 'Event löschen?',
      message: `„${event.title}“ wird endgültig gelöscht. Wenn es nur nicht mehr angezeigt werden soll, deaktiviere es stattdessen.`,
      confirmLabel: 'Endgültig löschen',
      danger: true,
    });
    if (ok && (await run(() => api(`/admin/events/${event.id}`, { method: 'DELETE' }), 'Event gelöscht.'))) {
      setData((prev) => ({ ...prev, items: prev.items.filter((e) => e.id !== event.id) }));
    }
  }

  return (
    <>
      <PageHeader
        title="Events"
        description="Veröffentlichte, aktive Events erscheinen auf der Startseite und unter /events."
        actions={<Button onClick={() => navigate('events/neu')}>＋ Neues Event</Button>}
      />
      <div className="toolbar">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'upcoming', label: 'Kommend', count: groups.upcoming.length },
            { id: 'drafts', label: 'Entwürfe', count: groups.drafts.length },
            { id: 'past', label: 'Vergangen', count: groups.past.length },
            { id: 'all', label: 'Alle', count: groups.all.length },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Events durchsuchen…" />
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorBox error={error} onRetry={reload} /> : visible.length === 0 ? (
        <EmptyState icon="📅" title={tab === 'upcoming' ? 'Keine kommenden Events' : 'Keine Events'}>
          {tab === 'upcoming' && <Button size="small" onClick={() => navigate('events/neu')}>Event anlegen</Button>}
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Datum</th>
                <th>Status</th>
                <th>Aktiv</th>
                <th><span className="sr-only">Aktionen</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((event) => {
                const past = isPast(event);
                return (
                  <tr key={event.id} className={event.isActive ? '' : 'is-muted'}>
                    <td data-label="Event">
                      <a className="row-title" href={`#/events/${event.id}`}>
                        <span className="thumb">{event.cover ? <img src={event.cover.thumbUrl} alt="" /> : '🎉'}</span>
                        <span>
                          <strong>{event.title}</strong>
                          {event.location && <small>📍 {event.location}</small>}
                        </span>
                      </a>
                    </td>
                    <td data-label="Datum">{formatDateTime(event.startsAt)}</td>
                    <td data-label="Status">
                      <span className="badges">
                        {event.status === 'published' ? <Badge tone="success">Veröffentlicht</Badge> : <Badge tone="warning">Entwurf</Badge>}
                        {event.isFeatured && <Badge tone="accent">★ Highlight</Badge>}
                        {past && <Badge>Vorbei</Badge>}
                      </span>
                    </td>
                    <td data-label="Aktiv">
                      <SwitchButton checked={event.isActive} busy={busy} label={event.isActive ? 'Deaktivieren' : 'Aktivieren'} onChange={(isActive) => patch(event, { isActive }, isActive ? 'Event aktiviert.' : 'Event deaktiviert.')} />
                    </td>
                    <td className="actions-cell">
                      <div className="row-actions">
                        {event.status === 'draft' ? (
                          <Button size="small" onClick={() => patch(event, { status: 'published' }, 'Event veröffentlicht.')} disabled={busy}>Veröffentlichen</Button>
                        ) : (
                          <Button variant="ghost" size="small" onClick={() => patch(event, { status: 'draft' }, 'Event ist wieder ein Entwurf.')} disabled={busy}>Zurückziehen</Button>
                        )}
                        <Button variant="ghost" size="small" onClick={() => navigate(`events/${event.id}`)}>Bearbeiten</Button>
                        <Button variant="icon" size="small" onClick={() => duplicate(event)} title="Duplizieren" aria-label={`${event.title} duplizieren`}>⧉</Button>
                        <Button variant="icon" size="small" onClick={() => remove(event)} title="Löschen" aria-label={`${event.title} löschen`}>🗑</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
