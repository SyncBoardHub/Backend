-- Run after migration-v10-milestones.sql.
-- Records affirmative acceptance of the current terms and acknowledgement of the privacy notice.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_policy_version TEXT;
