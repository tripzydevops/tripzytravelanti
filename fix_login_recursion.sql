-- FIX LOGIN RECURSION & 500 ERRORS
-- Run this script to reset 'profiles' table security to a clean, working state.
-- 1. Ensure Columns Exist (Safe-guard)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'is_admin'
) THEN
ALTER TABLE profiles
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'role'
) THEN
ALTER TABLE profiles
ADD COLUMN role VARCHAR(20) DEFAULT 'user';
END IF;
END $$;
-- 2. DROP ALL EXISTING POLICIES (Clean Slate)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
-- Drop potential legacy/conflicting policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Public access" ON profiles;
DROP POLICY IF EXISTS "Authenticated access" ON profiles;
-- 3. ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- 4. RE-CREATE SIMPLE, SAFE POLICIES
-- SELECT: Allow everyone to read profiles. 
-- Using TRUE avoids any recursion (queries to other tables) during login.
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR
SELECT USING (true);
-- UPDATE: Users can only update their own row.
CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE USING (auth.uid() = id);
-- INSERT: Users can only insert their own row (critical for signup).
CREATE POLICY "Users can insert own profile" ON profiles FOR
INSERT WITH CHECK (auth.uid() = id);
-- 5. RESET SIGNUP TRIGGER (Ensure no recursion in trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Note: We don't drop the function if it's used elsewhere, but we replace it to be safe.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (id, email, name, role, is_admin)
VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        'user',
        FALSE
    ) ON CONFLICT (id) DO NOTHING;
RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- 6. GRANT PERMISSIONS
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT SELECT ON profiles TO anon;
RAISE NOTICE 'Login permissions fixed. Recursive policies removed.';