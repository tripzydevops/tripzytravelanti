-- Migration: Phase 1 Cross-Platform Foundation
-- Description: Sets up compatibility schema for Tripzy ↔ QR Menu SaaS, loyalty transaction ledger, coupon system, PostGIS, geofencing, dynamic QR support, and security audits.

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;

-- 2. Create external_user_mappings table
CREATE TABLE IF NOT EXISTS public.external_user_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    external_platform TEXT NOT NULL,
    external_user_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, external_platform),
    UNIQUE(external_platform, external_user_id)
);

-- RLS for external_user_mappings
ALTER TABLE public.external_user_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on external_user_mappings" ON public.external_user_mappings;
CREATE POLICY "Admins can do everything on external_user_mappings" ON public.external_user_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Users can manage own external_user_mappings" ON public.external_user_mappings;
CREATE POLICY "Users can manage own external_user_mappings" ON public.external_user_mappings
    FOR ALL USING (auth.uid() = user_id);

-- 3. Create loyalty_transactions table (ledger)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'earn_redemption',    -- +points for redeeming a deal
        'earn_referral',      -- +points for referral
        'earn_streak',        -- +points for daily/weekly streak
        'earn_campaign',      -- +points from bonus campaign
        'burn_reward',        -- -points for redeeming reward
        'burn_coupon',        -- -points for generating coupon
        'expire',             -- -points on TTL expiry
        'adjust_admin',       -- ±points by admin
        'transfer_out',       -- -points sent to another user
        'transfer_in'         -- +points received from another user
    )),
    amount INTEGER NOT NULL,
    running_balance INTEGER NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for loyalty_transactions
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created ON public.loyalty_transactions(created_at);

-- RLS for loyalty_transactions
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "Admins can do everything on loyalty_transactions" ON public.loyalty_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Users can view own loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can view own loyalty_transactions" ON public.loyalty_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Create loyalty_rewards table
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_tr TEXT NOT NULL,
    description TEXT,
    description_tr TEXT,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    reward_type TEXT NOT NULL CHECK (reward_type IN ('deal_unlock', 'subscription_upgrade', 'custom_voucher')),
    reward_data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for loyalty_rewards
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on loyalty_rewards" ON public.loyalty_rewards;
CREATE POLICY "Admins can do everything on loyalty_rewards" ON public.loyalty_rewards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Anyone can view active loyalty_rewards" ON public.loyalty_rewards;
CREATE POLICY "Anyone can view active loyalty_rewards" ON public.loyalty_rewards
    FOR SELECT USING (is_active = true);

-- 5. Create coupon_campaigns table
CREATE TABLE IF NOT EXISTS public.coupon_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_gift', 'bogo')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    max_discount_amount NUMERIC,
    min_subtotal NUMERIC DEFAULT 0.00,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    max_per_user INTEGER DEFAULT 1,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    stacking_rules JSONB DEFAULT '{"stackable": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for coupon_campaigns
ALTER TABLE public.coupon_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on coupon_campaigns" ON public.coupon_campaigns;
CREATE POLICY "Admins can do everything on coupon_campaigns" ON public.coupon_campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Partners can manage own coupon_campaigns" ON public.coupon_campaigns;
CREATE POLICY "Partners can manage own coupon_campaigns" ON public.coupon_campaigns
    FOR ALL USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Users can view active coupon_campaigns" ON public.coupon_campaigns;
CREATE POLICY "Users can view active coupon_campaigns" ON public.coupon_campaigns
    FOR SELECT USING (is_active = true);

-- 6. Create coupon_codes table
CREATE TABLE IF NOT EXISTS public.coupon_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.coupon_campaigns(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'revoked')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    redeemed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for coupon_codes
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on coupon_codes" ON public.coupon_codes;
CREATE POLICY "Admins can do everything on coupon_codes" ON public.coupon_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Partners can view and manage their campaign codes" ON public.coupon_codes;
CREATE POLICY "Partners can view and manage their campaign codes" ON public.coupon_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.coupon_campaigns
            WHERE id = campaign_id AND partner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own assigned coupon codes" ON public.coupon_codes;
CREATE POLICY "Users can view own assigned coupon codes" ON public.coupon_codes
    FOR SELECT USING (assigned_to = auth.uid());

