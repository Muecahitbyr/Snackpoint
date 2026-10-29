// Calendar and time pickers for the admin panel, replacing the browsers'
// native date/time inputs (inconsistent, partly English, AM/PM). Values use
// the same formats as before: "YYYY-MM-DDTHH:MM" (local time) and "HH:MM".
// On phones the picker opens as a bottom sheet.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Field } from './ui';
import { Icon } from './icons';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const LABEL = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const pad = (n) => String(n).padStart(2, '0');

const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const splitValue = (value) => (value ? { date: value.slice(0, 10), time: value.slice(11, 16) } : { date: '', time: '' });

/** 6 weeks starting on the Monday on or before the 1st of the month. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function useIsPhone() {
  const query = '(max-width: 600px)';
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setPhone(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);
  return phone;
}

/** Popover anchored to the trigger (desktop) or bottom sheet (phone). */
function Popover({ anchorRef, onClose, children, label }) {
  const phone = useIsPhone();
  const ref = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (phone) return;
    const place = () => {
      const anchor = anchorRef.current.getBoundingClientRect();
      const height = ref.current?.offsetHeight ?? 420;
      const width = ref.current?.offsetWidth ?? 320;
      const below = anchor.bottom + 8 + height <= window.innerHeight;
      setPosition({
        top: below ? anchor.bottom + 8 : Math.max(8, anchor.top - height - 8),
        left: Math.min(Math.max(8, anchor.left), window.innerWidth - width - 8),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [phone, anchorRef]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e) => {
      if (!ref.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose, anchorRef]);

  return (
    <>
      {phone && <div className="picker-backdrop" aria-hidden="true" />}
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        className={`picker ${phone ? 'picker-sheet' : ''}`}
        style={phone ? undefined : { top: position?.top ?? -9999, left: position?.left ?? -9999 }}
      >
        {phone && <div className="picker-grip" aria-hidden="true" />}
        {children}
      </div>
    </>
  );
}

/** Hour and minute columns; minutes in 5-minute steps (plus the current value). */
function TimeColumns({ value, onChange }) {
  const [hour, minute] = (value || '12:00').split(':');
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5));
  if (!minutes.includes(minute)) minutes.push(minute);
  minutes.sort();
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);

  useLayoutEffect(() => {
    for (const list of [hoursRef.current, minutesRef.current]) {
      const active = list?.querySelector('.is-selected');
      if (active) list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.offsetHeight / 2;
    }
  }, []);

  return (
    <div className="picker-time">
      <div className="picker-time-col" ref={hoursRef} role="listbox" aria-label="Stunde">
        {Array.from({ length: 24 }, (_, h) => pad(h)).map((h) => (
          <button key={h} type="button" role="option" aria-selected={h === hour} className={h === hour ? 'is-selected' : ''} onClick={() => onChange(`${h}:${minute}`)}>
            {h}
          </button>
        ))}
      </div>
      <span className="picker-time-colon" aria-hidden="true">:</span>
      <div className="picker-time-col" ref={minutesRef} role="listbox" aria-label="Minute">
        {minutes.map((m) => (
          <button key={m} type="button" role="option" aria-selected={m === minute} className={m === minute ? 'is-selected' : ''} onClick={() => onChange(`${hour}:${m}`)}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Month calendar. `selected`: one "YYYY-MM-DD" key, or a Set of keys for
 * picking several days; `marked`: optional Set of keys shown with a ring
 * (e.g. days that already have an entry). `autoFocus`: focus the day when it
 * appears (in a popover); on a page the focus stays where it is until used.
 */
export function Calendar({ selected, min, onPick, marked, autoFocus = true }) {
  const several = selected instanceof Set;
  const isSelected = (key) => (several ? selected.has(key) : key === selected);
  const first = several ? [...selected].sort()[0] : selected;
  const initial = first ? parseKey(first) : min ? parseKey(min) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [focus, setFocus] = useState(first || (min && min > toKey(new Date()) ? min : toKey(new Date())));
  const gridRef = useRef(null);
  const focused = useRef(autoFocus);
  const today = toKey(new Date());
  const days = monthGrid(view.year, view.month);

  const shiftMonth = (delta) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  function moveFocus(deltaDays) {
    const next = parseKey(focus);
    next.setDate(next.getDate() + deltaDays);
    setFocus(toKey(next));
    if (next.getMonth() !== view.month || next.getFullYear() !== view.year) setView({ year: next.getFullYear(), month: next.getMonth() });
  }

  function onKeyDown(e) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (moves[e.key]) {
      e.preventDefault();
      moveFocus(moves[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!min || focus >= min) onPick(focus);
    }
  }

  useEffect(() => {
    if (!focused.current) {
      focused.current = true;
      return;
    }
    gridRef.current?.querySelector(`[data-day="${focus}"]`)?.focus({ preventScroll: true });
  }, [focus]);

  return (
    <div className="picker-calendar">
      <div className="picker-head">
        <button type="button" className="picker-nav" onClick={() => shiftMonth(-1)} aria-label="Vorheriger Monat">‹</button>
        <strong>{MONTH.format(new Date(view.year, view.month, 1))}</strong>
        <button type="button" className="picker-nav" onClick={() => shiftMonth(1)} aria-label="Nächster Monat">›</button>
      </div>
      <div className="picker-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="picker-days" role="grid" ref={gridRef} onKeyDown={onKeyDown}>
        {days.map((date) => {
          const key = toKey(date);
          const disabled = Boolean(min && key < min);
          const classes = [
            'picker-day',
            date.getMonth() !== view.month && 'is-outside',
            key === today && 'is-today',
            isSelected(key) && 'is-selected',
            marked?.has(key) && 'is-marked',
            (date.getDay() === 0 || date.getDay() === 6) && 'is-weekend',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={key}
              type="button"
              data-day={key}
              className={classes}
              disabled={disabled}
              tabIndex={key === focus ? 0 : -1}
              aria-pressed={isSelected(key)}
              aria-label={LABEL.format(date)}
              onClick={() => onPick(key)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8.5" cy="14.5" r="1.2" fill="currentColor" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * Date + time field. `value`/`onChange` use "YYYY-MM-DDTHH:MM" or "".
 * `min` (same format) disables earlier days; `defaultTime` is used when a
 * day is picked while no time is set yet.
 */
export function DateTimeField({ label, hint, error, required, value, onChange, min, defaultTime = '12:00', placeholder = 'Datum & Uhrzeit wählen' }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  const id = useId();
  const { date, time } = splitValue(value);
  const minDate = min ? min.slice(0, 10) : undefined;
  const display = date ? `${SHORT.format(parseKey(date))} · ${time} Uhr` : '';

  const pickDay = (key) => onChange(`${key}T${time || defaultTime}`);
  const pickTime = (t) => onChange(`${date || toKey(new Date())}T${t}`);

  function shortcut(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    pickDay(toKey(d));
  }

  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div className="picker-field">
        <button
          ref={anchorRef}
          id={id}
          type="button"
          className={`picker-trigger ${open ? 'is-open' : ''} ${display ? '' : 'is-empty'}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarIcon />
          <span>{display || placeholder}</span>
        </button>
        {value && !required && (
          <button type="button" className="picker-clear" onClick={() => onChange('')} aria-label={`${label} leeren`}><Icon name="close" size={13} /></button>
        )}
      </div>
      {open && (
        <Popover anchorRef={anchorRef} onClose={() => setOpen(false)} label={label}>
          <div className="picker-body">
            <Calendar selected={date} min={minDate} onPick={pickDay} />
            <div className="picker-side">
              <span className="picker-side-label">Uhrzeit</span>
              <TimeColumns value={time || defaultTime} onChange={pickTime} />
            </div>
          </div>
          <div className="picker-foot">
            <div className="picker-shortcuts">
              <button type="button" onClick={() => shortcut(0)}>Heute</button>
              <button type="button" onClick={() => shortcut(1)}>Morgen</button>
              {!required && value && <button type="button" onClick={() => onChange('')}>Leeren</button>}
            </div>
            <button type="button" className="a-btn a-btn-primary a-btn-small" onClick={() => setOpen(false)}>Fertig</button>
          </div>
        </Popover>
      )}
    </Field>
  );
}

/** Time-only field ("HH:MM"), e.g. opening hours. */
export function TimeField({ value, onChange, disabled, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`picker-trigger picker-trigger-time ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={`${ariaLabel}: ${value} Uhr`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ClockIcon />
        <span>{value}</span>
      </button>
      {open && (
        <Popover anchorRef={anchorRef} onClose={() => setOpen(false)} label={ariaLabel}>
          <div className="picker-time-only">
            <span className="picker-side-label">{ariaLabel}</span>
            <TimeColumns value={value} onChange={onChange} />
          </div>
          <div className="picker-foot picker-foot-end">
            <button type="button" className="a-btn a-btn-primary a-btn-small" onClick={() => setOpen(false)}>Fertig</button>
          </div>
        </Popover>
      )}
    </>
  );
}
