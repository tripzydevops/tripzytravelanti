-- NUCLEAR OPTION: FIX ALL RLS RECURSION
-- Run this in Supabase SQL Editor to resolve "infinite recursion detected in policy for relation 'profiles'".

-- =====================================================
-- 1. Helper Function (SECURITY DEFINER bypasses RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (is_admin = true OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 2. Profiles Table - Clean & Safe (NUCLEAR WIPE)
-- =====================================================
-- This loop finds EVERY policy on the profiles table and drops it, 
-- ensuring no hidden or legacy policies survive.
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Publicly readable to avoid recursion during login/fetch
CREATE POLICY "profiles_select_safe" ON public.profiles
FOR SELECT USING (true);

-- UPDATE: User own row OR Admin
CREATE POLICY "profiles_update_safe" ON public.profiles
FOR UPDATE USING (auth.uid() = id OR public.check_is_admin());

-- INSERT: User own row OR Admin
CREATE POLICY "profiles_insert_safe" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id OR public.check_is_admin());

-- =====================================================
-- 3. Deals Table - Clean & Safe
-- =====================================================
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'deals' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.deals', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "deals_select_safe" ON public.deals
FOR SELECT USING (true);

CREATE POLICY "deals_all_admin_partner_safe" ON public.deals
FOR ALL USING (
  (auth.uid() = partner_id) OR public.check_is_admin()
);

-- =====================================================
-- 4. Background Images Table - Ensure Exists & Safe
-- =====================================================
CREATE TABLE IF NOT EXISTS public.background_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    time_of_day TEXT NOT NULL CHECK (
        time_of_day IN ('morning', 'afternoon', 'evening', 'night')
    ),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.background_images ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'background_images' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.background_images', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "backgrounds_select_safe" ON public.background_images
FOR SELECT USING (is_active = true OR public.check_is_admin());

CREATE POLICY "backgrounds_admin_safe" ON public.background_images
FOR ALL USING (public.check_is_admin());

-- Seed if empty
INSERT INTO public.background_images (url, time_of_day)
SELECT 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2070', 'morning'
WHERE NOT EXISTS (SELECT 1 FROM public.background_images LIMIT 1);

-- =====================================================
-- 5. Final Permissions
-- =====================================================
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT SELECT ON profiles TO anon;
