-- Deal notes: chronological notes attached to CRM deals
CREATE TABLE IF NOT EXISTS crm_deal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_notes_deal_id ON crm_deal_notes(deal_id);
CREATE INDEX idx_deal_notes_org_id ON crm_deal_notes(organization_id);

ALTER TABLE crm_deal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org deal notes" ON crm_deal_notes
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert own org deal notes" ON crm_deal_notes
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete own deal notes" ON crm_deal_notes
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- Allow service_role full access
CREATE POLICY "Service role full access deal notes" ON crm_deal_notes
  FOR ALL USING (auth.role() = 'service_role');
