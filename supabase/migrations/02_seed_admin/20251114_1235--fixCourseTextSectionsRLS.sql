-- Fix RLS policy for course_text_sections
-- The policy was missing WITH CHECK clause and should use is_admin() function for consistency

-- Drop the old policy
DROP POLICY IF EXISTS "Admins can manage course_text_sections" ON public.course_text_sections;

-- Create new policy with both USING and WITH CHECK clauses, using is_admin() function
CREATE POLICY "Admins can manage course_text_sections"
  ON public.course_text_sections
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

