-- =============================================================================
-- Migration: Phase 3.6 – Engagement Analytics & Geofence Enforcement
-- File:      20260615000001_phase3_6_engagement_analytics_geofence.sql
-- Purpose:   1) engagement_logs table (referenced in code but unmigrated)
--            2) geofence_enforcement_mode column on profiles
--            3) partner_redemption_trends real-time view
--            4) expire_loyalty_points() SECURITY DEFINER function
--            5) coupon_codes auto-apply RLS policy
-- =============================================================================

-- ---------------------------------------------------------------------------
-- §1  ENGAGEMENT_LOGS TABLE
--     Central event-stream table that feeds the Autonomous Reasoning Engine
--     with raw user interaction signals (Layer 2 input).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.engagement_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type  TEXT        NOT NULL
                            CHECK (event_type IN (
                                'view', 'click', 'search', 'favorite',
                                'save', 'claim', 'redeem', 'rate'
                            )),
    item_id     TEXT,                                       -- polymorphic FK (deal, partner, category …)
    metadata    JSONB       DEFAULT '{}'::jsonb,             -- flexible payload (duration_ms, query_text, rating, …)
    created_at  TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.engagement_logs IS
    'Buffered user interaction signals consumed by the recommendation engine and analytics views.';

-- Composite index: fast look-ups when scoring a single user's recent behaviour
CREATE INDEX IF NOT EXISTS idx_engagement_logs_user_event_time
    ON public.engagement_logs (user_id, event_type, created_at);

-- Item-centric index: partner analytics dashboards & the redemption-trends view
CREATE INDEX IF NOT EXISTS idx_engagement_logs_item_event
    ON public.engagement_logs (item_id, event_type);

-- RLS -----------------------------------------------------------------------
ALTER TABLE public.engagement_logs ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "Admins can do everything on engagement_logs" ON public.engagement_logs;
CREATE POLICY "Admins can do everything on engagement_logs" ON public.engagement_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

