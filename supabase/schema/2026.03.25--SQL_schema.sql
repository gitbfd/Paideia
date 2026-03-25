


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."courses_set_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  base text;
  s text;
  n integer := 0;
begin
  if (tg_op = 'INSERT' and (new.slug is null or new.slug = ''))
     or (tg_op = 'UPDATE' and new.title is distinct from old.title and (new.slug is null or new.slug = ''))
  then
    base := public.slugify(new.title);
    if base = '' then
      raise exception 'title cannot slugify to empty string';
    end if;

    s := base;
    while exists (select 1 from public.courses where slug = s and id is distinct from new.id) loop
      n := n + 1;
      s := base || '-' || n;
    end loop;

    new.slug := s;
  end if;

  return new;
end
$$;


ALTER FUNCTION "public"."courses_set_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_for"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from public.app_admins where user_id = uid);
$$;


ALTER FUNCTION "public"."is_admin_for"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_document_chunks"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer DEFAULT 8) RETURNS TABLE("id" "uuid", "content" "text", "similarity" real)
    LANGUAGE "sql" STABLE
    AS $$
  select c.id, c.content, 1 - (c.embedding <=> p_query_embedding) as similarity
  from public.document_chunks c
  where c.course_id = p_course_id
  order by c.embedding <-> p_query_embedding
  limit p_match_count;
$$;


ALTER FUNCTION "public"."match_document_chunks"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_text_chunks_for_course"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer DEFAULT 8, "p_max_order_index" integer DEFAULT NULL::integer) RETURNS TABLE("id" "uuid", "content" "text", "similarity" real, "start_char" integer, "end_char" integer)
    LANGUAGE "sql" STABLE
    AS $$
  WITH course_sections AS (
    SELECT 
      cts.text_document_id,
      cts.start_char,
      cts.end_char
    FROM public.course_text_sections cts
    WHERE cts.course_id = p_course_id
      AND (p_max_order_index IS NULL OR cts.order_index < p_max_order_index)
      -- Only include sections that have character positions set
      AND cts.start_char IS NOT NULL 
      AND cts.end_char IS NOT NULL
  ),
  relevant_chunks AS (
    SELECT 
      tdc.id,
      tdc.content,
      tdc.embedding,
      tdc.start_char,
      tdc.end_char
    FROM public.text_document_chunks tdc
    INNER JOIN course_sections cs 
      ON tdc.document_id = cs.text_document_id
    WHERE 
      -- Chunk overlaps with section: chunk starts before section ends AND chunk ends after section starts
      tdc.start_char < cs.end_char 
      AND tdc.end_char > cs.start_char
      -- Only include chunks that have character positions set
      AND tdc.start_char IS NOT NULL
      AND tdc.end_char IS NOT NULL
  )
  SELECT 
    rc.id,
    rc.content,
    1 - (rc.embedding <=> p_query_embedding) as similarity,
    rc.start_char,
    rc.end_char
  FROM relevant_chunks rc
  ORDER BY rc.embedding <-> p_query_embedding
  LIMIT p_match_count;
$$;


ALTER FUNCTION "public"."match_text_chunks_for_course"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_max_order_index" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_text_chunks_for_course"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_max_order_index" integer) IS 'Matches text document chunks for a course using character-based filtering. 
Filters chunks that overlap with course_text_sections by character position.
Supports limiting to sections above a given order_index for Assessment Modules.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."slugify"("txt" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select coalesce(
    regexp_replace(lower(unaccent(txt)), '[^a-z0-9]+', '-', 'g')
      , ''
  );
$$;


ALTER FUNCTION "public"."slugify"("txt" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_admins" (
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."app_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_question_id" "uuid" NOT NULL,
    "assessment_session_id" "uuid" NOT NULL,
    "answer_text" "text",
    "score" numeric(3,2),
    "feedback" "text",
    "evaluated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."assessment_answers" OWNER TO "postgres";


COMMENT ON TABLE "public"."assessment_answers" IS 'Student answers to assessment questions';



COMMENT ON COLUMN "public"."assessment_answers"."answer_text" IS 'Student answer text or option ID for multiple choice';



COMMENT ON COLUMN "public"."assessment_answers"."score" IS 'Score for this answer (0-1 scale)';



COMMENT ON COLUMN "public"."assessment_answers"."feedback" IS 'AI-generated feedback for the student';



CREATE TABLE IF NOT EXISTS "public"."assessment_module_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "question_type" "text" DEFAULT 'short_answer'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "assessment_module_templates_question_type_check" CHECK (("question_type" = ANY (ARRAY['definition'::"text", 'socratic'::"text", 'multiple_choice'::"text", 'short_answer'::"text"])))
);


ALTER TABLE "public"."assessment_module_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."assessment_module_templates" IS 'Reusable assessment configs; not attached to any course until instantiated';



CREATE TABLE IF NOT EXISTS "public"."assessment_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0,
    "question_type" "text" DEFAULT 'short_answer'::"text" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "template_id" "uuid",
    CONSTRAINT "assessment_modules_question_type_check" CHECK (("question_type" = ANY (ARRAY['definition'::"text", 'socratic'::"text", 'multiple_choice'::"text", 'short_answer'::"text"])))
);


