-- Add monthly_fee column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT NULL;

-- Table for monthly payment tracking
CREATE TABLE IF NOT EXISTS project_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_project_payments" ON project_payments FOR ALL USING (true) WITH CHECK (true);
