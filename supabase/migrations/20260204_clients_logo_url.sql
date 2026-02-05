-- Add logo_url column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
