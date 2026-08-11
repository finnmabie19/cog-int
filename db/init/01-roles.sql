-- Creates the read-only database role used by the application for all reads.
--
-- The app connects with TWO roles:
--   * app          (owner, can write)  -> used ONLY inside src/lib/audit.ts,
--                                         migrations, and the seed script.
--   * app_readonly (SELECT only)       -> the `db` handle every tool imports.
--
-- Because app_readonly cannot write at the database level, "forgetting to use
-- withAudit()" is not a bug an engineer can ship: the only writable connection
-- lives inside the audit module.

CREATE ROLE app_readonly LOGIN PASSWORD 'readonly';

GRANT CONNECT ON DATABASE internal_tools TO app_readonly;
GRANT USAGE ON SCHEMA public TO app_readonly;

-- Tables are created later (by drizzle migrations, as role `app`), so grant
-- SELECT on everything `app` creates in the future.
ALTER DEFAULT PRIVILEGES FOR ROLE app IN SCHEMA public
  GRANT SELECT ON TABLES TO app_readonly;
