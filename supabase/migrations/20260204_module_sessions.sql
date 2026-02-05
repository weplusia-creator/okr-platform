-- Module Sessions: each module can have multiple sessions
CREATE TABLE IF NOT EXISTS module_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES project_modules(id) ON DELETE CASCADE,
  org_id UUID NOT NULL DEFAULT get_user_org_id(),
  title TEXT NOT NULL,
  description TEXT,
  session_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  presentation_url TEXT,
  video_url TEXT,
  support_material_url TEXT,
  nps_survey_id UUID REFERENCES nps_surveys(id) ON DELETE SET NULL,
  sort_order INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE module_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON module_sessions
  FOR ALL USING (org_id = get_user_org_id());
