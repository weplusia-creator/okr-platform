-- Add phases JSON column to proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS phases JSONB;
