// Errors that are safe to show to the admin: status + a German message.
// Anything else becomes a generic 500 without internals (see app.js).
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Bitte melde dich an.') => new HttpError(401, message);
export const forbidden = (message = 'Keine Berechtigung.') => new HttpError(403, message);
export const notFound = (message = 'Nicht gefunden.') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);

/** Postgres error → HttpError where we know what went wrong, else unchanged. */
export function mapDbError(error, { inUseMessage } = {}) {
  if (error instanceof HttpError) return error;
  switch (error?.code) {
    case '23505':
      return conflict('Ein Eintrag mit diesem Namen existiert bereits.');
    case '23503':
      // Deleting something still referenced vs. referencing something missing.
      if (/still referenced/.test(error.detail ?? '')) {
        return conflict(inUseMessage ?? 'Der Eintrag wird noch verwendet und kann nicht gelöscht werden.');
      }
      return badRequest('Ein verknüpfter Eintrag (z. B. Kategorie oder Bild) existiert nicht mehr.');
    case '23514':
    case '22P02':
    case '22007':
    case '22008': // date/time out of range, e.g. year 0
    case '22009': // time zone offset out of range
    case '22003': // number out of range
      return badRequest('Ungültige Eingabe.');
    default:
      return error;
  }
}
