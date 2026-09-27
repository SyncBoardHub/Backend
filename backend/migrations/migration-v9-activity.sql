-- SyncBoard activity history migration
-- Run after migration-v8-remove-gamification.sql.

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'note', 'file', 'team')),
  entity_id UUID,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_team_created
  ON activity_events(team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_events_actor
  ON activity_events(actor_id);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS syncboard_activity_events_select ON activity_events;
CREATE POLICY syncboard_activity_events_select ON activity_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = activity_events.team_id
      AND team_members.user_id = auth.uid()
  )
);
