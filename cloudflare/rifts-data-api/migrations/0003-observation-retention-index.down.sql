DROP INDEX IF EXISTS deal_observations_observed_at_jd;

DELETE FROM schema_migrations WHERE version = 3;
