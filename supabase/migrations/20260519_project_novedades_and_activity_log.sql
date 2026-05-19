-- Defensive: ensure project_novedades and project_activity_log exist.
-- Both tables are referenced by ProjectContext but were originally only in
-- supabase_projects_schema.sql (a one-shot schema dump, not a versioned
-- migration), so fresh environments may be missing them.
-- IF NOT EXISTS makes this a no-op when the tables already exist.

CREATE TABLE IF NOT EXISTS project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_project ON project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON project_activity_log(created_at DESC);

CREATE TABLE IF NOT EXISTS project_novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_novedades_project ON project_novedades(project_id);
CREATE INDEX IF NOT EXISTS idx_novedades_created ON project_novedades(created_at DESC);

-- RLS policies intentionally not touched. If the tables already exist in
-- production with RLS configured, this migration won't disturb them. If they
-- were missing and got created fresh here, RLS must be enabled separately
-- via the Supabase dashboard.
