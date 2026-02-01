-- =============================================
-- MÓDULO DE GESTIÓN DE PROYECTOS - Schema SQL
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'proposal' CHECK (status IN ('proposal', 'approved', 'in_progress', 'paused', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  owner_id UUID NOT NULL REFERENCES users(id),
  budget NUMERIC(12,2),
  estimated_cost NUMERIC(12,2),
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PROJECT_PARTICIPANTS
CREATE TABLE IF NOT EXISTS project_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'other' CHECK (role IN ('pm', 'developer', 'designer', 'analyst', 'other')),
  hourly_rate NUMERIC(10,2),
  allocated_hours NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- 3. PROJECT_DELIVERABLES
CREATE TABLE IF NOT EXISTS project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  actual_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'in_review', 'delivered', 'approved')),
  responsible_id UUID REFERENCES users(id),
  attachments TEXT[] DEFAULT '{}',
  invoice_amount NUMERIC(12,2),
  acceptance_criteria JSONB DEFAULT '[]',
  client_feedback TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PROJECT_TASKS
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES project_deliverables(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  start_date DATE,
  due_date DATE,
  estimated_hours NUMERIC(8,2),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'blocked', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  tags TEXT[] DEFAULT '{}',
  depends_on UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  subtasks JSONB DEFAULT '[]',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TASK_TIME_ENTRIES
CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  hours NUMERIC(6,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TASK_COMMENTS
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PROJECT_DOCUMENTS
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('kickoff', 'progress', 'delivery', 'closure', 'other')),
  date DATE,
  url TEXT,
  notes TEXT,
  action_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PROJECT_ACTIVITY_LOG
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

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE INDEX IF NOT EXISTS idx_participants_project ON project_participants(project_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON project_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_deliverables_project ON project_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_responsible ON project_deliverables(responsible_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deliverable ON project_tasks(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON project_tasks(status);

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON task_time_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

CREATE INDEX IF NOT EXISTS idx_documents_project ON project_documents(project_id);

CREATE INDEX IF NOT EXISTS idx_activity_project ON project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON project_activity_log(created_at DESC);

-- =============================================
-- updated_at TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_deliverables_updated_at
  BEFORE UPDATE ON project_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: get user's organization_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROJECTS: users can CRUD projects in their organization
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (organization_id = get_user_org_id());

CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (organization_id = get_user_org_id());

-- PROJECT_PARTICIPANTS: access if project belongs to user's org
CREATE POLICY "participants_select" ON project_participants FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "participants_insert" ON project_participants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "participants_update" ON project_participants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "participants_delete" ON project_participants FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

-- PROJECT_DELIVERABLES
CREATE POLICY "deliverables_select" ON project_deliverables FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "deliverables_insert" ON project_deliverables FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "deliverables_update" ON project_deliverables FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "deliverables_delete" ON project_deliverables FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

-- PROJECT_TASKS
CREATE POLICY "tasks_select" ON project_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "tasks_insert" ON project_tasks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "tasks_update" ON project_tasks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "tasks_delete" ON project_tasks FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

-- TASK_TIME_ENTRIES
CREATE POLICY "time_entries_select" ON task_time_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_id AND p.organization_id = get_user_org_id()
  ));

CREATE POLICY "time_entries_insert" ON task_time_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_id AND p.organization_id = get_user_org_id()
  ));

CREATE POLICY "time_entries_delete" ON task_time_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_id AND p.organization_id = get_user_org_id()
  ));

-- TASK_COMMENTS
CREATE POLICY "comments_select" ON task_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_id AND p.organization_id = get_user_org_id()
  ));

CREATE POLICY "comments_insert" ON task_comments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_id AND p.organization_id = get_user_org_id()
  ));

CREATE POLICY "comments_delete" ON task_comments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_id AND p.organization_id = get_user_org_id()
  ));

-- PROJECT_DOCUMENTS
CREATE POLICY "documents_select" ON project_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "documents_insert" ON project_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "documents_update" ON project_documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "documents_delete" ON project_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

-- PROJECT_ACTIVITY_LOG
CREATE POLICY "activity_select" ON project_activity_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));

CREATE POLICY "activity_insert" ON project_activity_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.organization_id = get_user_org_id()));
