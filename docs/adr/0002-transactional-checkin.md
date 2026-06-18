# 2. Transactional check-in

Date: 2026-06-17
Status: Accepted

## Context

Checking a reservation in at the door is two writes: insert a row into `checkins`
and flip the reservation's `status` to `checked_in`. If only one of the two
succeeds, the data is inconsistent — a reservation marked checked in with no
check-in record, or a check-in record against a reservation that still reads as
`reserved`. A reservation must also be checked in **at most once**
(`checkins.reservation_id` is `UNIQUE`).

## Decision

`checkinService.checkIn` performs both writes inside one database transaction via
the `withTransaction` helper in `api/config/db.js`:

```js
return db.withTransaction(async (client) => {
  const checkin = await checkinRepository.create({ reservation_id, staff_id }, client);
  await reservationRepository.updateStatus(reservation.id, "checked_in", client);
  return checkin;
});
```

Guard clauses before the transaction reject already-checked-in (`409 CONFLICT`,
"Already checked in"), cancelled, and unknown reservations. The repository methods
accept the transaction `client` so both writes share the same connection and
commit or roll back together.

## Consequences

- Check-in is all-or-nothing; a failure leaves no partial state.
- Double check-in is prevented both by the pre-flight status guard and by the
  `UNIQUE` constraint on `checkins.reservation_id` as a backstop.
- Any future multi-step write (e.g. cancel + release capacity) should follow this
  pattern: pass the `client` through the repositories and wrap in
  `withTransaction`. Do not perform the writes on the pool independently.
