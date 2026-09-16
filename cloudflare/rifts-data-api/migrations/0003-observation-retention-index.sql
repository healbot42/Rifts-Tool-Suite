CREATE INDEX IF NOT EXISTS deal_observations_observed_at_jd
  ON deal_observations(julianday(observed_at));

INSERT OR IGNORE INTO schema_migrations(version, applied_at)
VALUES (3, datetime('now'));
