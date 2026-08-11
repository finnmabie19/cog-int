# Internal Tools Platform

A foundation for building internal admin tools. Auth, permissions, audit
logging, and page structure are solved once, here — a new tool only writes
tool-specific code.

## Architecture

```
src/
  lib/
    auth.ts          Auth.js (NextAuth v5). Dev "sign in as" locally,
                     env-configured OIDC (Okta/Entra) in production.
    db/              Drizzle schema + the READ-ONLY db handle (see below).
    audit.ts         withAudit() — owns the app's only writable connection.
    permissions.ts   requirePermission() — throws PermissionError.
    registry.ts      defineTool() + access helpers.
  tools/
    index.ts         The tool registry. One entry per tool.
    notes/           The reference tool. Copy this to build a new one.
  app/
    (app)/           Authenticated shell: role-filtered sidebar, /tools/[slug].
    login/           Login page (dev user picker or SSO button).
db/
  init/              Postgres init SQL: creates the read-only role.
  migrations/        Drizzle migrations (incl. the audit append-only trigger).
scripts/seed.ts      Seeds three users and demo notes.
tests/               Two tests: audit wrapper records, permission check rejects.
```

Every session carries `{ userId, email, name, roles: string[] }`. Locally,
roles come from the seeded users; in production, from the OIDC `roles`/`groups`
claim. Switching to Okta or Entra is configuration only: set `OIDC_ISSUER`,
`OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, and unset `AUTH_DEV_LOGIN`.

## The audit guarantee and how it's enforced

Every mutation of tool data goes through `withAudit()`, which runs the
permission check, the before-state read, the mutation, the after-state read,
and the `audit_log` insert **inside one database transaction**. Either the
change and its audit row both commit, or neither does — and the recorded
before-state is exactly what the mutation saw.

Enforcement is structural, not conventional:

- The application connects to Postgres with two roles. The `db` handle every
  tool imports (`src/lib/db`) connects as `app_readonly`, a role with
  SELECT-only grants — writes through it fail **at the database level**.
- The only writable connection lives as a private, unexported constant inside
  `src/lib/audit.ts`. The only export that can touch it is `withAudit()`.
- `audit_log` itself is append-only: a database trigger rejects UPDATE and
  DELETE even on the writable connection, so history cannot be rewritten.

To be precise about what this does and doesn't claim: the privileged
credentials still exist (migrations and the seed script use them), so
bypassing the wrapper is not *impossible*. What is true is that the default
handle is read-only at the database level, so writing outside `withAudit()`
means deliberately constructing your own writable client with the privileged
connection string — a step that is loud and visible in code review, not a slip
an engineer makes by accident on tool #11.

## Known gaps

- Denied permission attempts are not logged; the audit trail only records
  changes that happened, not attempts that were rejected.
- There is no global audit viewer UI yet — audit rows are queried via SQL.
- Audit rows record app-level actor identity only; there is no session/IP
  metadata and no cryptographic tamper-evidence (e.g. hash chaining) on the log.

## Adding a new tool (three steps)

1. **Copy `src/tools/notes/`** to `src/tools/<your-tool>/`. Define its tables
   in `src/lib/db/schema.ts`, its identity/roles/actions in `definition.ts`,
   its page and queries against the read-only `db`, and its server actions as
   `withAudit()` calls. Run `npm run db:generate && npm run db:migrate`.
2. **Register it**: add one entry to the array in `src/tools/index.ts`.
3. **There is no step 3.** The sidebar entry, route, access control, and audit
   trail all derive from the definition. See CONVENTIONS.md for details.

## Setup from a clean clone

```bash
cp .env.example .env       # defaults work for local dev
npm install
docker compose up -d       # Postgres 16 + read-only role
npm run db:migrate
npm run db:seed
npm run dev                # http://localhost:3000
```

Sign in as any of the seeded users:

| User               | Roles          | Can do                                  |
| ------------------ | -------------- | --------------------------------------- |
| admin@example.com  | platform_admin | Everything                              |
| ops@example.com    | ops            | Open Notes, edit notes                  |
| viewer@example.com | viewer         | Open Notes read-only (no edit button)   |

Edit a note (a reason is required), then find the audit row:

```bash
docker compose exec postgres psql -U app_readonly -d internal_tools \
  -c "SELECT timestamp, actor_email, tool, action, entity_id, reason FROM audit_log ORDER BY timestamp DESC LIMIT 5;"
```

Tests (require the dockerized Postgres to be up and migrated):

```bash
npm test
```
