-- Days with other hours than the weekly plan: holidays, holiday closures,
-- shorter days. Only adds a table; nothing existing changes.
CREATE TABLE special_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  is_closed boolean NOT NULL DEFAULT true,
  open_time text CHECK (open_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  close_time text CHECK (close_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- Shown next to the date, e.g. "Heiligabend" or "Urlaub".
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (is_closed OR (open_time IS NOT NULL AND close_time IS NOT NULL AND close_time > open_time))
);
CREATE TRIGGER special_hours_updated_at BEFORE UPDATE ON special_hours FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Explicit, in case the default privileges of 004 belong to another owner.
GRANT SELECT, INSERT, UPDATE, DELETE ON special_hours TO snackpoint_app;
