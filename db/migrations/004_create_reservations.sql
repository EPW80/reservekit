CREATE TABLE IF NOT EXISTS reservations (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  event_id   INTEGER NOT NULL REFERENCES events (id),
  tier_id    INTEGER NOT NULL REFERENCES tiers (id),
  status     TEXT    NOT NULL DEFAULT 'confirmed'
                     CHECK (status IN ('confirmed', 'cancelled', 'checked_in')),
  qr_code    TEXT    NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reservations_event_id_idx ON reservations (event_id);
CREATE INDEX IF NOT EXISTS reservations_qr_code_idx  ON reservations (qr_code);
