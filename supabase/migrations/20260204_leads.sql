-- Leads table for landing page contact form
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  role text,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Allow anonymous inserts (public landing form)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only authenticated users can read leads
CREATE POLICY "Authenticated users can read leads" ON leads
  FOR SELECT
  TO authenticated
  USING (true);
