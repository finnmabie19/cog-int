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

## Task 2 — KYC review queue
- Started: Tue Aug 11 00:34 UTC 2026 (session start)
- Finished: Tue Aug 11 00:54:54 UTC 2026 (code + PR; end-to-end browser testing ran after)
- Prompt:

> Read CONVENTIONS.md first: the north star at the top still applies.
>
> This session builds the KYC review queue at /tools/kyc. The real purpose is to test whether the foundation from task 1 holds up. Task 3 will be a third tool and should be nearly mechanical. This is where I find out if that's true.
>
> THE CONSTRAINT THAT MATTERS
>
> Build this using only the existing primitives — defineTool, requirePermission, withAudit, and the Notes tool's structure. Treat lib/ as frozen.
>
> If you need to change or extend anything in lib/, STOP and tell me before you do it. Don't work around it and don't quietly add to it. Either outcome is useful to me: if the foundation covers this cleanly, that's the proof I need. If it doesn't, I want to know exactly where it fell short rather than have it patched over.
>
> WHAT TO BUILD
>
> A KYC review queue. Compliance analysts work through customers whose identity documents need verifying.
>
> - Queue view: pending cases with customer name, submitted date, and two or three plausible risk signals. Oldest first.
> - Claim: a reviewer claims a case so two people don't review the same one. Claims are visible to others and releasable.
> - Case detail: the customer's submitted information. Documents can be placeholders — do not build file upload.
> - Decide: approve or reject, with a mandatory reason. Everything through withAudit.
> - Case history: render that case's audit rows in the UI in plain language — who did what, when, and why. This is the screen I'll spend the most time on in the video, so make it readable by a compliance person, not an engineer.
>
> Permissions: kyc_reviewer can claim and decide. kyc_viewer is read-only.
>
> Add kyc_reviewer to the existing ops seed user and kyc_viewer to the existing viewer seed user rather than creating new users — I want to confirm one user can hold roles across multiple tools.
>
> Seed 12-15 cases in mixed states, several already decided so the history screen has something in it. Plausible boring names.
>
> NON-GOALS
>
> No document upload, no escalation workflow, no SLA timers, no bulk actions. No changes to the Notes tool. Don't restyle anything.
>
> DONE
>
> Log in as ops, claim a case, reject it with a reason, and see that decision in the case history in readable language. Log in as viewer and confirm the claim and decide controls aren't there. Tests still pass.
>
> Build this the way you'd want tool #3 to be built — task 3 will copy it.

- ACU cost: On-demand usage $9.02
- Files created/modified outside the tool's own directory: exactly the extension points CONVENTIONS prescribes, nothing else — two roles added in `src/lib/roles.ts`, the `kyc_cases` table in `src/lib/db/schema.ts` (+ generated migration `db/migrations/0002_*`), one registry line in `src/tools/index.ts`, and seed changes in `scripts/seed.ts` (roles on existing users + 14 cases) with a new `scripts/stub-server-only.cjs` preload. No lib/ logic changed; lib/ stayed frozen. The tool itself is six files in `src/tools/kyc/`.
- Reused vs. newly written: the entire enforcement surface was reused untouched — `defineTool`, `canPerform`, `requirePermission`, `withAudit`, the read-only `db`, the route/sidebar plumbing, and every shadcn component. The Notes five-file shape mapped 1:1 (definition → page → actions → dialog). Newly written was purely tool-specific: the queue/decided tables, the case-detail dialog, claim-race handling (`UPDATE ... WHERE claimed_by IS NULL ... RETURNING` inside the withAudit transaction, throw on 0 rows to roll back), and `history.ts` mapping audit rows to plain sentences. Notably, the case-history screen needed no new infrastructure at all: it is just the tool's own `audit_log` rows read through the normal read-only handle.
- Friction or workarounds:
  1. **Claim/release require a user-typed reason, and that's wrong for this workflow.** `withAudit()` rejects empty reasons and CONVENTIONS forbids the UI inventing one, so picking up a case forces the reviewer to type a reason. A mandatory reason makes sense for decisions; for "I'm taking this case" it's pure friction — the action is its own explanation. The foundation currently has no way to say "this action is audited but self-explanatory" (e.g. an action-level flag that lets the wrapper record the action description as the reason). lib/ was treated as frozen, so the UI requires a typed reason for claim/release too. If tool #3 has any pick-up/assign-style action, this will bite again — worth a deliberate foundation decision, not a per-tool workaround.
  2. Seeding believable case history: seeds aren't supposed to write audit rows, so the seed drives its demo claims/decisions **through `withAudit()`** as the ops user — history is real audit rows, not fabricated inserts. That required stubbing the `server-only` marker (`scripts/stub-server-only.cjs`, preloaded by `db:seed`) — same trick vitest already uses. Reusable for any future tool that wants seeded history.
  3. Minor: the `/tools/[slug]` route has no sub-routes and `page` takes no props, so case detail is a dialog rather than a page of its own. Fine at this scale; a tool needing deep-linkable detail pages would be the next thing to test the registry against.
