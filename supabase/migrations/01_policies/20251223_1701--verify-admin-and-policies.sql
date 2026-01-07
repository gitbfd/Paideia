-- Step 1: Verify you're an admin
-- Run this first to check if your user is in the app_admins table
SELECT 
  user_id,
  'You are an admin' as status
FROM app_admins 
WHERE user_id = auth.uid();

-- If the above returns nothing, you need to add yourself:
-- INSERT INTO app_admins (user_id) VALUES (auth.uid());

-- Step 2: Check if with_check is set on the policies
-- This should show the with_check clause for each policy
SELECT 
  tablename,
  policyname,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'assessment_modules'
  AND policyname = 'Admins can manage assessment_modules';

-- Step 3: Test the policy directly
-- This simulates what happens when you try to insert
SELECT 
  auth.uid() as current_user_id,
  EXISTS (
    SELECT 1 FROM public.app_admins
    WHERE app_admins.user_id = auth.uid()
  ) as is_admin_check;

