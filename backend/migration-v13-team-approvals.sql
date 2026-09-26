-- SyncBoard team membership approvals and owner controls.
-- Run after migration-v12-invitations-notifications.sql.

CREATE TABLE IF NOT EXISTS team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_join_requests_pending_unique
  ON team_join_requests(team_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_status
  ON team_join_requests(team_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_join_requests_user_status
  ON team_join_requests(user_id, status, requested_at DESC);

ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS syncboard_team_join_requests_none ON team_join_requests;
CREATE POLICY syncboard_team_join_requests_none ON team_join_requests
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
