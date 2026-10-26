// Public URLs of stored images. The checksum in the query string changes
// whenever an image is replaced, so the files can be cached "forever".
export function mediaUrl(id, checksum, variant = '') {
  if (!id) return null;
  const suffix = variant ? `/${variant}` : '';
  return `/api/media/${id}${suffix}?v=${(checksum ?? '').slice(0, 12)}`;
}

// Every column that points at a media row, for usage counts and the
// "still in use" check before deleting.
export const MEDIA_REFERENCES = [
  { table: 'products', column: 'image_media_id', label: 'Produkt', nameColumn: 'name' },
  { table: 'events', column: 'cover_media_id', label: 'Event', nameColumn: 'title' },
  { table: 'event_images', column: 'media_id', label: 'Event-Galerie', nameColumn: null },
  { table: 'promotions', column: 'image_media_id', label: 'Aktion', nameColumn: 'title' },
  { table: 'services', column: 'logo_media_id', label: 'Leistung', nameColumn: 'title' },
  { table: 'site_content', column: 'media_id', label: 'Webseiteninhalt', nameColumn: 'key' },
];
