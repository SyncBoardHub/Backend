-- SyncBoard production cleanup migration
-- Run after migration-v7-security.sql.

DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;

ALTER TABLE profiles DROP COLUMN IF EXISTS xp_points;
ALTER TABLE profiles DROP COLUMN IF EXISTS level;
