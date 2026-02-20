-- Add separate GAP title/description fields (independent from central_gap table)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS gap_title TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS gap_description TEXT;