ALTER TABLE "public"."assessment_modules" OWNER TO "postgres";


COMMENT ON TABLE "public"."assessment_modules" IS 'Assessment modules placed within courses, positioned by order_index';



COMMENT ON COLUMN "public"."assessment_modules"."order_index" IS 'Position in course sequence - AMs can be placed between text sections';



COMMENT ON COLUMN "public"."assessment_modules"."question_type" IS 'Type of questions this AM will generate';



COMMENT ON COLUMN "public"."assessment_modules"."config" IS 'JSONB configuration for question generation, evaluation, and behavior';



CREATE TABLE IF NOT EXISTS "public"."assessment_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_session_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "text" DEFAULT 'short_answer'::"text" NOT NULL,
    "correct_answer" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "assessment_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['definition'::"text", 'socratic'::"text", 'multiple_choice'::"text", 'short_answer'::"text"])))
);


ALTER TABLE "public"."assessment_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."assessment_questions" IS 'Questions generated for each assessment session';



COMMENT ON COLUMN "public"."assessment_questions"."correct_answer" IS 'Reference answer for evaluation (or option ID for MC)';



COMMENT ON COLUMN "public"."assessment_questions"."metadata" IS 'Additional data like MC options, evaluation rubric, etc.';



CREATE TABLE IF NOT EXISTS "public"."assessment_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_module_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "score" numeric(5,2),
    "attempt_number" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "assessment_sessions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."assessment_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."assessment_sessions" IS 'Tracks student attempts at assessment modules';



COMMENT ON COLUMN "public"."assessment_sessions"."status" IS 'Current state of the assessment session';



COMMENT ON COLUMN "public"."assessment_sessions"."score" IS 'Final score as percentage (0-100)';



COMMENT ON COLUMN "public"."assessment_sessions"."attempt_number" IS 'Attempt number for this user/module combination';



