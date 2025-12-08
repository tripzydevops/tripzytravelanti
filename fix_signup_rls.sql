-- Fix RLS policies for profiles table to allow signup
-- Drop existing insert/update policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
-- Re-create policies with explicit permissions
-- 1. Allow everyone to view profiles (needed for sharing, etc.)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR
SELECT USING (true);
-- 2. Allow a user to insert their own profile.
-- The check ensures the ID they are inserting matches their authenticated User ID.
CREATE POLICY "Users can insert own profile" ON profiles FOR
INSERT WITH CHECK (auth.uid() = id);
-- 3. Allow a user to update their own profile.
CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE USING (auth.uid() = id);
-- 4. Just in case, grant permissions if they were missing (redundant if public schema, but safe)
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;