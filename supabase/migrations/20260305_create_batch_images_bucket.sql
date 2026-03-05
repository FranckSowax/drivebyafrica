-- Create the batch-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'batch-images',
  'batch-images',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload batch images
CREATE POLICY "Authenticated users can upload batch images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'batch-images');

-- Allow public read access to batch images
CREATE POLICY "Public read access for batch images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'batch-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update batch images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'batch-images');

-- Allow authenticated users to delete batch images
CREATE POLICY "Authenticated users can delete batch images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'batch-images');