CREATE TABLE IF NOT EXISTS "public"."course_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "storage_path" "text",
    "bytes" integer,
    "mime" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "ingest_status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_documents_ingest_status_check" CHECK (("ingest_status" = ANY (ARRAY['uploaded'::"text", 'chunked'::"text", 'embedded'::"text", 'error'::"text"]))),
    CONSTRAINT "course_documents_source_type_check" CHECK (("source_type" = ANY (ARRAY['pdf'::"text", 'txt'::"text", 'html'::"text", 'markdown'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."course_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "user_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_enrollments_role_check" CHECK (("role" = ANY (ARRAY['student'::"text", 'instructor'::"text"])))
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."course_lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_text_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "text_document_id" "uuid" NOT NULL,
    "start_line" integer,
    "end_line" integer,
    "title" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "start_char" integer,
    "end_char" integer,
    "start_block" integer,
    "end_block" integer,
    CONSTRAINT "course_text_sections_check" CHECK (("end_line" >= "start_line")),
    CONSTRAINT "course_text_sections_end_block_check" CHECK ((("end_block" IS NULL) OR ("end_block" >= COALESCE("start_block", 0)))),
    CONSTRAINT "course_text_sections_end_line_check" CHECK ((("end_line" IS NULL) OR ("end_line" >= COALESCE("start_line", 0)))),
    CONSTRAINT "course_text_sections_start_block_check" CHECK ((("start_block" IS NULL) OR ("start_block" > 0))),
    CONSTRAINT "course_text_sections_start_line_check" CHECK ((("start_line" IS NULL) OR ("start_line" > 0)))
);


ALTER TABLE "public"."course_text_sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_text_sections" IS 'Links specific line ranges from text documents to courses';



COMMENT ON COLUMN "public"."course_text_sections"."start_line" IS 'Starting line number (1-indexed, optional for character-based sections)';



COMMENT ON COLUMN "public"."course_text_sections"."end_line" IS 'Ending line number (inclusive, optional for character-based sections)';



COMMENT ON COLUMN "public"."course_text_sections"."start_char" IS 'Starting character position in rag_text (0-indexed)';



COMMENT ON COLUMN "public"."course_text_sections"."end_char" IS 'Ending character position in rag_text (exclusive, 0-indexed)';



COMMENT ON COLUMN "public"."course_text_sections"."start_block" IS 'Starting block number (1-indexed, original value entered by admin)';



COMMENT ON COLUMN "public"."course_text_sections"."end_block" IS 'Ending block number (inclusive, original value entered by admin)';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "published_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "courses_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."courses"."user_id" IS 'Historical/audit field: ID of user who created the course. Nullable - courses are not tied to user accounts and persist independently.';



CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(768),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'student'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text" DEFAULT 'First'::"text",
    "last_name" "text" DEFAULT 'Last'::"text",
    "street" "text" DEFAULT 'Street Address'::"text",
    "city" "text" DEFAULT 'City'::"text",
    "state" "text" DEFAULT 'State'::"text",
    "phone" "text" DEFAULT '555-555-5555'::"text",
    "about_me" "text" DEFAULT 'Tell us about yourself...'::"text",
    "avatar_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."text_document_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "text_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(768),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "start_char" integer,
    "end_char" integer
);


ALTER TABLE "public"."text_document_chunks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."text_document_chunks"."start_char" IS 'Starting character position in rag_text (0-indexed)';



COMMENT ON COLUMN "public"."text_document_chunks"."end_char" IS 'Ending character position in rag_text (exclusive, 0-indexed)';



CREATE TABLE IF NOT EXISTS "public"."text_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "text_id" "uuid" NOT NULL,
    "source_type" "text" NOT NULL,
    "storage_path" "text",
    "bytes" integer,
    "mime" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "ingest_status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_content" "text",
    "rag_text" "text",
    "conversion_content" "text",
    "display_grid_rows" "jsonb",
    CONSTRAINT "text_documents_ingest_status_check" CHECK (("ingest_status" = ANY (ARRAY['uploaded'::"text", 'chunked'::"text", 'embedded'::"text", 'error'::"text"]))),
    CONSTRAINT "text_documents_source_type_check" CHECK (("source_type" = ANY (ARRAY['pdf'::"text", 'txt'::"text", 'html'::"text", 'markdown'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."text_documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."text_documents"."display_content" IS 'Full cleaned text content for display to students, separate from RAG chunks';



COMMENT ON COLUMN "public"."text_documents"."rag_text" IS 'Cleaned plain text used for RAG ingestion and as source of truth for character positions';



COMMENT ON COLUMN "public"."text_documents"."conversion_content" IS 'Raw HTML generated during ingestion before display formatting';



COMMENT ON COLUMN "public"."text_documents"."display_grid_rows" IS 'Pre-computed block grid rows (from htmlToBlockGridRowsWithChars) for fast course page rendering. Populated on ingest; run backfill script for existing rows.';



CREATE TABLE IF NOT EXISTS "public"."texts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "publication_date" "text",
    "author" "text",
    "translator" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."texts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_admins"
    ADD CONSTRAINT "app_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."assessment_answers"
    ADD CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_answers"
    ADD CONSTRAINT "assessment_answers_unique_question_session" UNIQUE ("assessment_question_id", "assessment_session_id");



ALTER TABLE ONLY "public"."assessment_module_templates"
    ADD CONSTRAINT "assessment_module_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_modules"
    ADD CONSTRAINT "assessment_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_unique_user_module_attempt" UNIQUE ("user_id", "assessment_module_id", "attempt_number");



ALTER TABLE ONLY "public"."course_documents"
    ADD CONSTRAINT "course_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("user_id", "course_id");



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_text_sections"
    ADD CONSTRAINT "course_text_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."text_document_chunks"
    ADD CONSTRAINT "text_document_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."text_documents"
    ADD CONSTRAINT "text_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."texts"
    ADD CONSTRAINT "texts_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "courses_slug_uidx" ON "public"."courses" USING "btree" ("slug");



CREATE UNIQUE INDEX "courses_slug_unique" ON "public"."courses" USING "btree" ("slug");



CREATE INDEX "document_chunks_course_idx" ON "public"."document_chunks" USING "btree" ("course_id");



CREATE INDEX "document_chunks_vec_idx" ON "public"."document_chunks" USING "ivfflat" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "idx_assessment_answers_question_id" ON "public"."assessment_answers" USING "btree" ("assessment_question_id");



CREATE INDEX "idx_assessment_answers_session_id" ON "public"."assessment_answers" USING "btree" ("assessment_session_id");



CREATE INDEX "idx_assessment_module_templates_created_at" ON "public"."assessment_module_templates" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_assessment_modules_course_id" ON "public"."assessment_modules" USING "btree" ("course_id");



CREATE INDEX "idx_assessment_modules_order_index" ON "public"."assessment_modules" USING "btree" ("course_id", "order_index");



CREATE INDEX "idx_assessment_modules_template_id" ON "public"."assessment_modules" USING "btree" ("template_id") WHERE ("template_id" IS NOT NULL);



CREATE INDEX "idx_assessment_questions_order" ON "public"."assessment_questions" USING "btree" ("assessment_session_id", "order_index");



CREATE INDEX "idx_assessment_questions_session_id" ON "public"."assessment_questions" USING "btree" ("assessment_session_id");



CREATE INDEX "idx_assessment_sessions_module_id" ON "public"."assessment_sessions" USING "btree" ("assessment_module_id");



CREATE INDEX "idx_assessment_sessions_status" ON "public"."assessment_sessions" USING "btree" ("status");



CREATE INDEX "idx_assessment_sessions_user_id" ON "public"."assessment_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_course_text_sections_char_range" ON "public"."course_text_sections" USING "btree" ("course_id", "start_char", "end_char");



CREATE INDEX "idx_course_text_sections_course_id" ON "public"."course_text_sections" USING "btree" ("course_id");



CREATE INDEX "idx_course_text_sections_text_document_id" ON "public"."course_text_sections" USING "btree" ("text_document_id");



CREATE INDEX "idx_text_document_chunks_char_range" ON "public"."text_document_chunks" USING "btree" ("document_id", "start_char", "end_char");



CREATE INDEX "idx_text_document_chunks_document_id" ON "public"."text_document_chunks" USING "btree" ("document_id");



CREATE INDEX "idx_text_document_chunks_text_id" ON "public"."text_document_chunks" USING "btree" ("text_id");



CREATE INDEX "idx_text_documents_text_id" ON "public"."text_documents" USING "btree" ("text_id");



CREATE INDEX "idx_texts_user_id" ON "public"."texts" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_courses_set_slug" BEFORE INSERT OR UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."courses_set_slug"();



CREATE OR REPLACE TRIGGER "trg_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_docs_updated_at" BEFORE UPDATE ON "public"."course_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lessons_updated_at" BEFORE UPDATE ON "public"."course_lessons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."app_admins"
    ADD CONSTRAINT "app_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_answers"
    ADD CONSTRAINT "assessment_answers_assessment_question_id_fkey" FOREIGN KEY ("assessment_question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_answers"
    ADD CONSTRAINT "assessment_answers_assessment_session_id_fkey" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_modules"
    ADD CONSTRAINT "assessment_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_modules"
    ADD CONSTRAINT "assessment_modules_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_module_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_assessment_session_id_fkey" FOREIGN KEY ("assessment_session_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_assessment_module_id_fkey" FOREIGN KEY ("assessment_module_id") REFERENCES "public"."assessment_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessment_sessions"
    ADD CONSTRAINT "assessment_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_documents"
    ADD CONSTRAINT "course_documents_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_text_sections"
    ADD CONSTRAINT "course_text_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_text_sections"
    ADD CONSTRAINT "course_text_sections_text_document_id_fkey" FOREIGN KEY ("text_document_id") REFERENCES "public"."text_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."course_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_document_chunks"
    ADD CONSTRAINT "text_document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."text_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_document_chunks"
    ADD CONSTRAINT "text_document_chunks_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_documents"
    ADD CONSTRAINT "text_documents_text_id_fkey" FOREIGN KEY ("text_id") REFERENCES "public"."texts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."texts"
    ADD CONSTRAINT "texts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Admins can delete text_document_chunks" ON "public"."text_document_chunks" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can delete text_documents" ON "public"."text_documents" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can delete texts" ON "public"."texts" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can insert text_document_chunks" ON "public"."text_document_chunks" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can insert text_documents" ON "public"."text_documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can insert texts" ON "public"."texts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage assessment_answers" ON "public"."assessment_answers" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage assessment_module_templates" ON "public"."assessment_module_templates" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage assessment_modules" ON "public"."assessment_modules" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage assessment_questions" ON "public"."assessment_questions" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage assessment_sessions" ON "public"."assessment_sessions" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage course_text_sections" ON "public"."course_text_sections" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update text_document_chunks" ON "public"."text_document_chunks" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can update text_documents" ON "public"."text_documents" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can update texts" ON "public"."texts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view all text_document_chunks" ON "public"."text_document_chunks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view all text_documents" ON "public"."text_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can view all texts" ON "public"."texts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."app_admins"
  WHERE ("app_admins"."user_id" = "auth"."uid"()))));



CREATE POLICY "Students can create assessment_sessions" ON "public"."assessment_sessions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM (("public"."assessment_modules" "am"
     JOIN "public"."courses" "c" ON (("c"."id" = "am"."course_id")))
     JOIN "public"."course_enrollments" "ce" ON (("ce"."course_id" = "c"."id")))
  WHERE (("am"."id" = "assessment_sessions"."assessment_module_id") AND ("ce"."user_id" = "auth"."uid"()) AND ("c"."status" = 'published'::"text"))))));



