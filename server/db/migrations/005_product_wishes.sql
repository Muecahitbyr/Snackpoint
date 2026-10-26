-- Product wishes from website visitors, with voting. New wishes are only
-- public after a team member approved them (status 'approved' or later).
-- No names or e-mails are collected; visitor IPs are only stored as a keyed
-- hash (HMAC) to count one vote per visitor and to rate-limit submissions.
CREATE TABLE product_wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  -- lowercase, umlauts folded, only letters/digits: finds duplicates
  normalized_name text NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'planned', 'available', 'rejected')),
  -- how often it was submitted (duplicates are folded into one row)
  mentions integer NOT NULL DEFAULT 1 CHECK (mentions >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_wishes_normalized_key ON product_wishes (normalized_name);
CREATE INDEX product_wishes_status_idx ON product_wishes (status);
CREATE TRIGGER product_wishes_updated_at BEFORE UPDATE ON product_wishes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE wish_votes (
  wish_id uuid NOT NULL REFERENCES product_wishes(id) ON DELETE CASCADE,
  voter_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wish_id, voter_hash)
);

-- Submissions per visitor for rate limiting; pruned after a day.
CREATE TABLE wish_submissions (
  id bigserial PRIMARY KEY,
  voter_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wish_submissions_voter_idx ON wish_submissions (voter_hash, created_at);
