// Image handling: every upload is decoded, auto-rotated, resized and
// re-encoded as WebP. Re-encoding also strips EXIF metadata (GPS position of
// phone photos) and anything that isn't pixel data, so no uploaded file is
// ever served back as-is.
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { badRequest } from './errors.js';

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);
const MAX_PIXELS = 50_000_000;
const MAX_EDGE = 1600;
const THUMB_EDGE = 400;

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function readMetadata(buffer) {
  try {
    return await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw badRequest('Die Datei ist kein gültiges Bild.');
  }
}

async function makeThumb(buffer) {
  return sharp(buffer, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer();
}

/** Upload → optimized WebP + thumbnail, ready for the media table. */
export async function optimizeUpload(buffer) {
  const meta = await readMetadata(buffer);
  if (!ACCEPTED_FORMATS.has(meta.format)) {
    throw badRequest('Erlaubt sind JPG, PNG, WebP, GIF und AVIF.');
  }
  const animated = (meta.pages ?? 1) > 1;
  let output;
  try {
    output = await sharp(buffer, { animated, limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw badRequest('Das Bild konnte nicht verarbeitet werden.');
  }
  const height = animated ? output.info.pageHeight ?? output.info.height : output.info.height;
  return {
    data: output.data,
    mimeType: 'image/webp',
    width: output.info.width,
    height,
    thumb: await makeThumb(buffer),
    thumbMimeType: 'image/webp',
    checksum: sha256(output.data),
  };
}

/** Bundled site images (logo, partner logos) keep their original bytes. */
export async function prepareOriginal(buffer) {
  const meta = await readMetadata(buffer);
  const mimeType = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[meta.format];
  if (!mimeType) throw badRequest('Nicht unterstütztes Bildformat.');
  return {
    data: buffer,
    mimeType,
    width: meta.width,
    height: meta.height,
    thumb: await makeThumb(buffer),
    thumbMimeType: 'image/webp',
    checksum: sha256(buffer),
  };
}