-- 7. Create qr_tokens table (for rotating/dynamic codes)
CREATE TABLE IF NOT EXISTS public.qr_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_item_id UUID REFERENCES public.wallet_items(id) ON DELETE CASCADE NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    ip_address TEXT,
    device_info TEXT
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_wallet ON public.qr_tokens(wallet_item_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_hash ON public.qr_tokens(token_hash);

-- RLS for qr_tokens
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on qr_tokens" ON public.qr_tokens;
CREATE POLICY "Admins can do everything on qr_tokens" ON public.qr_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Users can view own qr_tokens" ON public.qr_tokens;
CREATE POLICY "Users can view own qr_tokens" ON public.qr_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wallet_items
            WHERE id = wallet_item_id AND user_id = auth.uid()
        )
    );

-- 8. Create qr_scan_events table (security & verification logs)
CREATE TABLE IF NOT EXISTS public.qr_scan_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_item_id UUID REFERENCES public.wallet_items(id) ON DELETE SET NULL,
    qr_token_id UUID REFERENCES public.qr_tokens(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scan_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    scan_latitude DOUBLE PRECISION,
    scan_longitude DOUBLE PRECISION,
    scan_method TEXT CHECK (scan_method IN ('qr_scan', 'manual_code', 'nfc', 'geo_auto')),
    scan_result TEXT NOT NULL CHECK (scan_result IN ('success', 'invalid_code', 'expired_token', 'already_redeemed', 'geo_mismatch', 'rate_limited')),
    raw_scanned_payload TEXT,
    ip_address TEXT,
    device_info TEXT
);

-- RLS for qr_scan_events
ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on qr_scan_events" ON public.qr_scan_events;
CREATE POLICY "Admins can do everything on qr_scan_events" ON public.qr_scan_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Partners can view their own scan events" ON public.qr_scan_events;
CREATE POLICY "Partners can view their own scan events" ON public.qr_scan_events
    FOR SELECT USING (vendor_id = auth.uid());

-- 9. Create geofence_zones table
CREATE TABLE IF NOT EXISTS public.geofence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    zone GEOGRAPHY(POLYGON, 4326),
    radius_meters INTEGER,
    centroid GEOGRAPHY(POINT, 4326),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for PostGIS geometry/geography performance
CREATE INDEX IF NOT EXISTS idx_geofence_zones_zone ON public.geofence_zones USING GIST(zone);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_centroid ON public.geofence_zones USING GIST(centroid);

-- RLS for geofence_zones
ALTER TABLE public.geofence_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on geofence_zones" ON public.geofence_zones;
CREATE POLICY "Admins can do everything on geofence_zones" ON public.geofence_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Partners can manage own geofence_zones" ON public.geofence_zones;
CREATE POLICY "Partners can manage own geofence_zones" ON public.geofence_zones
    FOR ALL USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view active geofence_zones" ON public.geofence_zones;
CREATE POLICY "Anyone can view active geofence_zones" ON public.geofence_zones
    FOR SELECT USING (is_active = true);

-- 10. Create geo_validation_events table
CREATE TABLE IF NOT EXISTS public.geo_validation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    geofence_zone_id UUID REFERENCES public.geofence_zones(id) ON DELETE SET NULL,
    user_latitude DOUBLE PRECISION NOT NULL,
    user_longitude DOUBLE PRECISION NOT NULL,
    distance_meters DOUBLE PRECISION,
    is_within_bounds BOOLEAN NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for geo_validation_events
ALTER TABLE public.geo_validation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on geo_validation_events" ON public.geo_validation_events;
CREATE POLICY "Admins can do everything on geo_validation_events" ON public.geo_validation_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

DROP POLICY IF EXISTS "Users can view own geo_validation_events" ON public.geo_validation_events;
CREATE POLICY "Users can view own geo_validation_events" ON public.geo_validation_events
    FOR SELECT USING (user_id = auth.uid());

-- 11. Create fraud_signals table
CREATE TABLE IF NOT EXISTS public.fraud_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    wallet_item_id UUID REFERENCES public.wallet_items(id) ON DELETE SET NULL,
    signal_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for fraud_signals
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on fraud_signals" ON public.fraud_signals;
CREATE POLICY "Admins can do everything on fraud_signals" ON public.fraud_signals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
    );

