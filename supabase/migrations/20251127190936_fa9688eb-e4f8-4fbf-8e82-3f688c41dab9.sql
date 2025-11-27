-- Allow anonymous users to view resorts (needed for guest login form)
CREATE POLICY "Anyone can view resorts" 
ON public.resorts 
FOR SELECT 
TO anon 
USING (true);