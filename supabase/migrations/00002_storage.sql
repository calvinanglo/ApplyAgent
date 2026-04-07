-- Create storage bucket for generated files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-files',
  'generated-files',
  true,
  52428800, -- 50MB
  array['application/pdf', 'text/html']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload their own files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'generated-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own files
create policy "Users can read their own files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'generated-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read for public bucket
create policy "Public read for generated files"
  on storage.objects for select
  to public
  using (bucket_id = 'generated-files');
