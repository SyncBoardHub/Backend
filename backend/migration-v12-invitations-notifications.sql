-- SyncBoard invitation, notification, and MFA support migration.
-- Run after migration-v11-legal-compliance.sql.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS invite_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invite_regenerated_at TIMESTAMPTZ;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"assignments":true,"deadlines":true,"mentions":true,"activity":false,"emailEnabled":true}'::jsonb;

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  event_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, event_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user
  ON notification_deliveries(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_team_created
  ON notifications(team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_deadline_reminder
  ON notifications(user_id, type, task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teams_invite_enabled
  ON teams(invite_code, invite_enabled);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS syncboard_notification_deliveries_none ON notification_deliveries;
CREATE POLICY syncboard_notification_deliveries_none ON notification_deliveries
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
