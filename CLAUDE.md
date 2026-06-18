# CLAUDE.md

Guidance for AI agents working in the ReserveKit repository.

## Project

ReserveKit is a full-stack event reservation / multi-tier ticketing platform:

- **`api/`** — Express + raw `pg` REST API. Layered: `routes/` → `services/` → `repositories/` → PostgreSQL/S3. Responses use the envelope in `api/helpers/response.js`.
- **`client/`** — React 19 + Vite + React Router + Tailwind SPA.
- **`db/`** — PostgreSQL migrations (`db/migrations/*.sql`) run by `db/migrate.js`; seed in `db/seed.js`.
- **`wp-plugin/`** — WordPress shortcode that embeds the reservation widget; shares the `rk_token` JWT key with the SPA.

## Commands

- `npm run dev` — API (:3000) + client (:5173) together.
- `npm test` — Jest unit + integration (needs `TEST_DATABASE_URL`). `npm run test:unit` for unit only.
- `npm run db:migrate` / `npm run db:seed` — schema + demo data.

## Conventions

- All SQL is parameterized — never interpolate user input into queries.
- Reuse `withTransaction()` (`api/config/db.js`) for multi-step writes.
- The sold-out guarantee lives in `tierRepository.decrementCapacity()` (atomic) — don't reimplement it.
- Never commit straight to `main`; branch per change.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues in `EPW80/reservekit` (use the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