CREATE POLICY "Students can insert questions for their own sessions" ON "public"."assessment_questions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assessment_sessions" "asess"
  WHERE (("asess"."id" = "assessment_questions"."assessment_session_id") AND ("asess"."user_id" = "auth"."uid"())))));



CREATE POLICY "Students can manage their own assessment_answers" ON "public"."assessment_answers" USING ((EXISTS ( SELECT 1
   FROM "public"."assessment_sessions" "asess"
  WHERE (("asess"."id" = "assessment_answers"."assessment_session_id") AND ("asess"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."assessment_sessions" "asess"
  WHERE (("asess"."id" = "assessment_answers"."assessment_session_id") AND ("asess"."user_id" = "auth"."uid"())))));



CREATE POLICY "Students can manage their own assessment_sessions" ON "public"."assessment_sessions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Students can read assessment_modules for enrolled courses" ON "public"."assessment_modules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."courses" "c"
     JOIN "public"."course_enrollments" "ce" ON (("ce"."course_id" = "c"."id")))
  WHERE (("c"."id" = "assessment_modules"."course_id") AND ("ce"."user_id" = "auth"."uid"()) AND ("c"."status" = 'published'::"text")))));



CREATE POLICY "Students can read their own assessment_questions" ON "public"."assessment_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."assessment_sessions" "asess"
  WHERE (("asess"."id" = "assessment_questions"."assessment_session_id") AND ("asess"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."app_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_module_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chunks_admin_write" ON "public"."document_chunks" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "chunks_read" ON "public"."document_chunks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "document_chunks"."course_id") AND (("c"."status" = 'published'::"text") OR ("auth"."uid"() = "c"."user_id") OR "public"."is_admin"())))));



ALTER TABLE "public"."course_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_text_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_text_sections_read_published" ON "public"."course_text_sections" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "course_text_sections"."course_id") AND ("courses"."status" = 'published'::"text")))) OR "public"."is_admin"()));



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_admin_write" ON "public"."courses" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "courses_read_published_or_admin" ON "public"."courses" FOR SELECT USING ((("status" = 'published'::"text") OR "public"."is_admin"()));



