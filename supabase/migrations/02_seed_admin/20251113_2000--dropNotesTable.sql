-- Drop notes table and all associated policies
-- This migration removes the notes feature from the application

-- Drop all RLS policies on notes table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notes'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notes;', r.policyname);
  END LOOP;
END $$;

-- Drop the notes table
DROP TABLE IF EXISTS public.notes CASCADE;

