-- Add missing foreign key constraint for assigned_to column
-- This enables PostgREST to resolve the join: assignee:profiles!service_requests_assigned_to_fkey(full_name)

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;