CREATE POLICY "docs_admin_write" ON "public"."course_documents" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "docs_read" ON "public"."course_documents" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_documents"."course_id") AND (("c"."status" = 'published'::"text") OR ("auth"."uid"() = "c"."user_id") OR "public"."is_admin"())))));



ALTER TABLE "public"."document_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrollments_admin_write" ON "public"."course_enrollments" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "enrollments_read_self" ON "public"."course_enrollments" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "enrollments_student_insert" ON "public"."course_enrollments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("role" = 'student'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."courses"
  WHERE (("courses"."id" = "course_enrollments"."course_id") AND ("courses"."status" = 'published'::"text"))))));



CREATE POLICY "lessons_admin_write" ON "public"."course_lessons" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "lessons_read" ON "public"."course_lessons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_lessons"."course_id") AND (("c"."status" = 'published'::"text") OR ("auth"."uid"() = "c"."user_id") OR "public"."is_admin"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() = "id") OR "public"."is_admin"()));



CREATE POLICY "profiles_read_own" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."is_admin"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "id") OR "public"."is_admin"())) WITH CHECK ((("auth"."uid"() = "id") OR "public"."is_admin"()));



ALTER TABLE "public"."text_document_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "text_document_chunks_admin_write" ON "public"."text_document_chunks" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."text_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "text_documents_admin_write" ON "public"."text_documents" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "text_documents_read_for_published_courses" ON "public"."text_documents" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."course_text_sections" "cts"
     JOIN "public"."courses" "c" ON (("c"."id" = "cts"."course_id")))
  WHERE (("cts"."text_document_id" = "text_documents"."id") AND ("c"."status" = 'published'::"text")))) OR "public"."is_admin"()));



