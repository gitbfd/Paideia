-- Global assessment module templates (reusable blueprints). Course instances stay in assessment_modules.

CREATE TABLE IF NOT EXISTS public.assessment_module_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  question_type text NOT NULL DEFAULT 'short_answer' CHECK (
    question_type = ANY (ARRAY[
      'definition'::text,
      'socratic'::text,
      'multiple_choice'::text,
      'short_answer'::text
    ])
  ),
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assessment_module_templates_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.assessment_module_templates IS 'Reusable assessment configs; not attached to any course until instantiated';

ALTER TABLE public.assessment_modules
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.assessment_module_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_module_templates_created_at
  ON public.assessment_module_templates(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_modules_template_id
  ON public.assessment_modules(template_id)
  WHERE template_id IS NOT NULL;

ALTER TABLE public.assessment_module_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assessment_module_templates"
  ON public.assessment_module_templates
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
