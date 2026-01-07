-- Fix Assessment Modules RLS Policies
-- Use public.is_admin() function instead of direct app_admins query
-- This matches the pattern used by course_text_sections and other admin policies

-- ============================================
-- assessment_modules
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_modules" ON public.assessment_modules;

CREATE POLICY "Admins can manage assessment_modules"
  ON public.assessment_modules
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- assessment_sessions
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_sessions" ON public.assessment_sessions;

CREATE POLICY "Admins can manage assessment_sessions"
  ON public.assessment_sessions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- assessment_questions
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_questions" ON public.assessment_questions;

CREATE POLICY "Admins can manage assessment_questions"
  ON public.assessment_questions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- assessment_answers
-- ============================================
DROP POLICY IF EXISTS "Admins can manage assessment_answers" ON public.assessment_answers;

CREATE POLICY "Admins can manage assessment_answers"
  ON public.assessment_answers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

