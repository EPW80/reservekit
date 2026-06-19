# ReserveKit

Full-stack event reservation and multi-tier ticketing platform.

## Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| API      | Node.js + Express (REST, repository pattern)  |
| Frontend | React + Tailwind (Vite)                       |
| Database | PostgreSQL — raw `pg` queries, no ORM         |
| Storage  | AWS S3 (event images)                         |
| Auth     | JWT + bcrypt                                  |
| WP       | PHP shortcode plugin proxying to the Node API |

## Quick Start

```bash
npm install && npm --prefix client install
cp .env.example .env          # fill in DB, JWT, AWS creds

# Need a Postgres? Spin one up with Docker (use a free host port if 5432 is taken):
docker run -d --name reservekit-pg \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=reservekit \
  -p 5432:5432 postgres:16
# then set DATABASE_URL=postgres://postgres:postgres@localhost:5432/reservekit in .env

npm run db:migrate
npm run db:seed               # 3 demo events, one sold-out
npm run dev                   # API :3000 + client :5173
```

> The API validates its environment on startup and **refuses to boot** without a
> valid `DATABASE_URL` and a `JWT_SECRET` that is at least 32 characters and not
> the placeholder. Generate one with `openssl rand -hex 32`.

**Demo logins** (from the seed): `admin@reservekit.dev` / `admin123` ·
`staff@reservekit.dev` / `staff123` · `alice@example.com` / `user123`.

## Commands

```bash
npm run dev          # API + client concurrently
npm run db:migrate   # Run /db/migrations in order
npm run db:seed      # Seed demo data
npm test             # Unit + integration (needs TEST_DATABASE_URL)
npm run test:unit    # Unit tests only — no DB required
npm run lint         # ESLint (api/db/wp-plugin) + client ESLint
npm run format       # Prettier write across the repo
npm run format:check # Prettier check (CI gate)
```

## Configuration

| Variable                                                                       | Required    | Notes                                                            |
| ------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------- |
| `DATABASE_URL`                                                                 | yes         | Postgres connection string                                       |
| `JWT_SECRET`                                                                   | yes         | ≥ 32 chars, not the placeholder — enforced at startup            |
| `ALLOWED_ORIGINS`                                                              | no          | Comma-separated CORS allowlist (default `http://localhost:5173`) |
| `NODE_ENV`                                                                     | no          | `development` surfaces error details/stacks in responses         |
| `PORT`                                                                         | no          | API port (default `3000`)                                        |
| `AWS_REGION` / `AWS_S3_BUCKET` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | for uploads | Only needed for event-image upload to S3                         |

## API

Base: `http://localhost:3000/api`

| Method | Endpoint                     | Auth          | Description                                           |
| ------ | ---------------------------- | ------------- | ----------------------------------------------------- |
| POST   | `/auth/login`                | —             | Returns signed JWT                                    |
| GET    | `/events`                    | —             | List active events                                    |
| POST   | `/events`                    | Admin         | Create event (multipart)                              |
| PATCH  | `/events/:id`                | Admin         | Update event fields                                   |
| DELETE | `/events/:id`                | Admin         | Soft-delete → archived                                |
| GET    | `/events/:id/tiers`          | —             | Ticket tiers for an event                             |
| POST   | `/reservations`              | User          | Reserve a tier (validates capacity & event ownership) |
| GET    | `/reservations/:id`          | Owner / Admin | Reservation detail                                    |
| GET    | `/reservations/:id/qr`       | Owner / Admin | QR code payload                                       |
| POST   | `/checkins`                  | Staff / Admin | Check in via `qr_code`                                |
| GET    | `/checkins/event/:eventId`   | Staff / Admin | Check-ins for an event                                |
| GET    | `/admin/events/:id/checkins` | Admin         | Check-in list                                         |
| GET    | `/admin/export?event_id=`    | Admin         | Download attendee CSV                                 |

**Health check:** `GET /health` (outside `/api`) pings the DB and returns
`{ "status": "ok", "uptime": <seconds> }` (503 if the DB is unreachable). Not
rate-limited; intended for load-balancer / orchestrator probes.

**Response envelope:** `{ "data": ..., "error": null }` or `{ "data": null, "error": { "code", "message" } }`

