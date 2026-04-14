-- =============================================
-- Quiz Module: tables, indices, RLS, realtime
-- =============================================

-- 1. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  mode text NOT NULL DEFAULT 'self_paced' CHECK (mode IN ('live', 'self_paced')),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  time_limit_seconds int,                     -- global time limit (nullable = no limit)
  passing_score int DEFAULT 60,               -- percentage 0-100
  shuffle_questions boolean NOT NULL DEFAULT false,
  show_answers_after boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quizzes_org ON quizzes(organization_id);
CREATE INDEX idx_quizzes_token ON quizzes(token);
CREATE INDEX idx_quizzes_status ON quizzes(status);

-- 2. Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text text NOT NULL,
  explanation text,                            -- shown after answering
  points int NOT NULL DEFAULT 1,
  time_limit_seconds int,                      -- per-question timer (nullable = use global or no limit)
  image_url text,
  order_num int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id, order_num);

-- 3. Quiz Options (for multiple_choice and true_false)
CREATE TABLE IF NOT EXISTS quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_num int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_options_question ON quiz_options(question_id, order_num);

-- 4. Quiz Sessions (for live mode)
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'paused', 'finished')),
  current_question_index int NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_sessions_quiz ON quiz_sessions(quiz_id);

-- 5. Quiz Participants
CREATE TABLE IF NOT EXISTS quiz_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  session_id uuid REFERENCES quiz_sessions(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  email text,
  total_score int NOT NULL DEFAULT 0,
  total_correct int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_participants_quiz ON quiz_participants(quiz_id);
CREATE INDEX idx_quiz_participants_session ON quiz_participants(session_id);

-- 6. Quiz Responses
CREATE TABLE IF NOT EXISTS quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES quiz_participants(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES quiz_options(id) ON DELETE SET NULL,
  text_answer text,                            -- for short_answer questions
  is_correct boolean,
  points_earned int NOT NULL DEFAULT 0,
  response_time_ms int,                        -- how long the participant took
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(participant_id, question_id)          -- one response per question per participant
);

CREATE INDEX idx_quiz_responses_participant ON quiz_responses(participant_id);
CREATE INDEX idx_quiz_responses_question ON quiz_responses(question_id);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- Admin: full access within own organization
CREATE POLICY "quizzes_org_access" ON quizzes
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "quiz_questions_org_access" ON quiz_questions
  FOR ALL USING (quiz_id IN (
    SELECT id FROM quizzes WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "quiz_options_org_access" ON quiz_options
  FOR ALL USING (question_id IN (
    SELECT id FROM quiz_questions WHERE quiz_id IN (
      SELECT id FROM quizzes WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "quiz_sessions_org_access" ON quiz_sessions
  FOR ALL USING (quiz_id IN (
    SELECT id FROM quizzes WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "quiz_participants_org_access" ON quiz_participants
  FOR ALL USING (quiz_id IN (
    SELECT id FROM quizzes WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "quiz_responses_org_access" ON quiz_responses
  FOR ALL USING (participant_id IN (
    SELECT id FROM quiz_participants WHERE quiz_id IN (
      SELECT id FROM quizzes WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  ));

-- Public: anonymous read access to active quizzes by token
CREATE POLICY "quizzes_public_read" ON quizzes
  FOR SELECT USING (status IN ('active', 'closed'));

CREATE POLICY "quiz_questions_public_read" ON quiz_questions
  FOR SELECT USING (quiz_id IN (
    SELECT id FROM quizzes WHERE status IN ('active', 'closed')
  ));

CREATE POLICY "quiz_options_public_read" ON quiz_options
  FOR SELECT USING (question_id IN (
    SELECT id FROM quiz_questions WHERE quiz_id IN (
      SELECT id FROM quizzes WHERE status IN ('active', 'closed')
    )
  ));

CREATE POLICY "quiz_sessions_public_read" ON quiz_sessions
  FOR SELECT USING (quiz_id IN (
    SELECT id FROM quizzes WHERE status IN ('active', 'closed')
  ));

-- Public: anonymous can join (insert participant) and respond
CREATE POLICY "quiz_participants_public_insert" ON quiz_participants
  FOR INSERT WITH CHECK (quiz_id IN (
    SELECT id FROM quizzes WHERE status = 'active'
  ));

CREATE POLICY "quiz_participants_public_read" ON quiz_participants
  FOR SELECT USING (true);

CREATE POLICY "quiz_participants_public_update" ON quiz_participants
  FOR UPDATE USING (true);

CREATE POLICY "quiz_responses_public_insert" ON quiz_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "quiz_responses_public_read" ON quiz_responses
  FOR SELECT USING (true);

-- =============================================
-- Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
