ALTER TABLE proposals ADD COLUMN IF NOT EXISTS hidden_slides JSONB DEFAULT '[]'::jsonb;
