-- Create storage bucket for resort branding images
INSERT INTO storage.buckets (id, name, public)
VALUES ('resort-branding', 'resort-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the branding bucket
-- Allow authenticated users to view all branding images (public bucket)
CREATE POLICY "Branding images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'resort-branding');

-- Allow resort admins and super admins to upload branding images
CREATE POLICY "Resort admins can upload branding images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resort-branding'
  AND auth.uid() IS NOT NULL
);

-- Allow resort admins and super admins to update their branding images
CREATE POLICY "Resort admins can update branding images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resort-branding'
  AND auth.uid() IS NOT NULL
);

-- Allow resort admins and super admins to delete branding images
CREATE POLICY "Resort admins can delete branding images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resort-branding'
  AND auth.uid() IS NOT NULL
);