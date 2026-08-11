---
name: testing-kyc
description: How to run and test the internal-tools platform (KYC Review queue, Notes, Feature Flags, Audit Log) locally
---

# Testing the cog-int internal tools platform

## Run
- `docker compose up -d` (Postgres 16; user/db from docker-compose.yml: app/app/internal_tools — NOT postgres/postgres)
- If fresh: `npm run db:migrate && npm run db:seed`
- `npm run dev` → http://localhost:3000
- `npm test` requires the dockerized Postgres to be up.

## Login
- /login shows dev buttons (AUTH_DEV_LOGIN). Users: admin@example.com (platform_admin), ops@example.com (ops + kyc_reviewer), viewer@example.com (viewer + kyc_viewer). Click a row to sign in; sign out via sidebar footer.

## KYC Review (/tools/kyc)
- Seed: 8 pending (2 claimed by Omar Ops), 4 approved, 2 rejected.
- All claim/decide controls live in the per-row "Open" dialog; buttons are disabled until the Reason field is non-empty.
- Only one seeded reviewer (ops). To test the "Claimed by X — only they can decide or release it" path, set a case's claim via SQL:
  `docker compose exec -T postgres psql -U app -d internal_tools -c "update kyc_cases set claimed_by='viewer@example.com', claimed_by_name='Vera Viewer' where ..."`
- Re-run `npm run db:seed` (or reset the volume) to restore seed data after mutating cases.

## Audit Log (/tools/audit)
- platform_admin only (admin@example.com); ops/viewer get a 404 and no sidebar entry.
- Seed writes ~21 audit rows (kyc + flags via withAudit), all timestamped "now", so date-range filters can't be exercised on seed data alone. Insert backdated rows directly (the audit_log table has an append-only trigger — INSERT is fine, UPDATE/DELETE are rejected):
  `docker compose exec -T postgres psql -U app -d internal_tools -c "insert into audit_log (timestamp, actor_id, actor_email, tool, action, entity_type, entity_id, reason) values ('2026-08-05T12:00:00Z','u-admin','admin@example.com','flags','toggle_flag','feature_flag','old-entry-test','reason here');"`
- To test CSV escaping, use reasons containing commas/quotes and one starting with `=` (formula-injection guard prefixes a `'`). Export lands in ~/Downloads/audit-log-YYYY-MM-DD.csv.
- Chrome's date inputs on this page are finicky with computer-use typing: clicking mid-input often focuses the year segment and typing a full date mangles it (e.g. "42026"). Reliable approach: click the input, press Left/Left to reach the month segment, then type MMDDYYYY digits.
- Easy way to generate a fresh audit row: /tools/flags → Open a flag → type a Reason → Turn on/off.

## Devin Secrets Needed
None — everything is local dev with seeded auth.
