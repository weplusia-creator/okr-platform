-- Add client_id to objectives so OKRs can be scoped to a specific
-- client. Existing rows keep client_id = NULL (= "internal / not
-- scoped to a client") which matches today's behaviour.

ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL;

-- Index for the filter we'll do on every list view.
CREATE INDEX IF NOT EXISTS idx_objectives_client_id
  ON objectives(client_id)
  WHERE client_id IS NOT NULL;

-- RLS policy: client users (userType = 'client') can read/write
-- objectives whose client_id matches THEIR client_id.
-- Admins / consultants of the same organization still see everything.
-- We assume row-level security is already enabled on the table.

DROP POLICY IF EXISTS "Clients see only their objectives"     ON objectives;
DROP POLICY IF EXISTS "Clients insert only their objectives"  ON objectives;
DROP POLICY IF EXISTS "Clients update only their objectives"  ON objectives;
DROP POLICY IF EXISTS "Clients delete only their objectives"  ON objectives;

-- Read
CREATE POLICY "Clients see only their objectives"
  ON objectives FOR SELECT
  USING (
    -- Internal users (consultants/admins) of the same organization
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = objectives.organization_id
        AND (u.user_type IS DISTINCT FROM 'client')
    )
    OR
    -- Client users only see objectives whose client_id matches their client_id
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.user_type = 'client'
        AND u.client_id IS NOT NULL
        AND u.client_id = objectives.client_id
    )
  );

-- Insert
CREATE POLICY "Clients insert only their objectives"
  ON objectives FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = objectives.organization_id
        AND (
          (u.user_type IS DISTINCT FROM 'client')
          OR (u.user_type = 'client' AND u.client_id IS NOT NULL AND u.client_id = objectives.client_id)
        )
    )
  );

-- Update
CREATE POLICY "Clients update only their objectives"
  ON objectives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = objectives.organization_id
        AND (
          (u.user_type IS DISTINCT FROM 'client')
          OR (u.user_type = 'client' AND u.client_id = objectives.client_id)
        )
    )
  );

-- Delete (admins only — clients can soft-delete via UI if you decide later)
CREATE POLICY "Clients delete only their objectives"
  ON objectives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.organization_id = objectives.organization_id
        AND u.user_type IS DISTINCT FROM 'client'
    )
  );
