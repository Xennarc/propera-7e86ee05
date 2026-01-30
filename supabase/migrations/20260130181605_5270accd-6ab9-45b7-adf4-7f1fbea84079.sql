-- ============================================================================
-- PHASE 2A: Add TRANSPORT role to resort_role enum
-- Must be committed before using in functions
-- ============================================================================

ALTER TYPE public.resort_role ADD VALUE IF NOT EXISTS 'TRANSPORT';