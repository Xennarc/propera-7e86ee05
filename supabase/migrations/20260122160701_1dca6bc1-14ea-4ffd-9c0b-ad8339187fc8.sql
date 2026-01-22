-- =====================================================
-- MULTI-SELECT GUEST REQUESTS: Additive Schema Changes
-- =====================================================

-- 1) Create service_request_submissions table
-- Purpose: one guest submission that may produce one or more department-specific service_requests
CREATE TABLE public.service_request_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  room_number text NULL,
  is_asap boolean NOT NULL DEFAULT true,
  requested_for_at timestamptz NULL,
  guest_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_service_request_submissions_resort_guest_created 
  ON public.service_request_submissions(resort_id, guest_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.service_request_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_request_submissions
CREATE POLICY "Staff can view submissions for their resort"
  ON public.service_request_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_request_submissions.resort_id
        AND rm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Service role can manage submissions"
  ON public.service_request_submissions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');


-- 2) Add optional submission_id link to existing service_requests
ALTER TABLE public.service_requests 
  ADD COLUMN submission_id uuid NULL REFERENCES public.service_request_submissions(id) ON DELETE SET NULL;

-- Add index for submission lookups
CREATE INDEX idx_service_requests_resort_submission 
  ON public.service_requests(resort_id, submission_id) 
  WHERE submission_id IS NOT NULL;

-- Add submission_id to archive table
ALTER TABLE public.service_requests_archive 
  ADD COLUMN submission_id uuid NULL;

-- Add index for archived submission lookups
CREATE INDEX idx_service_requests_archive_resort_submission 
  ON public.service_requests_archive(resort_id, submission_id) 
  WHERE submission_id IS NOT NULL;


-- 3) Create service_request_items table (line items under a single department request)
CREATE TABLE public.service_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES public.resorts(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  catalog_id uuid NULL REFERENCES public.request_catalog(id) ON DELETE SET NULL,
  title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_service_request_items_resort_request 
  ON public.service_request_items(resort_id, request_id);

-- Enable RLS
ALTER TABLE public.service_request_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_request_items
CREATE POLICY "Staff can view items for their resort"
  ON public.service_request_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_request_items.resort_id
        AND rm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Service role can manage items"
  ON public.service_request_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');


-- 4) Create service_request_items_archive table
CREATE TABLE public.service_request_items_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL,
  request_archive_id uuid NOT NULL REFERENCES public.service_requests_archive(id) ON DELETE CASCADE,
  catalog_id uuid NULL,
  title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL
);

-- Index for efficient lookups
CREATE INDEX idx_service_request_items_archive_resort_request 
  ON public.service_request_items_archive(resort_id, request_archive_id);

-- Enable RLS
ALTER TABLE public.service_request_items_archive ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_request_items_archive
CREATE POLICY "Staff can view archived items for their resort"
  ON public.service_request_items_archive FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resort_memberships rm
      WHERE rm.resort_id = service_request_items_archive.resort_id
        AND rm.user_id = auth.uid()
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Service role can manage archived items"
  ON public.service_request_items_archive FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');


-- 5) BACKFILL: Create line items for existing single-item requests
-- This makes old and new requests render consistently in Staff UI detail drawers
INSERT INTO public.service_request_items (resort_id, request_id, catalog_id, title, quantity, created_at)
SELECT 
  sr.resort_id,
  sr.id AS request_id,
  sr.catalog_id,
  sr.title,
  COALESCE(sr.quantity, 1) AS quantity,
  sr.created_at
FROM public.service_requests sr
WHERE sr.catalog_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.service_request_items sri 
    WHERE sri.request_id = sr.id
  );