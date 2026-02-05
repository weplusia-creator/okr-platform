-- Link cash_flow_transactions to project_payments for reliable sync
ALTER TABLE cash_flow_transactions ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES project_payments(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cft_payment_id ON cash_flow_transactions(payment_id) WHERE payment_id IS NOT NULL;
