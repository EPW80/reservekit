CREATE TABLE IF NOT EXISTS tiers (
  id         SERIAL  PRIMARY KEY,
  event_id   INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  capacity   INTEGER NOT NULL CHECK (capacity > 0),
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0)
);

CREATE INDEX IF NOT EXISTS tiers_event_id_idx ON tiers (event_id);
