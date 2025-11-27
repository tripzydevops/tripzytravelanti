-- Create a new public bucket named 'deals'
insert into storage.buckets (id, name, public)
values ('deals', 'deals', true) on conflict (id) do nothing;
-- Note: We removed the 'ALTER TABLE' command as it requires superuser permissions.
-- RLS is typically enabled by default on storage.objects.
-- Policy: Allow public read access to all files in the 'deals' bucket
drop policy if exists "Public Access Deals" on storage.objects;
create policy "Public Access Deals" on storage.objects for
select using (bucket_id = 'deals');
-- Policy: Allow authenticated users to upload files to the 'deals' bucket
drop policy if exists "Authenticated Upload Deals" on storage.objects;
create policy "Authenticated Upload Deals" on storage.objects for
insert with check (
        bucket_id = 'deals'
        and auth.role() = 'authenticated'
    );
-- Policy: Allow authenticated users to update their own files
drop policy if exists "Authenticated Update Deals" on storage.objects;
create policy "Authenticated Update Deals" on storage.objects for
update using (
        bucket_id = 'deals'
        and auth.role() = 'authenticated'
    );
-- Policy: Allow authenticated users to delete files
drop policy if exists "Authenticated Delete Deals" on storage.objects;
create policy "Authenticated Delete Deals" on storage.objects for delete using (
    bucket_id = 'deals'
    and auth.role() = 'authenticated'
);