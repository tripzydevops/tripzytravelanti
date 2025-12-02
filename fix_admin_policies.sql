-- Fix Admin RLS Policies to use 'role' column
-- The previous policies might have relied on 'is_admin' which might not exist or be set correctly.
-- We recently added 'role' column to profiles, so we should use that.
-- 1. Deals
DROP POLICY IF EXISTS "Only admins can insert deals" ON deals;
CREATE POLICY "Only admins can insert deals" ON deals FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = (
                    SELECT auth.uid()
                )
                AND (
                    profiles.role = 'admin'
                    OR profiles.is_admin = true
                ) -- Check both to be safe
        )
    );
DROP POLICY IF EXISTS "Only admins can update deals" ON deals;
CREATE POLICY "Only admins can update deals" ON deals FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = (
                    SELECT auth.uid()
                )
                AND (
                    profiles.role = 'admin'
                    OR profiles.is_admin = true
                )
        )
    );
DROP POLICY IF EXISTS "Only admins can delete deals" ON deals;
CREATE POLICY "Only admins can delete deals" ON deals FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = (
                SELECT auth.uid()
            )
            AND (
                profiles.role = 'admin'
                OR profiles.is_admin = true
            )
    )
);
-- 2. Page Content (just in case)
DROP POLICY IF EXISTS "Only admins can insert page content" ON page_content;
CREATE POLICY "Only admins can insert page content" ON page_content FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = (
                    SELECT auth.uid()
                )
                AND (
                    profiles.role = 'admin'
                    OR profiles.is_admin = true
                )
        )
    );
DROP POLICY IF EXISTS "Only admins can update page content" ON page_content;
CREATE POLICY "Only admins can update page content" ON page_content FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = (
                    SELECT auth.uid()
                )
                AND (
                    profiles.role = 'admin'
                    OR profiles.is_admin = true
                )
        )
    );
DROP POLICY IF EXISTS "Only admins can delete page content" ON page_content;
CREATE POLICY "Only admins can delete page content" ON page_content FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = (
                SELECT auth.uid()
            )
            AND (
                profiles.role = 'admin'
                OR profiles.is_admin = true
            )
    )
);