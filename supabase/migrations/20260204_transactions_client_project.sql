-- Add optional client_id and project_id to cash_flow_transactions
ALTER TABLE cash_flow_transactions ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE cash_flow_transactions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
