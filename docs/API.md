# ReserveKit API Reference

Base URL: `http://localhost:3000/api`

All responses use a consistent envelope. Authentication is a Bearer JWT obtained
from `POST /auth/login`.

## Response envelope

Success:

```json
{ "data": { "...": "..." }, "error": null }
```

Failure:

```json
{ "data": null, "error": { "code": "NOT_FOUND", "message": "Event not found" } }
```

In `development` (`NODE_ENV=development`), error bodies for unexpected failures
also include a `stack` field. In all other environments, `500` responses return
a generic message and never leak internal details.

## Error codes

The canonical code → HTTP status mapping lives in `api/middleware/error.ts`.

| Code               | HTTP | Meaning                                                 |
| ------------------ | ---- | ------------------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Request failed input validation (express-validator)     |
| `UNAUTHORIZED`     | 401  | Missing, malformed, invalid, or expired token           |
| `FORBIDDEN`        | 403  | Authenticated but lacking the required role/ownership   |
| `NOT_FOUND`        | 404  | Resource does not exist                                 |
| `CONFLICT`         | 409  | State conflict — e.g. tier sold out, already checked in |
| `RATE_LIMITED`     | 429  | Too many requests (global or login limiter)             |
| `INTERNAL`         | 500  | Unexpected server error                                 |

File-upload size/type violations surface as `VALIDATION_ERROR` (400) via multer.

## Authentication

`POST /auth/login` returns `{ "token": "<jwt>" }`. Send it on protected routes:

```
Authorization: Bearer <jwt>
```

Tokens expire after 8h. The login endpoint is rate-limited (10 attempts / 15 min
per IP); all routes share a global limiter (300 / 15 min per IP).

## Endpoints

| Method | Endpoint                     | Auth          | Notes                                                |
| ------ | ---------------------------- | ------------- | ---------------------------------------------------- |
| POST   | `/auth/login`                | —             | `{ email, password }` → `{ token }`                  |
| GET    | `/events`                    | —             | Active events; each carries a `sold_out` flag        |
| POST   | `/events`                    | Admin         | `multipart/form-data`; optional `image` file         |
| PATCH  | `/events/:id`                | Admin         | Partial update; optional `image` file                |
| DELETE | `/events/:id`                | Admin         | Soft-delete (status → `archived`)                    |
| GET    | `/events/:id/tiers`          | —             | Tiers for an event                                   |
| POST   | `/reservations`              | User          | `{ event_id, tier_id }`; 409 if the tier is sold out |
| GET    | `/reservations/:id`          | Owner / Admin | 403 if not owner and not admin                       |
| GET    | `/reservations/:id/qr`       | Owner / Admin | `{ qr_code }` (UUID)                                 |
| POST   | `/checkins`                  | Staff / Admin | `{ qr_code }`; 409 if already checked in/cancelled   |
| GET    | `/checkins/event/:eventId`   | Staff / Admin | Check-ins for an event                               |
| GET    | `/admin/events/:id/checkins` | Admin         | Check-in list for an event                           |
| GET    | `/admin/export?event_id=`    | Admin         | Attendee CSV (optional `event_id` filter)            |

## Health

`GET /health` (outside `/api`) pings the database and returns
`{ "status": "ok", "uptime": <seconds> }`, or `503 { "status": "error" }` if the
DB is unreachable. Not rate-limited; for load-balancer / orchestrator probes.