ALTER TABLE "public"."texts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "texts_admin_write" ON "public"."texts" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "texts_read_for_published_courses" ON "public"."texts" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (("public"."text_documents" "td"
     JOIN "public"."course_text_sections" "cts" ON (("cts"."text_document_id" = "td"."id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "cts"."course_id")))
  WHERE (("td"."text_id" = "texts"."id") AND ("c"."status" = 'published'::"text")))) OR "public"."is_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."courses_set_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."courses_set_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."courses_set_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_for"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_for"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_for"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_document_chunks"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_document_chunks"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_document_chunks"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_text_chunks_for_course"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_max_order_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_text_chunks_for_course"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_max_order_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_text_chunks_for_course"("p_course_id" "uuid", "p_query_embedding" "public"."vector", "p_match_count" integer, "p_max_order_index" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."slugify"("txt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."slugify"("txt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."slugify"("txt" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."app_admins" TO "anon";
GRANT ALL ON TABLE "public"."app_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."app_admins" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_answers" TO "anon";
GRANT ALL ON TABLE "public"."assessment_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_answers" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_module_templates" TO "anon";
GRANT ALL ON TABLE "public"."assessment_module_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_module_templates" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_modules" TO "anon";
GRANT ALL ON TABLE "public"."assessment_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_modules" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_questions" TO "anon";
GRANT ALL ON TABLE "public"."assessment_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_questions" TO "service_role";



GRANT ALL ON TABLE "public"."assessment_sessions" TO "anon";
GRANT ALL ON TABLE "public"."assessment_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."assessment_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."course_documents" TO "anon";
GRANT ALL ON TABLE "public"."course_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."course_documents" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."course_lessons" TO "anon";
GRANT ALL ON TABLE "public"."course_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."course_lessons" TO "service_role";



GRANT ALL ON TABLE "public"."course_text_sections" TO "anon";
GRANT ALL ON TABLE "public"."course_text_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."course_text_sections" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."text_document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."text_document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."text_document_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."text_documents" TO "anon";
GRANT ALL ON TABLE "public"."text_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."text_documents" TO "service_role";



GRANT ALL ON TABLE "public"."texts" TO "anon";
GRANT ALL ON TABLE "public"."texts" TO "authenticated";
GRANT ALL ON TABLE "public"."texts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































