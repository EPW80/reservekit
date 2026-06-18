CREATE TABLE IF NOT EXISTS checkins (
  id             SERIAL PRIMARY KEY,
  reservation_id INTEGER     NOT NULL UNIQUE REFERENCES reservations (id),
  staff_id       INTEGER     NOT NULL REFERENCES users (id),
  checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
