-- =============================================================================
-- Migration: Update engagement_logs check constraint for implicit signals
-- File:      20260810000000_update_engagement_logs_implicit_signals.sql
-- Purpose:   1) Allow implicit event types ('dwell', 'scroll', 'hover') in engagement_logs
--            2) Add performance index for SGD trainer log lookups
-- =============================================================================

-- Drop existing check constraint if present
ALTER TABLE public.engagement_logs
    DROP CONSTRAINT IF EXISTS engagement_logs_event_type_check;

-- Re-create check constraint with implicit signal types included
ALTER TABLE public.engagement_logs
    ADD CONSTRAINT engagement_logs_event_type_check
    CHECK (event_type IN (
        'view', 'click', 'search', 'favorite',
        'save', 'claim', 'redeem', 'rate',
        'dwell', 'scroll', 'hover'
    ));

COMMENT ON CONSTRAINT engagement_logs_event_type_check ON public.engagement_logs IS
    'Allows explicit (view, click, save, redeem) and high-frequency implicit (dwell, scroll, hover) telemetry event types.';

-- Add index on event_type for fast SGD training matrix construction
CREATE INDEX IF NOT EXISTS idx_engagement_logs_event_type
    ON public.engagement_logs (event_type);

-- Enable Row-Level Security on Latent Factor Tables (Security Vulnerability Fix)
ALTER TABLE public.user_latent_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_latent_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implicit_latent_factors ENABLE ROW LEVEL SECURITY;

-- Select Policies for Latent Factor Tables
DROP POLICY IF EXISTS "Allow users to read their own latent factors" ON public.user_latent_factors;
CREATE POLICY "Allow users to read their own latent factors"
ON public.user_latent_factors FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated users to read deal latent factors" ON public.deal_latent_factors;
CREATE POLICY "Allow authenticated users to read deal latent factors"
ON public.deal_latent_factors FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to read implicit latent factors" ON public.implicit_latent_factors;
CREATE POLICY "Allow authenticated users to read implicit latent factors"
ON public.implicit_latent_factors FOR SELECT
TO authenticated
USING (true);
