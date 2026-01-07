-- Fix Assessment Modules RLS Policies
-- This migration drops and recreates the admin policies with WITH CHECK clauses
-- to allow INSERT operations

-- ============================================
-- assessment_modules policies
-- ============================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage assessment_modules" ON public.assessment_modules;

-- Recreate with WITH CHECK clause for INSERT
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
-- assessment_sessions policies
-- ============================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage assessment_sessions" ON public.assessment_sessions;

-- Recreate with WITH CHECK clause for INSERT
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
-- assessment_questions policies
-- ============================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage assessment_questions" ON public.assessment_questions;

-- Recreate with WITH CHECK clause for INSERT
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
-- assessment_answers policies
-- ============================================

-- Drop existing admin policy if it exists
DROP POLICY IF EXISTS "Admins can manage assessment_answers" ON public.assessment_answers;

-- Recreate with WITH CHECK clause for INSERT
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

