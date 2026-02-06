-- ============================================
-- Tools: B2B Prospector
-- ============================================

-- Prospector Lists (groups of prospects)
CREATE TABLE prospector_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prospects
CREATE TABLE prospector_prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  list_id UUID REFERENCES prospector_lists(id) ON DELETE SET NULL,

  -- Company info
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_title VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  linkedin_url VARCHAR(500),
  website VARCHAR(500),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  country VARCHAR(100),
  city VARCHAR(100),

  -- Value & scoring
  estimated_value NUMERIC(12,2) DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  score_label VARCHAR(50) NOT NULL DEFAULT 'cold',
  status VARCHAR(50) NOT NULL DEFAULT 'new',

  -- Extra
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,

  -- Tracking
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prospect interactions
CREATE TABLE prospector_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospector_prospects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),

  interaction_type VARCHAR(50) NOT NULL, -- email, call, meeting, note, linkedin_message
  subject VARCHAR(500),
  body TEXT,
  outcome VARCHAR(255),
  duration_minutes INTEGER,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scoring criteria (configurable per org)
CREATE TABLE prospector_scoring_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  field_value VARCHAR(255),
  points INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI message templates
CREATE TABLE prospector_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL DEFAULT 'first_contact',
  tone VARCHAR(50) NOT NULL DEFAULT 'formal',
  subject_template TEXT,
  body_template TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_prospector_lists_org ON prospector_lists(organization_id);
CREATE INDEX idx_prospector_prospects_org ON prospector_prospects(organization_id);
CREATE INDEX idx_prospector_prospects_list ON prospector_prospects(list_id);
CREATE INDEX idx_prospector_prospects_score ON prospector_prospects(score DESC);
CREATE INDEX idx_prospector_prospects_status ON prospector_prospects(status);
CREATE INDEX idx_prospector_prospects_industry ON prospector_prospects(industry);
CREATE INDEX idx_prospector_interactions_prospect ON prospector_interactions(prospect_id);
CREATE INDEX idx_prospector_interactions_created ON prospector_interactions(created_at DESC);
CREATE INDEX idx_prospector_scoring_org ON prospector_scoring_criteria(organization_id);
CREATE INDEX idx_prospector_templates_org ON prospector_templates(organization_id);

-- ============================================
-- Updated at triggers
-- ============================================
CREATE TRIGGER set_prospector_lists_updated_at
  BEFORE UPDATE ON prospector_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_prospector_prospects_updated_at
  BEFORE UPDATE ON prospector_prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_prospector_templates_updated_at
  BEFORE UPDATE ON prospector_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE prospector_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospector_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospector_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospector_scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospector_templates ENABLE ROW LEVEL SECURITY;

-- prospector_lists
CREATE POLICY "prospector_lists_select" ON prospector_lists FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_lists_insert" ON prospector_lists FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "prospector_lists_update" ON prospector_lists FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_lists_delete" ON prospector_lists FOR DELETE USING (organization_id = get_user_org_id());

-- prospector_prospects
CREATE POLICY "prospector_prospects_select" ON prospector_prospects FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_prospects_insert" ON prospector_prospects FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "prospector_prospects_update" ON prospector_prospects FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_prospects_delete" ON prospector_prospects FOR DELETE USING (organization_id = get_user_org_id());

-- prospector_interactions
CREATE POLICY "prospector_interactions_select" ON prospector_interactions FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_interactions_insert" ON prospector_interactions FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "prospector_interactions_delete" ON prospector_interactions FOR DELETE USING (organization_id = get_user_org_id());

-- prospector_scoring_criteria
CREATE POLICY "prospector_scoring_select" ON prospector_scoring_criteria FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_scoring_insert" ON prospector_scoring_criteria FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "prospector_scoring_update" ON prospector_scoring_criteria FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_scoring_delete" ON prospector_scoring_criteria FOR DELETE USING (organization_id = get_user_org_id());

-- prospector_templates
CREATE POLICY "prospector_templates_select" ON prospector_templates FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_templates_insert" ON prospector_templates FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "prospector_templates_update" ON prospector_templates FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "prospector_templates_delete" ON prospector_templates FOR DELETE USING (organization_id = get_user_org_id());

-- ============================================
-- Default scoring criteria (inserted per org on first use via app)
-- ============================================
