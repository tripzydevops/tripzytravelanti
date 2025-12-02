-- COMPREHENSIVE FIX FOR ADMIN PERMISSIONS AND DEAL VISIBILITY
-- Run this script in the Supabase SQL Editor to fix all issues.
-- 1. Ensure 'is_admin' column exists in 'profiles' table
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'is_admin'
) THEN
ALTER TABLE profiles
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
RAISE NOTICE 'Added is_admin column to profiles';
END IF;
END $$;
-- 2. Ensure 'role' column exists in 'profiles' table
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'role'
) THEN
ALTER TABLE profiles
ADD COLUMN role VARCHAR(20) DEFAULT 'user';
RAISE NOTICE 'Added role column to profiles';
END IF;
END $$;
-- 3. Sync 'is_admin' and 'role' for consistency
-- If role is 'admin', set is_admin = true
UPDATE profiles
SET is_admin = true
WHERE role = 'admin';
-- If is_admin is true, set role = 'admin' (if not already)
UPDATE profiles
SET role = 'admin'
WHERE is_admin = true
    AND role != 'admin';
-- 4. Fix RLS Policies for Deals
-- Drop all existing restrictive policies to start fresh
DROP POLICY IF EXISTS "Deals are viewable by everyone" ON deals;
DROP POLICY IF EXISTS "Only admins can insert deals" ON deals;
DROP POLICY IF EXISTS "Only admins can update deals" ON deals;
DROP POLICY IF EXISTS "Only admins can delete deals" ON deals;
DROP POLICY IF EXISTS "Partners can update own deals" ON deals;
DROP POLICY IF EXISTS "Partners can insert deals" ON deals;
DROP POLICY IF EXISTS "Admins and Partners can insert deals" ON deals;
DROP POLICY IF EXISTS "Admins and Partners can update deals" ON deals;
DROP POLICY IF EXISTS "Admins can delete deals" ON deals;
DROP POLICY IF EXISTS "Public view approved deals" ON deals;
-- Create unified policies
-- VIEW: Everyone can view deals (filtering happens in app)
CREATE POLICY "Public view deals" ON deals FOR
SELECT USING (true);
-- INSERT: Admins and Partners can insert
CREATE POLICY "Admins and Partners can insert deals" ON deals FOR
INSERT WITH CHECK (
        (auth.uid() = partner_id)
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND (
                    is_admin = true
                    OR role = 'admin'
                )
        )
    );
-- UPDATE: Admins can update ALL, Partners can update OWN
CREATE POLICY "Admins and Partners can update deals" ON deals FOR
UPDATE USING (
        (auth.uid() = partner_id)
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND (
                    is_admin = true
                    OR role = 'admin'
                )
        )
    );
-- DELETE: Admins can delete ALL, Partners can delete OWN
CREATE POLICY "Admins and Partners can delete deals" ON deals FOR DELETE USING (
    (auth.uid() = partner_id)
    OR EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
            AND (
                is_admin = true
                OR role = 'admin'
            )
    )
);
-- 5. Auto-approve pending deals for Admins
UPDATE deals
SET status = 'approved'
WHERE status = 'pending'
    AND EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = deals.partner_id
            AND (
                is_admin = true
                OR role = 'admin'
            )
    );
-- 6. Grant yourself admin privileges (Optional safety net)
-- This updates the current user running the query to be admin if they aren't already
-- (Note: In Supabase SQL Editor, auth.uid() might be null, so this part is just a template)
-- UPDATE profiles SET is_admin = true, role = 'admin' WHERE id = auth.uid();
-- RAISE NOTICE 'Fixed admin permissions and deal visibility.';