-- Setup Forum Storage Bucket and Policies
-- Run this script in Supabase SQL Editor to enable forum media uploads

-- Create the forum storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum', 'forum', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload forum media
CREATE POLICY "Users can upload forum media" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'forum' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their own forum media
CREATE POLICY "Users can update their own forum media" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'forum' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
) WITH CHECK (
  bucket_id = 'forum' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their own forum media
CREATE POLICY "Users can delete their own forum media" ON storage.objects
FOR DELETE USING (
  bucket_id = 'forum' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  auth.role() = 'authenticated'
);

-- Policy: Allow public read access to all forum media
CREATE POLICY "Anyone can view forum media" ON storage.objects
FOR SELECT USING (
  bucket_id = 'forum'
);

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'forum';

-- List all policies for forum bucket
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%forum%';