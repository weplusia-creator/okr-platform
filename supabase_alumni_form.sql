CREATE TABLE IF NOT EXISTS alumni_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  -- Personal data
  full_name TEXT NOT NULL,
  company TEXT,
  position TEXT,
  phone TEXT,
  city TEXT,
  -- Expectations
  expectations TEXT NOT NULL,
  previous_experience TEXT,
  -- KPI
  target_kpi TEXT NOT NULL,
  target_kpi_current_value TEXT,
  target_kpi_goal_value TEXT,
  -- Meta
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE alumni_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alumni_profiles_select" ON alumni_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));
CREATE POLICY "alumni_profiles_insert" ON alumni_profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));
CREATE POLICY "alumni_profiles_update" ON alumni_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE TRIGGER set_alumni_profiles_updated_at
  BEFORE UPDATE ON alumni_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
