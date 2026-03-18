-- Allow anonymous read access to playbook tables for public sharing
-- Only playbooks with a share_token can be read by anon users

CREATE POLICY "playbooks_anon_select" ON playbooks
  FOR SELECT TO anon
  USING (share_token IS NOT NULL);

CREATE POLICY "playbook_stages_anon_select" ON playbook_stages
  FOR SELECT TO anon
  USING (
    playbook_id IN (SELECT id FROM playbooks WHERE share_token IS NOT NULL)
  );

CREATE POLICY "playbook_steps_anon_select" ON playbook_steps
  FOR SELECT TO anon
  USING (
    stage_id IN (
      SELECT s.id FROM playbook_stages s
      JOIN playbooks p ON p.id = s.playbook_id
      WHERE p.share_token IS NOT NULL
    )
  );

CREATE POLICY "playbook_scripts_anon_select" ON playbook_scripts
  FOR SELECT TO anon
  USING (
    playbook_id IN (SELECT id FROM playbooks WHERE share_token IS NOT NULL)
  );

CREATE POLICY "playbook_questions_anon_select" ON playbook_questions
  FOR SELECT TO anon
  USING (
    playbook_id IN (SELECT id FROM playbooks WHERE share_token IS NOT NULL)
  );

CREATE POLICY "playbook_objections_anon_select" ON playbook_objections
  FOR SELECT TO anon
  USING (
    playbook_id IN (SELECT id FROM playbooks WHERE share_token IS NOT NULL)
  );

CREATE POLICY "playbook_items_anon_select" ON playbook_items
  FOR SELECT TO anon
  USING (
    playbook_id IN (SELECT id FROM playbooks WHERE share_token IS NOT NULL)
  );
