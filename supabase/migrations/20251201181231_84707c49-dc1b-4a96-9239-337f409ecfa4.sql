-- Add loyalty and VIP fields to guests table (additive, backwards compatible)
ALTER TABLE public.guests 
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT,
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes_internal TEXT;

-- Add index for VIP filtering
CREATE INDEX IF NOT EXISTS idx_guests_is_vip ON public.guests(resort_id, is_vip) WHERE is_vip = true;

-- Add comment for clarity
COMMENT ON COLUMN public.guests.loyalty_tier IS 'Guest loyalty tier (e.g., BRONZE, SILVER, GOLD, VIP) - free text for flexibility';
COMMENT ON COLUMN public.guests.is_vip IS 'Flag indicating VIP status for priority treatment';
COMMENT ON COLUMN public.guests.notes_internal IS 'Internal staff notes about guest preferences, allergies, special requests, etc.';