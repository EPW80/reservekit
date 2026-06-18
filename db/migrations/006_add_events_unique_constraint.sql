ALTER TABLE events ADD CONSTRAINT events_title_date_unique UNIQUE (title, date);
