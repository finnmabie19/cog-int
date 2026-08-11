# Build Log

## Task 1 — Foundation + Notes example tool
- Started: Tue Aug 11 00:09 UTC 2026 (session start; `date` was not captured at that moment)
- Finished: Tue Aug 11 00:27:26 UTC 2026
- Prompt:

> Build the foundation for an internal-tools platform (this session's scope from the project brief):
>
> Stack: Next.js 15 (App Router) + TypeScript, Postgres via Drizzle ORM, Auth.js (NextAuth v5), Tailwind + shadcn/ui, Docker Compose for local Postgres.
>
> Build four things:
> 1. AUTH — Auth.js configured so it can drop into a real Okta/Entra OIDC provider in production, but runs locally against a mock provider with no external dependency. Session carries { userId, email, name, roles: string[] }.
> 2. PERMISSIONS — A declarative system where each tool states which roles may perform which actions, plus a server-side check that throws when a user lacks permission.
> 3. AUDIT LOG — Append-only `audit_log` table (id, timestamp, actorId, actorEmail, tool, action, entityType, entityId, before jsonb, after jsonb, reason text required), exposed via a `withAudit()` wrapper that captures before/after state and writes the log row in the SAME database transaction as the change. This must be the only path to mutating tool data.
> 4. TOOL REGISTRY — A `defineTool()` function taking { name, slug, description, requiredRoles, actions }. The sidebar generates from the registry and filters by the current user's roles.
>
> Also include: a tiny exemplary "Notes" tool (list + one audited edit action), a seed script with three users (platform_admin, ops, viewer), CONVENTIONS.md with the North Star at top, README (architecture, audit guarantee and enforcement, add-a-tool-in-three-steps, clean-clone setup), and exactly two tests (audit wrapper records a mutation; permission check rejects).
>
> Mid-task amendments: read before-state and run the permission check inside the same transaction as the mutation and audit insert; README must not claim bypassing withAudit is impossible (claim the defensible read-only-handle guarantee instead); add a short unhedged "Known gaps" section (denied permission attempts not logged, etc.).

- ACU cost: TBD
- Files created/modified outside the tool's own directory: everything — this task WAS the foundation. `src/lib/` (auth, db, audit, permissions, registry, roles, session-user), `src/app/` (login, (app) shell, tools/[slug] route, auth API route), `src/components/sidebar.tsx` + shadcn/ui components, `db/` (compose init SQL, migrations incl. audit append-only trigger), `scripts/seed.ts`, `tests/`, `docker-compose.yml`, configs. The Notes tool itself is fully contained in `src/tools/notes/` plus one table in `src/lib/db/schema.ts` and one registry line in `src/tools/index.ts` — that ratio is the number to watch on later tasks.
- Reused vs. newly written: all newly written this task (nothing existed to reuse). Scaffolding (create-next-app, shadcn) generated the app shell and UI primitives; Drizzle/Auth.js/vitest wiring, the audit/permission/registry layers, and the Notes tool were hand-written.
- Friction or workarounds: (1) vitest config had to be `.mts` and needed `server.deps.inline` for next-auth plus a `next/server` → `next/server.js` alias and a `server-only` stub — ~3 iterations to get tests running; this is now solved permanently. (2) shadcn CLI flags changed recently (`-b neutral` rejected; interactive prompts in non-TTY) — minor. (3) The two-role Postgres setup (app / app_readonly with default privileges in init SQL) worked first try, as did the append-only trigger. Nothing else was awkward.
