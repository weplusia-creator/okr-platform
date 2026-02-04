-- Add source column to leads to differentiate landing pages
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';
