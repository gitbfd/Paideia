-- RLS Policies for Assessment Modules

-- ============================================
-- assessment_modules policies
-- ============================================

-- Admins can do everything with assessment modules
CREATE POLICY "Admins can manage assessment_modules"
  ON public.assessment_modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

-- Students can read assessment modules for published courses they're enrolled in
CREATE POLICY "Students can read assessment_modules for enrolled courses"
  ON public.assessment_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      INNER JOIN public.course_enrollments ce ON ce.course_id = c.id
      WHERE c.id = assessment_modules.course_id
        AND ce.user_id = auth.uid()
        AND c.status = 'published'
    )
  );

-- ============================================
-- assessment_sessions policies
-- ============================================

-- Admins can do everything with assessment sessions
CREATE POLICY "Admins can manage assessment_sessions"
  ON public.assessment_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

-- Students can create their own assessment sessions
CREATE POLICY "Students can create assessment_sessions"
  ON public.assessment_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.assessment_modules am
      INNER JOIN public.courses c ON c.id = am.course_id
      INNER JOIN public.course_enrollments ce ON ce.course_id = c.id
      WHERE am.id = assessment_sessions.assessment_module_id
        AND ce.user_id = auth.uid()
        AND c.status = 'published'
    )
  );

-- Students can read and update their own assessment sessions
CREATE POLICY "Students can manage their own assessment_sessions"
  ON public.assessment_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- assessment_questions policies
-- ============================================

-- Admins can do everything with assessment questions
CREATE POLICY "Admins can manage assessment_questions"
  ON public.assessment_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

-- Students can read questions for their own assessment sessions
CREATE POLICY "Students can read their own assessment_questions"
  ON public.assessment_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions asess
      WHERE asess.id = assessment_questions.assessment_session_id
        AND asess.user_id = auth.uid()
    )
  );

-- ============================================
-- assessment_answers policies
-- ============================================

-- Admins can do everything with assessment answers
CREATE POLICY "Admins can manage assessment_answers"
  ON public.assessment_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

-- Students can create and update answers for their own assessment sessions
CREATE POLICY "Students can manage their own assessment_answers"
  ON public.assessment_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions asess
      WHERE asess.id = assessment_answers.assessment_session_id
        AND asess.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessment_sessions asess
      WHERE asess.id = assessment_answers.assessment_session_id
        AND asess.user_id = auth.uid()
    )
  );

