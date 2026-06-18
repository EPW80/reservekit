# 1. Atomic tier capacity decrement

Date: 2026-06-17
Status: Accepted

## Context

Multiple users can attempt to reserve the last ticket of a **tier** at the same
time. A naive "read `sold_count`, compare to `capacity`, then write `sold_count + 1`"
sequence has a race window: two concurrent requests both read a non-full count and
both write, overselling the tier. Overselling is unacceptable — it breaks the core
promise of the product.

## Decision

Capacity is enforced in a single atomic SQL statement, not in application code.
`tierRepository.decrementCapacity` issues:

```sql
UPDATE tiers SET sold_count = sold_count + 1
WHERE id = $1 AND sold_count < capacity
RETURNING *;
```

The `sold_count < capacity` predicate and the increment happen in one row-locked
write. If no row comes back, the tier was already full and we throw
`{ status: 409, code: "CONFLICT", message: "Tier is sold out" }`.

## Consequences

- No oversell is possible regardless of concurrency, without explicit locks or a
  serializable transaction.
- The sold-out condition is expressed as a 409 `CONFLICT` — callers must handle it
  (the client and the WP plugin both surface a "sold out" message).
- Any new write path that consumes tier capacity **must** go through
  `decrementCapacity` rather than reading then writing. Do not reimplement the
  check in JavaScript.
- The reciprocal (releasing capacity on cancellation) is not yet modelled; revisit
  this ADR if/when cancellations need to return inventory.
