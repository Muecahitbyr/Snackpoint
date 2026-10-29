-- A developer can look at the admin panel as an owner account ("Als Inhaber
-- anmelden"). Such a session belongs to the owner but remembers who really
-- started it. Only adds a nullable column; existing sessions stay as they are.
ALTER TABLE admin_sessions ADD COLUMN impersonated_by uuid REFERENCES admin_users(id) ON DELETE CASCADE;
