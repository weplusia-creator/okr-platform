-- Add client logo URL to proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS client_logo_url TEXT;
