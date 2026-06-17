-- Create a storage bucket for background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true) ON CONFLICT (id) DO NOTHING;
-- Policy to allow public access to view images
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'backgrounds');
-- Policy to allow authenticated users (admin) to upload images
CREATE POLICY "Admin Upload Access" ON storage.objects FOR
INSERT TO authenticated WITH CHECK (bucket_id = 'backgrounds');
-- Policy to allow authenticated users (admin) to delete images
CREATE POLICY "Admin Delete Access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'backgrounds');
-- Policy to allow authenticated users (admin) to update images
CREATE POLICY "Admin Update Access" ON storage.objects FOR
UPDATE TO authenticated USING (bucket_id = 'backgrounds');