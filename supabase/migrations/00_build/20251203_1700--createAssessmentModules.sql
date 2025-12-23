-- Migration: Create Assessment Modules tables
-- This migration creates the schema for Assessment Modules (AMs) which allow
-- students to take AI-generated assessments based on course text sections

-- 1. Assessment Modules table
-- Stores the configuration for each assessment module in a course
CREATE TABLE IF NOT EXISTS public.assessment_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0, -- Position in course sequence (like course_text_sections)
  question_type text NOT NULL DEFAULT 'short_answer' CHECK (
    question_type = ANY (ARRAY[
      'definition'::text,
      'socratic'::text,
      'multiple_choice'::text,
      'short_answer'::text
    ])
  ),
  config jsonb DEFAULT '{}'::jsonb, -- Flexible config for question generation
  -- Example config:
  -- {
  --   "question_prompt": "Generate questions that test understanding...",
  --   "question_count": 5,
  --   "difficulty": "medium",
  --   "evaluation_rubric": {...},
  --   "allow_multiple_attempts": true,
  --   "time_limit_minutes": 30
  -- }
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_modules_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_modules_course_id_fkey FOREIGN KEY (course_id) 
    REFERENCES public.courses(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.assessment_modules IS 'Assessment modules placed within courses, positioned by order_index';
COMMENT ON COLUMN public.assessment_modules.order_index IS 'Position in course sequence - AMs can be placed between text sections';
COMMENT ON COLUMN public.assessment_modules.question_type IS 'Type of questions this AM will generate';
COMMENT ON COLUMN public.assessment_modules.config IS 'JSONB configuration for question generation, evaluation, and behavior';

-- Indexes for assessment_modules
CREATE INDEX IF NOT EXISTS idx_assessment_modules_course_id 
  ON public.assessment_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_assessment_modules_order_index 
  ON public.assessment_modules(course_id, order_index);

-- 2. Assessment Sessions table
-- Tracks each student's attempt at an assessment module
CREATE TABLE IF NOT EXISTS public.assessment_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_module_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (
    status = ANY (ARRAY[
      'in_progress'::text,
      'completed'::text,
      'abandoned'::text
    ])
  ),
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  score numeric(5, 2), -- Score as percentage (0-100, can have decimals)
  attempt_number integer DEFAULT 1, -- Track multiple attempts if allowed
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_sessions_assessment_module_id_fkey FOREIGN KEY (assessment_module_id) 
    REFERENCES public.assessment_modules(id) ON DELETE CASCADE,
  CONSTRAINT assessment_sessions_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT assessment_sessions_unique_user_module_attempt 
    UNIQUE (user_id, assessment_module_id, attempt_number)
);

COMMENT ON TABLE public.assessment_sessions IS 'Tracks student attempts at assessment modules';
COMMENT ON COLUMN public.assessment_sessions.status IS 'Current state of the assessment session';
COMMENT ON COLUMN public.assessment_sessions.score IS 'Final score as percentage (0-100)';
COMMENT ON COLUMN public.assessment_sessions.attempt_number IS 'Attempt number for this user/module combination';

-- Indexes for assessment_sessions
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_module_id 
  ON public.assessment_sessions(assessment_module_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_id 
  ON public.assessment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status 
  ON public.assessment_sessions(status);

-- 3. Assessment Questions table
-- Stores questions generated for each assessment session
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_session_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'short_answer' CHECK (
    question_type = ANY (ARRAY[
      'definition'::text,
      'socratic'::text,
      'multiple_choice'::text,
      'short_answer'::text
    ])
  ),
  correct_answer text, -- Reference answer or correct option ID for MC
  metadata jsonb DEFAULT '{}'::jsonb, -- For MC options, rubric, etc.
  -- Example metadata for multiple choice:
  -- {
  --   "options": [
  --     {"id": "a", "text": "Option A"},
  --     {"id": "b", "text": "Option B"},
  --     {"id": "c", "text": "Option C"},
  --     {"id": "d", "text": "Option D"}
  --   ]
  -- }
  -- Example metadata for rubric-based evaluation:
  -- {
  --   "rubric": {
  --     "definition_accuracy": 0.4,
  --     "example_provided": 0.3,
  --     "context_understanding": 0.3
  --   }
  -- }
  order_index integer DEFAULT 0, -- Order of question in the assessment
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_questions_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_questions_assessment_session_id_fkey FOREIGN KEY (assessment_session_id) 
    REFERENCES public.assessment_sessions(id) ON DELETE CASCADE
);

COMMENT ON TABLE public.assessment_questions IS 'Questions generated for each assessment session';
COMMENT ON COLUMN public.assessment_questions.correct_answer IS 'Reference answer for evaluation (or option ID for MC)';
COMMENT ON COLUMN public.assessment_questions.metadata IS 'Additional data like MC options, evaluation rubric, etc.';

-- Indexes for assessment_questions
CREATE INDEX IF NOT EXISTS idx_assessment_questions_session_id 
  ON public.assessment_questions(assessment_session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_order 
  ON public.assessment_questions(assessment_session_id, order_index);

-- 4. Assessment Answers table
-- Stores student answers to assessment questions
CREATE TABLE IF NOT EXISTS public.assessment_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assessment_question_id uuid NOT NULL,
  assessment_session_id uuid NOT NULL,
  answer_text text, -- Student's answer (or option ID for MC)
  score numeric(3, 2), -- Score for this answer (0-1, can have decimals)
  feedback text, -- AI-generated feedback for the student
  evaluated_at timestamp with time zone, -- When the answer was evaluated
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_answers_pkey PRIMARY KEY (id),
  CONSTRAINT assessment_answers_assessment_question_id_fkey FOREIGN KEY (assessment_question_id) 
    REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  CONSTRAINT assessment_answers_assessment_session_id_fkey FOREIGN KEY (assessment_session_id) 
    REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  CONSTRAINT assessment_answers_unique_question_session 
    UNIQUE (assessment_question_id, assessment_session_id)
);

COMMENT ON TABLE public.assessment_answers IS 'Student answers to assessment questions';
COMMENT ON COLUMN public.assessment_answers.answer_text IS 'Student answer text or option ID for multiple choice';
COMMENT ON COLUMN public.assessment_answers.score IS 'Score for this answer (0-1 scale)';
COMMENT ON COLUMN public.assessment_answers.feedback IS 'AI-generated feedback for the student';

-- Indexes for assessment_answers
CREATE INDEX IF NOT EXISTS idx_assessment_answers_question_id 
  ON public.assessment_answers(assessment_question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_session_id 
  ON public.assessment_answers(assessment_session_id);

-- Enable RLS on all tables
ALTER TABLE public.assessment_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;

