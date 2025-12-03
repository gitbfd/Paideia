-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_admins (
  user_id uuid NOT NULL,
  CONSTRAINT app_admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT app_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.course_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type = ANY (ARRAY['pdf'::text, 'txt'::text, 'html'::text, 'markdown'::text, 'other'::text])),
  storage_path text,
  bytes integer,
  mime text,
  meta jsonb DEFAULT '{}'::jsonb,
  ingest_status text NOT NULL DEFAULT 'uploaded'::text CHECK (ingest_status = ANY (ARRAY['uploaded'::text, 'chunked'::text, 'embedded'::text, 'error'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_documents_pkey PRIMARY KEY (id),
  CONSTRAINT course_documents_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_enrollments (
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'instructor'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (user_id, course_id),
  CONSTRAINT course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  body text DEFAULT ''::text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_lessons_pkey PRIMARY KEY (id),
  CONSTRAINT course_lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.course_text_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  text_document_id uuid NOT NULL,
  start_line integer CHECK (start_line IS NULL OR start_line > 0),
  end_line integer,
  title text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  start_char integer,
  end_char integer,
  CONSTRAINT course_text_sections_pkey PRIMARY KEY (id),
  CONSTRAINT course_text_sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT course_text_sections_text_document_id_fkey FOREIGN KEY (text_document_id) REFERENCES public.text_documents(id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  slug text NOT NULL,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])),
  published_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.document_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  course_id uuid NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.course_documents(id),
  CONSTRAINT document_chunks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text UNIQUE,
  role text NOT NULL DEFAULT 'student'::text,
  created_at timestamp with time zone DEFAULT now(),
  first_name text DEFAULT 'First'::text,
  last_name text DEFAULT 'Last'::text,
  street text DEFAULT 'Street Address'::text,
  city text DEFAULT 'City'::text,
  state text DEFAULT 'State'::text,
  phone text DEFAULT '555-555-5555'::text,
  about_me text DEFAULT 'Tell us about yourself...'::text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.text_document_chunks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  text_id uuid NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT now(),
  start_char integer,
  end_char integer,
  CONSTRAINT text_document_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT text_document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.text_documents(id),
  CONSTRAINT text_document_chunks_text_id_fkey FOREIGN KEY (text_id) REFERENCES public.texts(id)
);
CREATE TABLE public.text_documents (
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
  conversion_content text,
  display_content text,
  rag_text text,
  CONSTRAINT text_documents_pkey PRIMARY KEY (id),
  CONSTRAINT text_documents_text_id_fkey FOREIGN KEY (text_id) REFERENCES public.texts(id)
);
CREATE TABLE public.texts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  publication_date text,
  author text,
  translator text,
  tags ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT texts_pkey PRIMARY KEY (id),
  CONSTRAINT texts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);