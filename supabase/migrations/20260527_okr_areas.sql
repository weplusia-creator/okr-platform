-- Áreas / Categorías para OKRs. Cada cliente puede tener sus propias áreas
-- (Ventas, Producción, RRHH, etc.) y se le asigna una a cada Objective.
--
-- Una área puede:
--   - pertenecer a un client_id específico → solo ese cliente la ve
--   - tener client_id NULL → es global de la organización (sirve para
--     OKRs internos sin cliente asignado)

CREATE TABLE IF NOT EXISTS okr_areas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#10b981',
  sort_order      INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okr_areas_org    ON okr_areas(organization_id);
CREATE INDEX IF NOT EXISTS idx_okr_areas_client ON okr_areas(client_id);

-- Add area_id to objectives.
ALTER TABLE objectives
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES okr_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_objectives_area_id ON objectives(area_id);

-- RLS — same visibility model as objectives.
ALTER TABLE okr_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read OKR areas of my org/client" ON okr_areas;
DROP POLICY IF EXISTS "Insert OKR areas in my org/client" ON okr_areas;
DROP POLICY IF EXISTS "Update OKR areas in my org/client" ON okr_areas;
DROP POLICY IF EXISTS "Delete OKR areas in my org/client" ON okr_areas;

CREATE POLICY "Read OKR areas of my org/client"
  ON okr_areas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
       WHERE u.id = auth.uid()
         AND u.organization_id = okr_areas.organization_id
         AND (
           u.user_type IS DISTINCT FROM 'client'
           OR (u.user_type = 'client' AND u.client_id IS NOT NULL AND u.client_id = okr_areas.client_id)
         )
    )
  );

CREATE POLICY "Insert OKR areas in my org/client"
  ON okr_areas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
       WHERE u.id = auth.uid()
         AND u.organization_id = okr_areas.organization_id
         AND (
           u.user_type IS DISTINCT FROM 'client'
           OR (u.user_type = 'client' AND u.client_id = okr_areas.client_id)
         )
    )
  );

CREATE POLICY "Update OKR areas in my org/client"
  ON okr_areas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
       WHERE u.id = auth.uid()
         AND u.organization_id = okr_areas.organization_id
         AND (
           u.user_type IS DISTINCT FROM 'client'
           OR (u.user_type = 'client' AND u.client_id = okr_areas.client_id)
         )
    )
  );

CREATE POLICY "Delete OKR areas in my org/client"
  ON okr_areas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
       WHERE u.id = auth.uid()
         AND u.organization_id = okr_areas.organization_id
         AND u.user_type IS DISTINCT FROM 'client'
    )
  );
