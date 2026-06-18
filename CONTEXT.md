# ReserveKit — Context & Ubiquitous Language

The shared vocabulary for ReserveKit. Use these terms verbatim in code, issues,
tests, and discussion. When a concept you need isn't here, that's a signal:
either you're inventing language the project doesn't use (reconsider), or there's
a real gap (resolve it with `/grill-with-docs`).

## Domain glossary

- **Event** — something people reserve tickets for (a gala, conference, showcase).
  Has a `status` of `active` or `archived`. Only `active` events are returned to
  clients. Lives in `events`; CRUD in `api/repositories/eventRepository.js`.
- **Tier** — a price level within an event (e.g. _General Admission_, _VIP_). Holds
  `price`, `capacity`, and `sold_count`. Lives in `tiers`;
  `api/repositories/tierRepository.js`.
- **Sold out** — a tier is sold out when `sold_count >= capacity`. An **event** is
  sold out when _every_ tier is sold out (computed in `eventRepository.findAll`
  and surfaced as the `sold_out` flag).
- **Reservation** — a user's claim on one ticket of one tier of one event. Carries
  a unique **QR code** and a `status` (`reserved` / `checked_in` / etc.). Lives in
  `reservations`; `api/repositories/reservationRepository.js`.
- **QR code** — the opaque UUID (`uuidv4`) printed on a reservation and scanned at
  the door. Generated in `api/services/reservationService.js`. Used as the
  check-in lookup key.
- **Check-in** — the act of admitting a reservation at the door. Recorded once per
  reservation in `checkins` and flips the reservation's status. See ADR-0002.
- **Soft delete / archive** — events are never hard-deleted; `DELETE` sets status
  to `archived` so historical data and reservations survive.
- **Role** — a user is `admin`, `staff`, or `user`. Enforced by the `auth(roles)`
  middleware (`api/middleware/auth.js`).
- **Response envelope** — every API response is `{ data, error }`. Never return a
  bare value. Built with `success()` / `error()` in `api/helpers/response.js`.

## Actors

- **User** — reserves tickets. Authenticated; owns their reservations.
- **Staff** — scans QR codes and checks people in.
- **Admin** — manages events/tiers, views check-in lists, exports CSV.

## Boundaries

- **API** (`api/`) — Express, layered routes → services → repositories → Postgres/S3.
- **Client** (`client/`) — React SPA. Stores the JWT under `rk_token`.
- **WP plugin** (`wp-plugin/`) — embeds the reservation widget via shortcode and
  shares the same `rk_token` JWT key as the SPA.

## Key invariants (see `docs/adr/`)

- A tier can never oversell — capacity is enforced atomically (ADR-0001).
- A reservation is checked in at most once, and the check-in + status flip are
  one transaction (ADR-0002).
