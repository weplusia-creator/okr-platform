-- Audit trail for Key Result updates.
-- Every time a KR's progress changes we log who did it, the before/after
-- value, an optional free-text note, and the timestamp.

CREATE TABLE IF NOT EXISTS key_result_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name     TEXT,                         -- snapshot at write time
  previous_progress INT,                      -- 0..100, can be NULL on first write
  new_progress      INT NOT NULL,
  previous_current_value NUMERIC,
  new_current_value      NUMERIC,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kr_history_kr   ON key_result_history(key_result_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kr_history_user ON key_result_history(user_id);

-- RLS: anyone who can see the parent objective can also see its history.
ALTER TABLE key_result_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read KR history if parent visible" ON key_result_history;
CREATE POLICY "Read KR history if parent visible"
  ON key_result_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM key_results kr
        JOIN objectives o ON o.id = kr.objective_id
        JOIN users      u ON u.id = auth.uid()
       WHERE kr.id = key_result_history.key_result_id
         AND u.organization_id = o.organization_id
         AND (
           u.user_type IS DISTINCT FROM 'client'
           OR (u.user_type = 'client' AND u.client_id IS NOT NULL AND u.client_id = o.client_id)
         )
    )
  );

DROP POLICY IF EXISTS "Insert KR history for visible KRs" ON key_result_history;
CREATE POLICY "Insert KR history for visible KRs"
  ON key_result_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM key_results kr
        JOIN objectives o ON o.id = kr.objective_id
        JOIN users      u ON u.id = auth.uid()
       WHERE kr.id = key_result_history.key_result_id
         AND u.organization_id = o.organization_id
         AND (
           u.user_type IS DISTINCT FROM 'client'
           OR (u.user_type = 'client' AND u.client_id IS NOT NULL AND u.client_id = o.client_id)
         )
    )
  );
