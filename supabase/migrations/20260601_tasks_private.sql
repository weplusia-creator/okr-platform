-- Add optional 'is_private' field to tasks.
-- Private tasks are only visible to their responsible user (or admins of the
-- same organization). They appear in the responsible's /mi-dia and /tareas
-- but are invisible to other org members.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Drop the old blanket org_isolation policy and replace it with two:
--   1) Public tasks: everyone in the org can see/edit (legacy behavior).
--   2) Private tasks: only the responsible_id user can see/edit
--      (admins still see them because admin role bypass is org-wide).
DROP POLICY IF EXISTS "org_isolation" ON tasks;

CREATE POLICY "tasks_org_read"
  ON tasks
  FOR SELECT
  USING (
    organization_id = get_user_org_id()
    AND (
      is_private = false
      OR responsible_id = auth.uid()
    )
  );

CREATE POLICY "tasks_org_insert"
  ON tasks
  FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "tasks_org_update"
  ON tasks
  FOR UPDATE
  USING (
    organization_id = get_user_org_id()
    AND (
      is_private = false
      OR responsible_id = auth.uid()
    )
  );

CREATE POLICY "tasks_org_delete"
  ON tasks
  FOR DELETE
  USING (
    organization_id = get_user_org_id()
    AND (
      is_private = false
      OR responsible_id = auth.uid()
    )
  );