**Error codes:** `VALIDATION_ERROR` (400) · `UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `CONFLICT` (409) · `INTERNAL` (500)

## Architecture

```
Routes → Services → Repositories → PostgreSQL / S3
```

| Directory           | Role                                      |
| ------------------- | ----------------------------------------- |
| `api/routes/`       | HTTP surface, validation, auth guards     |
| `api/services/`     | Business logic, transaction orchestration |
| `api/repositories/` | Raw SQL via `pg`                          |
| `api/middleware/`   | JWT auth, validation, error handling      |
| `api/config/db.js`  | Pool + `withTransaction()` helper         |
| `db/migrations/`    | Ordered `.sql` schema files               |
| `client/`           | Vite + React SPA                          |
| `wp-plugin/`        | WordPress shortcode → REST proxy          |

## Database

| Table          | Key Columns                                                                              |
| -------------- | ---------------------------------------------------------------------------------------- |
| `users`        | `id`, `email` (unique), `password_hash`, `role` (user/staff/admin)                       |
| `events`       | `id`, `title`, `date`, `location`, `image_url`, `status` (active/archived), `created_by` |
| `tiers`        | `id`, `event_id`, `name`, `price`, `capacity`, `sold_count`                              |
| `reservations` | `id`, `user_id`, `event_id`, `tier_id`, `status`, `qr_code` (UUID)                       |
| `checkins`     | `id`, `reservation_id` (unique), `staff_id`, `checked_in_at`                             |

See `db/migrations/` for the authoritative schema and `CONTEXT.md` for the
domain glossary. (A rendered ERD is planned.)

## Key Behaviors

- **Tier-event validation** — reservations reject tiers that don't belong to the target event (400).
- **Atomic sold-count** — `sold_count` increments only when below capacity; returns 409 otherwise.
- **Transactional check-in** — checkin insert + reservation status update run in a single DB transaction.
- **Sold-out badge** — event list computes `sold_out` from tier capacity data (all tiers full).
- **Upload limits** — image uploads capped at 10 MB; image MIME types only.
- **CSV export** — nulls render as empty fields, double quotes are escaped, and
  leading formula characters (`= + - @`) are neutralized to prevent CSV injection.

## Security

- **CORS allowlist** — only origins in `ALLOWED_ORIGINS` get CORS headers; others
  are blocked by the browser. Non-browser clients (no `Origin`) are unaffected.
- **Helmet** — standard hardening headers; `x-powered-by` removed.
- **Rate limiting** — a global limiter plus a stricter limiter on `POST /auth/login`
  to blunt brute force / credential stuffing.
- **Body limit** — JSON request bodies capped at 10 KB.
- **Startup validation** — the API fails fast on missing/weak `JWT_SECRET` or
  missing `DATABASE_URL`.
- **Error hygiene** — `500` responses never leak internals (e.g. SQL constraint
  text) outside `development`.

## WordPress Plugin

```text
[reservekit event_id="1"]
```

Configure API URL in **WP Admin → Settings → ReserveKit** or `define('RESERVEKIT_API_URL', '...')`.

## Demo Mode

Seed data includes one sold-out event. Check-in dashboard has a mock QR scan button for demoing the full flow without hardware.

## Tooling & Conventions

- **Lint / format** — ESLint (root config for `api/`, `db/`, `wp-plugin/`; the
  client has its own) and Prettier. Run `npm run lint` and `npm run format`.
- **Pre-commit** — Husky + lint-staged run ESLint/Prettier on staged files and the
  unit tests before each commit.
- **CI** — GitHub Actions (`.github/workflows/ci.yml`) runs lint + format check,
  the full test suite against a Postgres service, a client build, and `npm audit`.
- **Docs** — `CONTEXT.md` (domain glossary) and `docs/adr/` (architecture decision
  records) capture the language and the load-bearing decisions. `CLAUDE.md` and
  `docs/agents/` configure the repo's AI engineering skills.
- **Tests** — Jest with two projects: `unit` (no DB) and `integration` (needs a
  Postgres pointed at by `TEST_DATABASE_URL`; migrations run automatically).
- **Logging** — structured JSON logs via `pino` (+ `pino-http` request logging);
  level follows `LOG_LEVEL`/`NODE_ENV` and is silent under test.
- **Graceful shutdown** — on `SIGTERM`/`SIGINT` the server drains in-flight
  requests and closes the DB pool before exiting (10s force-exit fallback).

## Roadmap

Hardening is rolling out in phases (each lands on its own branch):

- ✅ **Phase 0 — Foundations**: ESLint/Prettier, Husky pre-commit, GitHub Actions
  CI, `CONTEXT.md` + ADRs, agent skills.
- ✅ **Phase 1 — Security**: CORS allowlist, helmet, rate limiting, startup env
  validation, CSV-injection fix, error hygiene.
- ✅ **Phase 2 — DevOps & resilience**: `/health`, graceful shutdown, structured
  logging, foreign-key indexes.
- ⬜ **Phase 3 — Client**: Vitest + React Testing Library, error boundary,
  `jwt-decode` with expiry, auth-storage hardening.
- ⬜ **Phase 4 — TypeScript**: incremental migration of API and client.
- ⬜ **Phase 5 — Dependencies & polish**: dependency updates, presigned S3 URLs,
  password strength, API error-code docs.
