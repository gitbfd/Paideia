-- Create texts table
CREATE TABLE IF NOT EXISTS public.texts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  publication_date text, -- Using text to support BC/AD format (e.g., "350 BC" or "2024 AD")
  author text,
  translator text,
  tags text[], -- Array of tags
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT texts_pkey PRIMARY KEY (id),
  CONSTRAINT texts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create text_documents table (similar to course_documents but for texts)
CREATE TABLE IF NOT EXISTS public.text_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  text_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['pdf'::text, 'txt'::text, 'html'::text, 'markdown'::text, 'other'::text])),
  storage_path text,
  bytes integer,
  mime text,
  meta jsonb DEFAULT '{}'::jsonb,
  ingest_status text NOT NULL DEFAULT 'uploaded'::text CHECK (ingest_status = ANY (ARRAY['uploaded'::text, 'chunked'::text, 'embedded'::text, 'error'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT text_documents_pkey PRIMARY KEY (id),
  CONSTRAINT text_documents_text_id_fkey FOREIGN KEY (text_id) REFERENCES public.texts(id) ON DELETE CASCADE
);

-- Create text_document_chunks table (similar to document_chunks but for texts)
CREATE TABLE IF NOT EXISTS public.text_document_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  text_id uuid NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(768),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT text_document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT text_document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.text_documents(id) ON DELETE CASCADE,
  CONSTRAINT text_document_chunks_text_id_fkey FOREIGN KEY (text_id) REFERENCES public.texts(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_texts_user_id ON public.texts(user_id);
CREATE INDEX IF NOT EXISTS idx_text_documents_text_id ON public.text_documents(text_id);
CREATE INDEX IF NOT EXISTS idx_text_document_chunks_document_id ON public.text_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_text_document_chunks_text_id ON public.text_document_chunks(text_id);

-- Enable RLS
ALTER TABLE public.texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for texts (admins can do everything, matching courses pattern)
CREATE POLICY "texts_admin_write" ON public.texts
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RLS Policies for text_documents (admins can do everything)
CREATE POLICY "text_documents_admin_write" ON public.text_documents
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RLS Policies for text_document_chunks (admins can do everything)
CREATE POLICY "text_document_chunks_admin_write" ON public.text_document_chunks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

