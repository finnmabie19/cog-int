# Conventions

## The North Star

By the end of this project, a VP of Engineering should believe their team
could build AND MAINTAIN 13 internal tools without Power Apps.

The thing that convinces them is NOT how the tools look. It's that the second
tool took a fraction of the effort of the first — because this foundation
absorbed all the work that would otherwise be repeated 13 times. Auth,
permissions, audit logging, and page structure should already be solved by the
time anyone writes a line of tool-specific code.

Everything built here serves that. The foundation is the part that makes tools
#2 through #13 cheap.

Design principles, in priority order:

- Optimize for the seam, not the surface. A plain-looking tool built on a
  clean foundation beats a polished tool with logic hardcoded into it.
- Make the safe path the only path. Anything an engineer could get wrong on
  tool #11 should be impossible rather than documented.
- Write for the engineer who arrives in six months, not for today.
- Boring and conventional beats clever.

## Adding a tool (you are probably building tool #4 — copy Notes)

`src/tools/notes/` is the reference implementation. It is deliberately small
and exemplary; every tool has the same five files:

```
src/tools/<slug>/
  index.ts              Re-exports the definition.
  definition.ts         defineTool({ name, slug, description, requiredRoles, actions, page })
  <slug>-page.tsx       Server component. Reads via the read-only `db`.
  actions.ts            "use server" actions. Every mutation is a withAudit() call.
  *-dialog.tsx / etc.   Client components for interaction.
```

Steps:

1. **Tables** — add your tool's tables to `src/lib/db/schema.ts`, then
   `npm run db:generate && npm run db:migrate`.
2. **Definition** — declare the tool's identity and its entire permission
   model in `definition.ts`. Roles live ONLY here. If you find yourself
   writing a role name anywhere else in your tool, stop — derive it from the
   definition with `canPerform()` instead.
3. **Page** — a server component. Get the user with `requireUser()`, read with
   the read-only `db`, and derive UI visibility (buttons, columns) from
   `canPerform(user, tool, action)`.
4. **Actions** — every mutation is one `withAudit()` call:
   `requireUser()` → `withAudit({ user, tool, action, entityType, entityId,
   reason, before, mutate, after })` → `revalidatePath()`. The permission
   check, before/after reads, mutation, and audit insert all run in one
   transaction — you don't order them yourself.
5. **Register** — add the tool to `src/tools/index.ts`. Sidebar, route, and
   access control follow automatically.

## Rules that keep the foundation sound

- **Never create a database connection in application code.** The read-only
  `db` in `src/lib/db` and the private writable connection inside
  `src/lib/audit.ts` are the only two. If your code needs to write, it needs
  `withAudit()`. (Writes through `db` fail at the database level — if you hit
  `permission denied for table ...`, you're on the read handle by design.)
- **Every mutating action takes a `reason` from the user.** The wrapper
  rejects empty reasons; your UI should require the field rather than
  inventing a reason on the user's behalf.
- **Role names live in `src/lib/roles.ts` and tool definitions only.** Adding
  a role is a one-line change there; the `Role` union keeps definitions
  honest at compile time.
- **Permission checks belong to the foundation, not your components.** Don't
  scatter `user.roles.includes(...)` through your tool. `canAccessTool` /
  `canPerform` for visibility, `withAudit` (which calls `requirePermission`)
  for enforcement.
- **Migrations and seeds are infrastructure**, not application code — they use
  the privileged connection directly and do not write audit rows. Nothing
  else should.
- Keep tools self-contained under `src/tools/<slug>/`. A tool touching another
  tool's tables or files is a smell; shared needs belong in `src/lib`.
