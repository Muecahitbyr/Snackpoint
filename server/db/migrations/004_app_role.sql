-- Least privilege for the running website: the API connects as
-- "snackpoint_app", which may only read and write rows — it can't create,
-- alter, drop or truncate tables, so even a hypothetical injection couldn't
-- destroy the schema. Migrations, seeding and restores keep using the owner
-- connection (MIGRATION_DATABASE_URL). The role is created without login;
-- `npm run db:app-role` gives it a password.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'snackpoint_app') THEN
    CREATE ROLE snackpoint_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO snackpoint_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO snackpoint_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO snackpoint_app;
REVOKE INSERT, UPDATE, DELETE ON schema_migrations FROM snackpoint_app;
-- Tables and sequences of future migrations get the same rights.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO snackpoint_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO snackpoint_app;

-- A runaway or abusive query is cut off instead of tying up the database.
ALTER ROLE snackpoint_app SET statement_timeout = '15s';
ALTER ROLE snackpoint_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE snackpoint_app CONNECTION LIMIT 20;
