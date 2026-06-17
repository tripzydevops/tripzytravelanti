-- Secure Redemption System - Database Migration
-- Run this in your Supabase SQL Editor
-- 1. Add requires_confirmation column to deals
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS requires_confirmation BOOLEAN DEFAULT FALSE;
-- 2. Add fcm_token column to profiles (for push notifications)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS fcm_token TEXT;
-- 3. Create wallet_items table
CREATE TABLE IF NOT EXISTS wallet_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    redemption_code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
    confirmation_token UUID,
    confirmation_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ,
    UNIQUE(user_id, deal_id)
);
-- 4. Create redemption_logs table for audit
CREATE TABLE IF NOT EXISTS redemption_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_item_id UUID REFERENCES wallet_items(id) ON DELETE
    SET NULL,
        user_id UUID REFERENCES profiles(id) ON DELETE
    SET NULL,
        deal_id UUID REFERENCES deals(id) ON DELETE
    SET NULL,
        vendor_id UUID REFERENCES profiles(id) ON DELETE
    SET NULL,
        redeemed_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address TEXT,
        device_info TEXT
);
-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_items_user_id ON wallet_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_items_deal_id ON wallet_items(deal_id);
CREATE INDEX IF NOT EXISTS idx_wallet_items_status ON wallet_items(status);
CREATE INDEX IF NOT EXISTS idx_wallet_items_redemption_code ON wallet_items(redemption_code);
CREATE INDEX IF NOT EXISTS idx_redemption_logs_user_id ON redemption_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_logs_deal_id ON redemption_logs(deal_id);
-- 6. RLS Policies for wallet_items
ALTER TABLE wallet_items ENABLE ROW LEVEL SECURITY;
-- Users can view their own wallet items
DROP POLICY IF EXISTS "Users view own wallet items" ON wallet_items;
CREATE POLICY "Users view own wallet items" ON wallet_items FOR
SELECT USING (auth.uid() = user_id);
-- Users can insert their own wallet items
DROP POLICY IF EXISTS "Users insert own wallet items" ON wallet_items;
CREATE POLICY "Users insert own wallet items" ON wallet_items FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Users can update their own wallet items (for status changes)
DROP POLICY IF EXISTS "Users update own wallet items" ON wallet_items;
CREATE POLICY "Users update own wallet items" ON wallet_items FOR
UPDATE USING (auth.uid() = user_id);
-- Partners can update wallet items (for redemption)
DROP POLICY IF EXISTS "Partners can redeem wallet items" ON wallet_items;
CREATE POLICY "Partners can redeem wallet items" ON wallet_items FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND (
                    role = 'partner'
                    OR role = 'admin'
                    OR is_admin = true
                )
        )
    );
-- 7. RLS Policies for redemption_logs
ALTER TABLE redemption_logs ENABLE ROW LEVEL SECURITY;
-- Users can view their own redemption logs
DROP POLICY IF EXISTS "Users view own redemption logs" ON redemption_logs;
CREATE POLICY "Users view own redemption logs" ON redemption_logs FOR
SELECT USING (auth.uid() = user_id);
-- Partners can view logs for their redemptions
DROP POLICY IF EXISTS "Partners view redemption logs" ON redemption_logs;
CREATE POLICY "Partners view redemption logs" ON redemption_logs FOR
SELECT USING (auth.uid() = vendor_id);
-- System can insert (via service role)
DROP POLICY IF EXISTS "Service insert redemption logs" ON redemption_logs;
CREATE POLICY "Service insert redemption logs" ON redemption_logs FOR
INSERT WITH CHECK (true);
-- Grant permissions
GRANT ALL ON wallet_items TO authenticated;
GRANT ALL ON wallet_items TO service_role;
GRANT ALL ON redemption_logs TO authenticated;
GRANT ALL ON redemption_logs TO service_role;
-- 8. RPC Function to atomically increment deal redemption count
CREATE OR REPLACE FUNCTION increment_deal_redemption(deal_id_input UUID) RETURNS void AS $$ BEGIN
UPDATE deals
SET redemptions_count = COALESCE(redemptions_count, 0) + 1
WHERE id = deal_id_input;
-- Check if sold out
UPDATE deals
SET is_sold_out = true
WHERE id = deal_id_input
    AND max_redemptions_total IS NOT NULL
    AND redemptions_count >= max_redemptions_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;