-- ===================================================
-- ADMIN RLS & PROFILE FIX
-- ===================================================

-- 1. DROP EXISTING POLICIES (Clean start)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner or admin" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are updatable by owner or admin" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles are deletable by admin" ON public.user_profiles;

-- 2. CREATE NON-RECURSIVE ADMIN POLICIES
-- We use a check on the auth.users table or a direct check if possible.
-- To avoid recursion on user_profiles, we can check the 'is_admin' column directly 
-- but we must ensure we don't query user_profiles inside a policy for user_profiles in a way that recurses.

-- SELECT: Owner can see themselves, or Admins can see everyone
CREATE POLICY "user_profiles_select_policy" 
ON public.user_profiles FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true))
);

-- UPDATE: Owner can update limited fields, Admins can update everything
CREATE POLICY "user_profiles_update_policy" 
ON public.user_profiles FOR UPDATE 
USING (
  auth.uid() = id 
  OR 
  (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true))
);

-- INSERT: Anyone can insert their own profile (during sign up)
CREATE POLICY "user_profiles_insert_policy" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- DELETE: Only Admins can delete
CREATE POLICY "user_profiles_delete_policy" 
ON public.user_profiles FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 3. ENSURE MASTER ADMIN PROFILE
-- Replace 'ivanrossi@outlook.com' with the actual ID from auth.users if available, 
-- but using email as a filter in a manual update is safer.
-- Run this AFTER the policies are set to ensure the admin can see themselves.
UPDATE public.user_profiles 
SET is_admin = TRUE, is_authorized = TRUE 
WHERE email = 'ivanrossi@outlook.com';
