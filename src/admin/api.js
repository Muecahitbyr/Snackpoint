// Fetch wrapper for the admin API: sends the session's CSRF token on every
// change, turns error responses into ApiError with a German message and
// per-field details, and reports an expired session.
import { useCallback, useEffect, useRef, useState } from 'react';

let csrfToken = '';
let onUnauthorized = () => {};

export function setCsrfToken(token) {
  csrfToken = token ?? '';
}

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || 'Unbekannter Fehler.');
    this.status = status;
    this.fields = body?.fields ?? {};
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, { error: 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.' });
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

/** GET with loading/error state; `reload()` fetches again. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const current = useRef(path);
  current.current = path;

  const reload = useCallback(async () => {
    if (!path) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await api(path);
      if (current.current === path) setState({ data, error: null, loading: false });
    } catch (error) {
      if (current.current === path) setState({ data: null, error, loading: false });
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback((update) => {
    setState((prev) => ({ ...prev, data: typeof update === 'function' ? update(prev.data) : update }));
  }, []);

  return { ...state, reload, setData };
}

// ── Money & dates for form fields ─────────────────────────────────────────

/** "1,50" / "1.5" / "2" → 150; "" → null; invalid → NaN. */
export function parseEuro(text) {
  const value = String(text ?? '').trim().replace('€', '').trim();
  if (!value) return null;
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(value)) return Number.NaN;
  return Math.round(Number(value.replace(',', '.')) * 100);
}

export function formatEuroInput(cents) {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

const EURO = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const formatEuro = (cents) => (cents === null || cents === undefined ? '–' : EURO.format(cents / 100));

/** ISO → "YYYY-MM-DDTHH:MM" in the browser's time zone (DateTimeField's format). */
export function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

const DATE_TIME = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
export const formatDateTime = (iso) => (iso ? DATE_TIME.format(new Date(iso)) : '–');

const RELATIVE = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });
export function formatRelative(iso) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return 'gerade eben';
}

// ── Image upload ──────────────────────────────────────────────────────────

const MAX_EDGE = 2400;

/** Phone photos can be larger than the upload limit: scale them down in the
 * browser first (the server optimizes again). GIFs stay untouched. */
export async function prepareImage(file, maxBytes) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  let image;
  const url = URL.createObjectURL(file);
  try {
    image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } catch {
    return file; // the browser can't read it — let the server decide
  } finally {
    URL.revokeObjectURL(url);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (scale === 1 && file.size <= maxBytes * 0.9 && supported) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  const toBlob = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob('image/webp', 0.88);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : blob.type === 'image/png' ? '.png' : '.jpg');
  return new File([blob], name, { type: blob.type });
}

export async function uploadImage(file, { maxBytes = 4 * 1024 * 1024, replaceId } = {}) {
  const prepared = await prepareImage(file, maxBytes);
  if (prepared.size > maxBytes) {
    throw new ApiError(413, { error: `„${file.name}“ ist zu groß (max. ${Math.round(maxBytes / 1024 / 1024)} MB).` });
  }
  const form = new FormData();
  form.append('file', prepared);
  return api(replaceId ? `/admin/media/${replaceId}/file` : '/admin/media', { method: replaceId ? 'PUT' : 'POST', form });
}
