-- Create storage bucket for activity images
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-images', 'activity-images', true);

-- Allow authenticated users to upload activity images
CREATE POLICY "Staff can upload activity images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'activity-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Staff can update activity images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'activity-images');

-- Allow authenticated users to delete activity images
CREATE POLICY "Staff can delete activity images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'activity-images');

-- Allow public read access to activity images
CREATE POLICY "Anyone can view activity images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'activity-images');