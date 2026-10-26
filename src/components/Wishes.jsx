import { useCallback, useEffect, useRef, useState } from 'react';
import { useContent } from '../site/SiteProvider';
import Reveal from './Reveal';
import SplitWords from './SplitWords';
import './Wishes.css';

const VISIBLE = 8;
const STATUS = {
  planned: { label: 'Geplant', className: 'is-planned' },
  available: { label: 'Jetzt im Laden', className: 'is-available' },
};

async function send(path, method = 'GET', body) {
  const response = await fetch(`/api/public/wishes${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Das hat gerade nicht geklappt. Versuch es bitte noch einmal.');
  return data;
}

const ThumbIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7V10l4-8a3.1 3.1 0 0 1 4 3.9z" />
  </svg>
);

/** Homepage section: visitors suggest products and vote on others' wishes. */
export default function Wishes() {
  const content = useContent();
  const [items, setItems] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [trap, setTrap] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [busyVote, setBusyVote] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(() => {
    send('')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, []);

  useEffect(load, [load]);

  // Links like /?wunsch=Takis#wunschliste (from the chat or the product search) pre-fill the field.
  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('wunsch');
    if (preset) {
      setName(preset.slice(0, 80));
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setStatus({ type: 'error', message: 'Bitte gib ein Produkt ein.' });
      inputRef.current?.focus();
      return;
    }
    setStatus({ type: 'busy', message: '' });
    try {
      const data = await send('', 'POST', { name, note: noteOpen ? note : '', website: trap });
      setStatus({ type: 'success', message: data.message });
      setName('');
      setNote('');
      setNoteOpen(false);
      load();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }

  async function toggleVote(item) {
    setBusyVote(item.id);
    try {
      const data = await send(`/${item.id}/vote`, item.voted ? 'DELETE' : 'POST');
      setItems((list) => list.map((entry) => (entry.id === item.id ? { ...entry, votes: data.votes, voted: data.voted } : entry)));
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setBusyVote(null);
    }
  }

  const shown = items && (showAll ? items : items.slice(0, VISIBLE));

  return (
    <section className="wishes" id="wunschliste" aria-labelledby="wishes-title">
      <div className="wishes-inner">
        <Reveal className="wishes-intro">
          <p className="eyebrow">{content['wishes.eyebrow']}</p>
          <h2 id="wishes-title" className="section-title"><SplitWords text={content['wishes.title']} /></h2>
          <p className="lead">{content['wishes.text']}</p>

          <form className="wish-form" onSubmit={submit} noValidate>
            <label className="sr-only" htmlFor="wish-name">Welches Produkt wünschst du dir?</label>
            <div className="wish-input-row">
              <input
                id="wish-name"
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Takis Blue Heat"
                maxLength={80}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" disabled={status.type === 'busy'}>
                {status.type === 'busy' ? 'Senden…' : 'Wünschen'}
              </button>
            </div>
            {noteOpen ? (
              <>
                <label className="sr-only" htmlFor="wish-note">Hinweis zum Wunsch</label>
                <textarea
                  id="wish-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Sorte, Größe, wo du es gesehen hast … (optional)"
                  maxLength={300}
                  rows={2}
                />
              </>
            ) : (
              <button type="button" className="wish-note-toggle" onClick={() => setNoteOpen(true)}>+ Hinweis hinzufügen</button>
            )}
            {/* Honeypot for bots: hidden from people and screen readers. */}
            <input className="wish-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
            {status.message && (
              <p className={`wish-status is-${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.message}</p>
            )}
            <p className="wish-privacy">Ohne Anmeldung, ohne Namen. Neue Wünsche erscheinen nach einer kurzen Prüfung.</p>
          </form>
        </Reveal>

        <Reveal className="wishes-list-wrap" delay={0.1}>
          <h3 className="wishes-list-title">{content['wishes.listTitle']}</h3>
          {items === null ? (
            <p className="wishes-empty">Lädt…</p>
          ) : items.length === 0 ? (
            <p className="wishes-empty">{content['wishes.empty']}</p>
          ) : (
            <>
              <ol className="wishes-list">
                {shown.map((item, i) => {
                  const badge = STATUS[item.status];
                  const canVote = item.status !== 'available';
                  return (
                    <li key={item.id} className={`wish ${badge?.className ?? ''}`}>
                      <span className="wish-rank" aria-hidden="true">{i + 1}</span>
                      <span className="wish-body">
                        <strong>{item.name}</strong>
                        {badge && <span className="wish-badge">{badge.label}</span>}
                      </span>
                      {canVote ? (
                        <button
                          type="button"
                          className={`wish-vote ${item.voted ? 'is-voted' : ''}`}
                          onClick={() => toggleVote(item)}
                          disabled={busyVote === item.id}
                          aria-pressed={item.voted}
                          aria-label={`${item.voted ? 'Stimme zurücknehmen' : 'Abstimmen'} für ${item.name}, ${item.votes} Stimmen`}
                        >
                          <ThumbIcon />
                          <span>{item.votes}</span>
                        </button>
                      ) : (
                        <span className="wish-votes-static">{item.votes} Stimmen</span>
                      )}
                    </li>
                  );
                })}
              </ol>
              {items.length > VISIBLE && (
                <button type="button" className="wishes-more" onClick={() => setShowAll((all) => !all)}>
                  {showAll ? 'Weniger anzeigen' : `Alle ${items.length} Wünsche anzeigen`}
                </button>
              )}
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}
