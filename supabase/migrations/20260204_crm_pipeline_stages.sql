-- Custom pipeline stages per organization
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'gray',
  probability int NOT NULL DEFAULT 50,
  position int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, name)
);

ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own org stages" ON crm_pipeline_stages
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own org stages" ON crm_pipeline_stages
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own org stages" ON crm_pipeline_stages
  FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own org stages" ON crm_pipeline_stages
  FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));
