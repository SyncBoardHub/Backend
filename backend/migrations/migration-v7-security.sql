-- SyncBoard production hardening migration
-- Run after schema.sql and migrations v2 through v6.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.syncboard_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS syncboard_tasks_updated_at ON tasks;
CREATE TRIGGER syncboard_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION public.syncboard_set_updated_at();

CREATE OR REPLACE FUNCTION public.syncboard_is_team_member(target_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = target_team_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Allow all for authenticated" ON profiles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON teams;
DROP POLICY IF EXISTS "Allow all for authenticated" ON team_members;
DROP POLICY IF EXISTS "Allow all for authenticated" ON tasks;
DROP POLICY IF EXISTS "Allow all for authenticated" ON notes;
DROP POLICY IF EXISTS "Allow all for authenticated" ON files;
DROP POLICY IF EXISTS "Allow all for authenticated" ON diagrams;
DROP POLICY IF EXISTS "Allow all for authenticated" ON notifications;
DROP POLICY IF EXISTS "Allow all for authenticated" ON achievements;
DROP POLICY IF EXISTS "Allow all for authenticated" ON user_achievements;

DROP POLICY IF EXISTS syncboard_profiles_select ON profiles;
DROP POLICY IF EXISTS syncboard_profiles_update ON profiles;
DROP POLICY IF EXISTS syncboard_teams_select ON teams;
DROP POLICY IF EXISTS syncboard_teams_insert ON teams;
DROP POLICY IF EXISTS syncboard_teams_update ON teams;
DROP POLICY IF EXISTS syncboard_team_members_select ON team_members;
DROP POLICY IF EXISTS syncboard_tasks_select ON tasks;
DROP POLICY IF EXISTS syncboard_tasks_insert ON tasks;
DROP POLICY IF EXISTS syncboard_tasks_update ON tasks;
DROP POLICY IF EXISTS syncboard_tasks_delete ON tasks;
DROP POLICY IF EXISTS syncboard_notes_all ON notes;
DROP POLICY IF EXISTS syncboard_files_all ON files;
DROP POLICY IF EXISTS syncboard_diagrams_all ON diagrams;
DROP POLICY IF EXISTS syncboard_notifications_all ON notifications;
DROP POLICY IF EXISTS syncboard_achievements_select ON achievements;
DROP POLICY IF EXISTS syncboard_user_achievements_select ON user_achievements;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY syncboard_profiles_select ON profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY syncboard_profiles_update ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY syncboard_teams_select ON teams
FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.syncboard_is_team_member(id));

CREATE POLICY syncboard_teams_insert ON teams
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY syncboard_teams_update ON teams
FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY syncboard_team_members_select ON team_members
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.syncboard_is_team_member(team_id));

CREATE POLICY syncboard_tasks_select ON tasks
FOR SELECT TO authenticated
USING (public.syncboard_is_team_member(team_id));

CREATE POLICY syncboard_tasks_insert ON tasks
FOR INSERT TO authenticated
WITH CHECK (
  public.syncboard_is_team_member(team_id)
  AND (assignee_id IS NULL OR EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = tasks.team_id AND user_id = tasks.assignee_id
  ))
);

CREATE POLICY syncboard_tasks_update ON tasks
FOR UPDATE TO authenticated
USING (public.syncboard_is_team_member(team_id))
WITH CHECK (public.syncboard_is_team_member(team_id));

CREATE POLICY syncboard_tasks_delete ON tasks
FOR DELETE TO authenticated
USING (public.syncboard_is_team_member(team_id));

CREATE POLICY syncboard_notes_all ON notes
FOR ALL TO authenticated
USING (public.syncboard_is_team_member(team_id))
WITH CHECK (public.syncboard_is_team_member(team_id));

CREATE POLICY syncboard_files_all ON files
FOR ALL TO authenticated
USING (public.syncboard_is_team_member(team_id))
WITH CHECK (public.syncboard_is_team_member(team_id));

CREATE POLICY syncboard_diagrams_all ON diagrams
FOR ALL TO authenticated
USING (public.syncboard_is_team_member(team_id))
WITH CHECK (public.syncboard_is_team_member(team_id));

CREATE POLICY syncboard_notifications_all ON notifications
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY syncboard_achievements_select ON achievements
FOR SELECT TO authenticated
USING (true);

CREATE POLICY syncboard_user_achievements_select ON user_achievements
FOR SELECT TO authenticated
USING (user_id = auth.uid());
