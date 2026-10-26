-- ============================================================================
-- House gallery image uploads
--
-- Creates a public Storage bucket for house gallery photos plus policies so
-- signed-in admins can upload/replace/delete objects and anyone can read them.
-- Run this in the Supabase SQL editor (the browser client cannot create
-- buckets on its own).
-- ============================================================================

-- Public bucket, 25 MB per object (matches the client-side cap).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'house-images',
  'house-images',
  true,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone (anon + authenticated) can read gallery images.
DROP POLICY IF EXISTS "public_read_house_images_objects" ON storage.objects;
CREATE POLICY "public_read_house_images_objects"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'house-images');

-- Signed-in admins can upload into the bucket.
DROP POLICY IF EXISTS "auth_insert_house_images_objects" ON storage.objects;
CREATE POLICY "auth_insert_house_images_objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'house-images');

-- Signed-in admins can replace objects (needed for upserts/moves).
DROP POLICY IF EXISTS "auth_update_house_images_objects" ON storage.objects;
CREATE POLICY "auth_update_house_images_objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'house-images')
  WITH CHECK (bucket_id = 'house-images');

-- Signed-in admins can delete objects (cleanup when gallery images are removed).
DROP POLICY IF EXISTS "auth_delete_house_images_objects" ON storage.objects;
CREATE POLICY "auth_delete_house_images_objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'house-images');
