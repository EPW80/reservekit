-- Index foreign keys that are filtered or joined but not yet indexed.
-- (users.email, checkins.reservation_id, reservations.event_id/qr_code and
--  tiers.event_id are already covered by UNIQUE constraints or earlier indexes.)

CREATE INDEX IF NOT EXISTS events_created_by_idx       ON events (created_by);
CREATE INDEX IF NOT EXISTS reservations_user_id_idx    ON reservations (user_id);
CREATE INDEX IF NOT EXISTS reservations_tier_id_idx    ON reservations (tier_id);
CREATE INDEX IF NOT EXISTS checkins_staff_id_idx       ON checkins (staff_id);
