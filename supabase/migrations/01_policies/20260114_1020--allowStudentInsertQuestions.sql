-- Allow students to insert questions for their own assessment sessions
-- This is needed because the API route generates questions and inserts them
-- on behalf of the student when they start an assessment

-- Drop policy if it exists (idempotent)
DROP POLICY IF EXISTS "Students can insert questions for their own sessions" ON public.assessment_questions;

CREATE POLICY "Students can insert questions for their own sessions"
  ON public.assessment_questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions asess
      WHERE asess.id = assessment_questions.assessment_session_id
        AND asess.user_id = auth.uid()
    )
  );

