-- SnackPoint: initial schema.
-- Every table has a UUID (or natural) primary key and created_at/updated_at.
-- Media are referenced with ON DELETE RESTRICT so an image that's still in
-- use can't be deleted by accident.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Admin & auth ─────────────────────────────────────────────────────────

CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  display_name text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_email_key ON admin_users (lower(email));

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  -- SHA-256 of the cookie token: a leaked table can't be replayed as cookies.
  token_hash text NOT NULL UNIQUE,
  csrf_token text NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX admin_sessions_user_idx ON admin_sessions (user_id);
CREATE INDEX admin_sessions_expires_idx ON admin_sessions (expires_at);

CREATE TABLE login_attempts (
  id bigserial PRIMARY KEY,
  ip text NOT NULL,
  identifier text NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_identifier_idx ON login_attempts (identifier, created_at);
CREATE INDEX login_attempts_ip_idx ON login_attempts (ip, created_at);

-- ── Media ────────────────────────────────────────────────────────────────

-- Image bytes live in the database: they survive redeploys and are covered
-- by the same backup as everything else. Uploads are re-encoded and resized
-- (see server/lib/images.js), so rows stay small.
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  mime_type text NOT NULL CHECK (mime_type IN ('image/webp', 'image/jpeg', 'image/png', 'image/gif')),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  checksum text NOT NULL,
  data bytea NOT NULL,
  thumb bytea NOT NULL,
  thumb_mime_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_created_idx ON media (created_at DESC);

-- ── Products ─────────────────────────────────────────────────────────────

-- Übergruppen (tabs on /produkte), e.g. "Snacks & Süßes".
CREATE TABLE product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  emoji text NOT NULL DEFAULT '',
  notice text NOT NULL DEFAULT '',
  age_restricted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES product_groups(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  -- Which chat-assistant topic the category belongs to (src/data/products.ts);
  -- NULL keeps its products out of the chat.
  chat_category text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_categories_name_key ON product_categories (lower(name));
CREATE INDEX product_categories_group_idx ON product_categories (group_id, sort_order);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  brand text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '',
  image_media_id uuid REFERENCES media(id) ON DELETE RESTRICT,
  price_cents integer CHECK (price_cents >= 0),
  availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'coming_soon', 'sold_out')),
  is_active boolean NOT NULL DEFAULT true,
  show_in_catalog boolean NOT NULL DEFAULT true,
  -- Highlights fill the "Frisch im Regal" section on the homepage.
  is_highlight boolean NOT NULL DEFAULT false,
  highlight_badge text NOT NULL DEFAULT '',
  highlight_order integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  allergens text NOT NULL DEFAULT '',
  additional_info text NOT NULL DEFAULT '',
  -- Chat assistant: extra search words, properties ("scharf", "kalt"),
  -- whether it answers for this product, and an optional topic override.
  search_terms text[] NOT NULL DEFAULT '{}',
  tags text[] NOT NULL DEFAULT '{}',
  in_chat boolean NOT NULL DEFAULT true,
  chat_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products (category_id, sort_order);
CREATE INDEX products_image_idx ON products (image_media_id);

-- ── Events ───────────────────────────────────────────────────────────────

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 140),
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  admission_price_cents integer CHECK (admission_price_cents >= 0),
  admission_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  cover_media_id uuid REFERENCES media(id) ON DELETE RESTRICT,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX events_starts_idx ON events (starts_at);

CREATE TABLE event_images (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, media_id)
);
CREATE INDEX event_images_media_idx ON event_images (media_id);

-- ── Banners & promotions ─────────────────────────────────────────────────

CREATE TABLE banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 200),
  link_url text NOT NULL DEFAULT '',
  link_label text NOT NULL DEFAULT '',
  variant text NOT NULL DEFAULT 'promo' CHECK (variant IN ('promo', 'info', 'dark')),
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '',
  badge text NOT NULL DEFAULT '',
  price_text text NOT NULL DEFAULT '',
  emoji text NOT NULL DEFAULT '',
  image_media_id uuid REFERENCES media(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

-- ── Homepage lists ───────────────────────────────────────────────────────

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable key used by the page (e.g. "ihle" for the chat assistant).
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '',
  logo_media_id uuid REFERENCES media(id) ON DELETE RESTRICT,
  gradient text NOT NULL DEFAULT 'red' CHECK (gradient IN ('red', 'gold', 'deep')),
  badge text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 80),
  initials text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#e0201f' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  time_label text NOT NULL DEFAULT '',
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 1000),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- weekday = JavaScript's Date#getDay() (0 = Sunday); position = display order.
CREATE TABLE opening_hours (
  weekday smallint PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  position smallint NOT NULL UNIQUE,
  day_name text NOT NULL,
  open_time text NOT NULL DEFAULT '08:00' CHECK (open_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  close_time text NOT NULL DEFAULT '20:00' CHECK (close_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Texts, settings, audit ───────────────────────────────────────────────

-- Editable texts and images of the website. The keys and their labels are
-- defined in server/lib/contentRegistry.js.
CREATE TABLE site_content (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  media_id uuid REFERENCES media(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_users', 'media', 'product_groups', 'product_categories', 'products', 'events',
    'banners', 'promotions', 'services', 'reviews', 'opening_hours', 'site_content', 'settings'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t || '_updated_at', t);
  END LOOP;
END $$;
