-- Two roles: 'developer' sees everything; 'owner' (the shop) only the daily
-- business (products, categories, events, banners, media, opening hours).
-- Existing accounts were created by the developer, so they become developers.
ALTER TABLE admin_users
  ADD COLUMN role text NOT NULL DEFAULT 'developer' CHECK (role IN ('developer', 'owner'));
