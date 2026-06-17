-- Secure Storage Policies for 'deals' bucket
-- Enforces user-scoped access: Users can only modify files in 'deals/userId/*'
-- 1. Enable RLS on objects (standard safety)
-- Skipped: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; 
-- (Usually already enabled, and requires superuser to change)
-- 2. Allow Public Read Access (Images are public)
-- Note: 'storage.objects' policies are additive. 
DROP POLICY IF EXISTS "Public deals view" ON storage.objects;
CREATE POLICY "Public deals view" ON storage.objects FOR
SELECT USING (bucket_id = 'deals');
-- 3. Allow Authed Users to INSERT their own files
-- Path validation: (storage.foldername(name))[1] should match auth.uid()
DROP POLICY IF EXISTS "User upload to own folder" ON storage.objects;
CREATE POLICY "User upload to own folder" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (
        bucket_id = 'deals'
        AND (storage.foldername(name)) [1] = auth.uid()::text
    );
-- 4. Allow Authed Users to UPDATE their own files
DROP POLICY IF EXISTS "User update own folder" ON storage.objects;
CREATE POLICY "User update own folder" ON storage.objects FOR
UPDATE TO authenticated USING (
        bucket_id = 'deals'
        AND (storage.foldername(name)) [1] = auth.uid()::text
    );
-- 5. Allow Authed Users to DELETE their own files
DROP POLICY IF EXISTS "User delete own folder" ON storage.objects;
CREATE POLICY "User delete own folder" ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id = 'deals'
    AND (storage.foldername(name)) [1] = auth.uid()::text
);
-- 6. Admin Full Access
-- Assumes admins are identified in public.profiles table
DROP POLICY IF EXISTS "Admin full access deals" ON storage.objects;
CREATE POLICY "Admin full access deals" ON storage.objects FOR ALL TO authenticated USING (
    bucket_id = 'deals'
    AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
            AND (
                role = 'admin'
                OR is_admin = true
            )
    )
);