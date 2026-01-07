-- Fix Assessment Modules RLS Policies
-- Drop and recreate admin policies with WITH CHECK clauses for INSERT operations

-- ============================================
-- assessment_modules
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_modules" ON public.assessment_modules;

CREATE POLICY "Admins can manage assessment_modules"
  ON public.assessment_modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

-- ============================================
-- assessment_sessions
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_sessions" ON public.assessment_sessions;

CREATE POLICY "Admins can manage assessment_sessions"
  ON public.assessment_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

-- ============================================
-- assessment_questions
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_questions" ON public.assessment_questions;

CREATE POLICY "Admins can manage assessment_questions"
  ON public.assessment_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

-- ============================================
-- assessment_answers
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_answers" ON public.assessment_answers;

CREATE POLICY "Admins can manage assessment_answers"
  ON public.assessment_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

