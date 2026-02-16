-- Add invoiced_by column to cash_flow_transactions
ALTER TABLE cash_flow_transactions ADD COLUMN IF NOT EXISTS invoiced_by TEXT;
