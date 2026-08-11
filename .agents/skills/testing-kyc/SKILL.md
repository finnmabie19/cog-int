---
name: testing-kyc
description: How to run and test the internal-tools platform (KYC Review queue, Notes) locally
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

## Devin Secrets Needed
None — everything is local dev with seeded auth.
