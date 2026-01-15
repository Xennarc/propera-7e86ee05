-- Add foreign key constraint for demo_login_tokens -> guests
-- This enables proper joins when consuming guest tokens
ALTER TABLE public.demo_login_tokens 
ADD CONSTRAINT demo_login_tokens_guest_id_fkey 
FOREIGN KEY (guest_id) REFERENCES public.guests(id) ON DELETE CASCADE;