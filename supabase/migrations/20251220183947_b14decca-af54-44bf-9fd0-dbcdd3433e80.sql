-- Add missing columns to staff_invitations table
ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS invited_by_name text;

ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS invite_message text;

-- Add a unique index for username per resort (only for pending invites)
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_invitations_resort_username 
ON public.staff_invitations (resort_id, lower(username)) 
WHERE username IS NOT NULL AND status = 'PENDING';