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
npm run db:migrate
npm run db:seed               # 3 demo events, one sold-out
npm run dev                   # API :3000 + client :5173
```

## Commands

```bash
npm run dev          # API + client concurrently
npm run db:migrate   # Run /db/migrations in order
npm run db:seed      # Seed demo data
npm test             # Unit + integration (needs TEST_DATABASE_URL)
npm run test:unit    # Unit tests only — no DB required
```

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

See `/docs/erd.png` for the full ERD.

## Key Behaviors

- **Tier-event validation** — reservations reject tiers that don't belong to the target event (400).
- **Atomic sold-count** — `sold_count` increments only when below capacity; returns 409 otherwise.
- **Transactional check-in** — checkin insert + reservation status update run in a single DB transaction.
- **Sold-out badge** — event list computes `sold_out` from tier capacity data (all tiers full).
- **Upload limits** — image uploads capped at 10 MB; image MIME types only.
- **CSV export** — nulls render as empty fields; double quotes are escaped.

## WordPress Plugin

```text
[reservekit event_id="1"]
```

Configure API URL in **WP Admin → Settings → ReserveKit** or `define('RESERVEKIT_API_URL', '...')`.

## Demo Mode

Seed data includes one sold-out event. Check-in dashboard has a mock QR scan button for demoing the full flow without hardware.
