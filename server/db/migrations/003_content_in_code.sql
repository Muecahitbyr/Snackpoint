-- Website texts, services and reviews moved back into the code
-- (src/data/siteContent.js). The tables stay as they are (no data is
-- dropped), but their image references are released so those images can be
-- managed — or deleted — in the media library like any other.
UPDATE services SET logo_media_id = NULL WHERE logo_media_id IS NOT NULL;
UPDATE site_content SET media_id = NULL WHERE media_id IS NOT NULL;
