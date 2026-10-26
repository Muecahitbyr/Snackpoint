// Imported first by the command-line tools: they need the database owner
// (migrations, seeding, restore, role setup), while the running API uses the
// restricted app role. On Railway the owner URL is MIGRATION_DATABASE_URL;
// locally, without it, DATABASE_URL is used as before.
if (process.env.MIGRATION_DATABASE_URL) process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
