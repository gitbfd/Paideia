-- Migration: Decouple courses from users
-- Makes courses.user_id nullable and removes foreign key constraint
-- Keeps user_id for audit/historical tracking purposes
-- Updates RLS policies to remove user_id-based access checks

-- 1. Make user_id nullable (preserves existing data for audit trail)
ALTER TABLE public.courses 
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop foreign key constraint (allows courses to exist independently)
-- First, check if constraint exists before dropping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'courses_user_id_fkey'
    AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses DROP CONSTRAINT courses_user_id_fkey;
  END IF;
END $$;

-- 3. Update RLS policies to remove user_id check
-- Drop existing read policy
DROP POLICY IF EXISTS "courses_read_published_or_own_or_admin" ON public.courses;

-- Create new read policy without user_id check
-- Published courses visible to all, drafts only visible to admins
CREATE POLICY "courses_read_published_or_admin"
  ON public.courses
  FOR SELECT
  USING (
    status = 'published' 
    OR public.is_admin()
  );

-- Note: courses_admin_write policy remains unchanged (already admin-only)
-- It doesn't reference user_id, so no changes needed

COMMENT ON COLUMN public.courses.user_id IS 'Historical/audit field: ID of user who created the course. Nullable - courses are not tied to user accounts and persist independently.';