-- Users can INSERT their own events (signal collection from frontend)
DROP POLICY IF EXISTS "Users can insert own engagement_logs" ON public.engagement_logs;
CREATE POLICY "Users can insert own engagement_logs" ON public.engagement_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can SELECT their own events (activity history, cold-start self-analysis)
DROP POLICY IF EXISTS "Users can view own engagement_logs" ON public.engagement_logs;
CREATE POLICY "Users can view own engagement_logs" ON public.engagement_logs
    FOR SELECT USING (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- §2  GEOFENCE ENFORCEMENT MODE ON PROFILES
--     Admin-configurable per vendor/partner.
--     • 'off'          – geofencing disabled (default, zero-friction onboarding)
--     • 'soft_warning'  – warn user but allow redemption outside zone
--     • 'hard_block'    – block redemption if geo check fails
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS geofence_enforcement_mode TEXT
        DEFAULT 'off'
        CHECK (geofence_enforcement_mode IN ('off', 'soft_warning', 'hard_block'));

COMMENT ON COLUMN public.profiles.geofence_enforcement_mode IS
    'Controls how the QR / coupon redemption flow responds when a user is outside the geofence zone.';


-- ---------------------------------------------------------------------------
-- §3  PARTNER REDEMPTION TRENDS (real-time view)
--     Non-materialized so it always reflects live data; used by the
--     Partner Panel dashboard for 30-day / 60-day trend comparisons.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.partner_redemption_trends AS
SELECT
    d.partner_id,

    -- Redemption counts: current 30-day window vs. previous 30-day window
    COUNT(DISTINCT CASE
        WHEN dr.redeemed_at >= NOW() - INTERVAL '30 days'
        THEN dr.id
    END) AS redemptions_last_30,

    COUNT(DISTINCT CASE
        WHEN dr.redeemed_at >= NOW() - INTERVAL '60 days'
         AND dr.redeemed_at <  NOW() - INTERVAL '30 days'
        THEN dr.id
    END) AS redemptions_prev_30,

    -- Engagement (view) counts: same two windows
    COUNT(DISTINCT CASE
        WHEN el.created_at >= NOW() - INTERVAL '30 days'
         AND el.event_type = 'view'
        THEN el.id
    END) AS views_last_30,

    COUNT(DISTINCT CASE
        WHEN el.created_at >= NOW() - INTERVAL '60 days'
         AND el.created_at <  NOW() - INTERVAL '30 days'
         AND el.event_type = 'view'
        THEN el.id
    END) AS views_prev_30

FROM public.deals d
LEFT JOIN public.deal_redemptions dr ON dr.deal_id = d.id
LEFT JOIN public.engagement_logs  el ON el.item_id  = d.id::text
WHERE d.partner_id IS NOT NULL
GROUP BY d.partner_id;

COMMENT ON VIEW public.partner_redemption_trends IS
    'Live 30/60-day trend comparison of redemptions and page views per partner.';


-- ---------------------------------------------------------------------------
-- §4  EXPIRE LOYALTY POINTS – SECURITY DEFINER FUNCTION
--     Designed to be called by pg_cron (or an Edge Function) on a schedule.
--     • Finds earn_* transactions whose expires_at has passed
--     • Skips rows already offset by a matching 'expire' transaction
--     • Uses FOR UPDATE SKIP LOCKED → safe for concurrent / overlapping runs
--     • Decrements profiles.points cached balance per user
--     • Returns total number of transactions expired in this invocation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.expire_loyalty_points()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public          -- pin search_path to prevent privilege escalation
AS $$
DECLARE
    rec                RECORD;
    v_expired_count    INTEGER := 0;
    v_current_points   INTEGER;
    v_new_balance      INTEGER;
BEGIN
    -- Iterate over every unexpired earn-type transaction that has now lapsed.
    -- FOR UPDATE SKIP LOCKED ensures two overlapping cron runs don't double-process.
    FOR rec IN
        SELECT lt.id,
               lt.user_id,
               lt.amount,        -- positive value (the original earn)
               lt.reference_id
        FROM public.loyalty_transactions lt
        WHERE lt.type LIKE 'earn_%'                              -- only positive (earn) rows
          AND lt.expires_at IS NOT NULL
          AND lt.expires_at < NOW()                              -- past expiry deadline
          AND NOT EXISTS (                                       -- no offsetting expire row yet
                SELECT 1
                FROM public.loyalty_transactions lt2
                WHERE lt2.type         = 'expire'
                  AND lt2.reference_id = lt.id                   -- links back to the original earn
          )
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Fetch the user's current cached balance
        SELECT COALESCE(points, 0)
        INTO v_current_points
        FROM public.profiles
        WHERE id = rec.user_id;

        -- Compute new balance (floor at zero to prevent negative drift)
        v_new_balance := GREATEST(v_current_points - rec.amount, 0);

        -- Insert the offsetting negative ledger entry
        INSERT INTO public.loyalty_transactions (
            user_id, type, amount, running_balance,
            reference_type, reference_id, metadata, created_at
        ) VALUES (
            rec.user_id,
            'expire',
            -rec.amount,                                         -- negative to offset the earn
            v_new_balance,
            'loyalty_transaction',
            rec.id,                                              -- points back to the original earn row
            jsonb_build_object(
                'reason',          'ttl_expiry',
                'original_earn_id', rec.id,
                'expired_amount',   rec.amount
            ),
            now()
        );

        -- Update the user's cached point balance
        UPDATE public.profiles
        SET points     = v_new_balance,
            updated_at = now()
        WHERE id = rec.user_id;

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.expire_loyalty_points() IS
    'Cron-safe function that creates offsetting "expire" ledger entries for earn transactions past their TTL.';


-- ---------------------------------------------------------------------------
-- §5  COUPON CODES – AUTO-APPLY RLS POLICY
--     Allows any authenticated user to discover active, unassigned coupon codes
--     so the frontend can auto-apply them at checkout without requiring the
--     user to manually enter a code.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view active coupon codes for deals" ON public.coupon_codes;
CREATE POLICY "Users can view active coupon codes for deals" ON public.coupon_codes
    FOR SELECT
    USING (status = 'active' AND assigned_to IS NULL);


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
