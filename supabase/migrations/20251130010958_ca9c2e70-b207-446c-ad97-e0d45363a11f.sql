-- Add status enum type for resorts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resort_status') THEN
    CREATE TYPE resort_status AS ENUM ('ACTIVE', 'INACTIVE', 'DEMO');
  END IF;
END $$;

-- Add status column to resorts table
ALTER TABLE public.resorts 
ADD COLUMN IF NOT EXISTS status resort_status NOT NULL DEFAULT 'ACTIVE';

-- Create index for faster lookups by code
CREATE INDEX IF NOT EXISTS idx_resorts_code ON public.resorts(code);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_resorts_status ON public.resorts(status);