-- 12. Add columns to wallet_items
ALTER TABLE public.wallet_items 
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS qr_token_id UUID,
    ADD COLUMN IF NOT EXISTS claimed_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS claimed_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS coupon_code_id UUID REFERENCES public.coupon_codes(id) ON DELETE SET NULL;

-- 13. Add columns to deal_redemptions
ALTER TABLE public.deal_redemptions
    ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'qr_scan',
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS location JSONB,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'revoked', 'disputed')),
    ADD COLUMN IF NOT EXISTS coupon_code_id UUID REFERENCES public.coupon_codes(id) ON DELETE SET NULL;

-- 14. Add columns to redemption_logs
ALTER TABLE public.redemption_logs
    ADD COLUMN IF NOT EXISTS scan_method TEXT,
    ADD COLUMN IF NOT EXISTS scan_result TEXT,
    ADD COLUMN IF NOT EXISTS scan_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS scan_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS vendor_device_id TEXT;

-- 15. Add columns to partner_stats
ALTER TABLE public.partner_stats
    ADD COLUMN IF NOT EXISTS redemptions_by_deal JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS revenue_total NUMERIC DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ;

-- 16. Fix RLS on redemption_logs (lock down INSERT)
DROP POLICY IF EXISTS "Service insert redemption logs" ON public.redemption_logs;
CREATE POLICY "Secure vendor insert redemption logs" ON public.redemption_logs
    FOR INSERT WITH CHECK (
        -- Can only insert if logged-in user is a vendor/partner/admin AND matching vendor_id matches user
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() 
              AND (role IN ('vendor', 'partner', 'admin') OR is_admin = true)
        )
        AND vendor_id = auth.uid()
    );

-- 17. Security Definer Function to securely generate redemption codes on the server
CREATE OR REPLACE FUNCTION public.secure_generate_redemption_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No confusing characters (I, O, 0, 1)
    result TEXT := '';
    i INTEGER;
    loop_count INTEGER := 0;
    code_exists BOOLEAN;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check unique constraint on wallet_items
        SELECT EXISTS(SELECT 1 FROM public.wallet_items WHERE redemption_code = result) INTO code_exists;
        IF NOT code_exists THEN
            RETURN result;
        END IF;
        
        loop_count := loop_count + 1;
        IF loop_count > 100 THEN
            RAISE EXCEPTION 'Failed to generate unique redemption code after 100 attempts';
        END IF;
    END LOOP;
END;
$$;

-- 18. Security Definer Function to securely earn points with ledger entry
CREATE OR REPLACE FUNCTION public.secure_earn_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INTEGER := 0;
    v_running_balance INTEGER := 0;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Earn amount must be positive';
    END IF;

    -- Get current points
    SELECT COALESCE(points, 0) INTO v_current_points
    FROM public.profiles
    WHERE id = p_user_id;

    v_running_balance := v_current_points + p_amount;

    -- Update profile cached count
    UPDATE public.profiles
    SET points = v_running_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- Insert ledger entry
    INSERT INTO public.loyalty_transactions (
        user_id, type, amount, running_balance, 
        reference_type, reference_id, expires_at, metadata, created_at
    ) VALUES (
        p_user_id, p_type, p_amount, v_running_balance,
        p_reference_type, p_reference_id, p_expires_at, p_metadata, now()
    );

    RETURN v_running_balance;
END;
$$;

-- 19. Security Definer Function to securely burn points with ledger entry
CREATE OR REPLACE FUNCTION public.secure_burn_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_points INTEGER := 0;
    v_running_balance INTEGER := 0;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Burn amount must be positive';
    END IF;

    -- Get current points
    SELECT COALESCE(points, 0) INTO v_current_points
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_current_points < p_amount THEN
        RAISE EXCEPTION 'Insufficient points balance';
    END IF;

    v_running_balance := v_current_points - p_amount;

    -- Update profile cached count
    UPDATE public.profiles
    SET points = v_running_balance,
        updated_at = now()
    WHERE id = p_user_id;

    -- Insert ledger entry (amount recorded as negative for burning)
    INSERT INTO public.loyalty_transactions (
        user_id, type, amount, running_balance, 
        reference_type, reference_id, metadata, created_at
    ) VALUES (
        p_user_id, p_type, -p_amount, v_running_balance,
        p_reference_type, p_reference_id, p_metadata, now()
    );

    RETURN v_running_balance;
END;
$$;
