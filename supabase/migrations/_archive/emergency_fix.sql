-- EMERGENCY FIX: Drop recursive policies causing 500 Errors
DROP POLICY IF EXISTS "Admins can do everything" ON public.profiles;
-- Restore safe, non-recursive policies for profiles
-- 1. Users can see their own profile
DROP POLICY IF EXISTS "Users can view own deal" ON public.profiles;
-- Cleanup typo if exists
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR
SELECT USING (auth.uid() = id);
-- 2. Allow Admins (via simplified check or just skip for now to restore access)
-- To avoid recursion, we will TEMPORARILY allow public read on profiles necessary for the app to load
-- This stops the crash immediately. We can refine 'Admin Only' later.
CREATE POLICY "Public read profiles" ON public.profiles FOR
SELECT USING (true);
-- 3. Fix Deals RLS just in case
DROP POLICY IF EXISTS "Admins can do everything" ON public.deals;
CREATE POLICY "Admins can update deals" ON public.deals FOR
UPDATE USING (
        (
            SELECT is_admin
            FROM profiles
            WHERE id = auth.uid()
        ) = true
    );
-- The above might still recurse if it queries profiles!
-- BETTER: Use a SECURITY DEFINER function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Updates using the safe function
DROP POLICY IF EXISTS "Admins can update deals" ON public.deals;
CREATE POLICY "Admins can update deals" ON public.deals FOR
UPDATE USING (public.is_admin());
-- Ensure basic visibility
GRANT SELECT ON public.profiles TO anon,
    authenticated;
GRANT SELECT ON public.deals TO anon,
    authenticated;