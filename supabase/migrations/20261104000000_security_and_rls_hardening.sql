-- =====================================================
-- Migration: 20261104000000_security_and_rls_hardening.sql
-- Description: Security and RLS Hardening for Lottery Tickets and Deal Redemption
-- =====================================================

-- 1. Hardened RLS Policy on lottery_tickets
-- Prevents authenticated users from forging winning status or bypassing verification methods
DROP POLICY IF EXISTS "Users insert own tickets" ON public.lottery_tickets;

CREATE POLICY "Users insert own tickets" ON public.lottery_tickets
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND is_winner = false
        AND verification_method IN ('webhook_tag', 'story_canvas', 'referral_click', 'ocr_screenshot', 'points_exchange')
    );

-- 2. Tightened validate_redemption Function with strict vendor authorization
CREATE OR REPLACE FUNCTION validate_redemption(
    p_wallet_item_id uuid,
    p_redemption_code text,
    p_vendor_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_item record;
    v_deal record;
    v_result json;
BEGIN
    -- 1. Fetch Wallet Item
    SELECT * INTO v_wallet_item
    FROM wallet_items
    WHERE id = p_wallet_item_id;

    IF v_wallet_item IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Invalid wallet item');
    END IF;

    -- 2. Validate Code
    IF v_wallet_item.redemption_code != p_redemption_code THEN
        RETURN json_build_object('success', false, 'message', 'Invalid redemption code');
    END IF;

    -- 3. Check Status
    IF v_wallet_item.status = 'redeemed' THEN
        RETURN json_build_object('success', false, 'message', 'This deal has already been redeemed');
    END IF;

    IF v_wallet_item.status = 'expired' THEN
        RETURN json_build_object('success', false, 'message', 'This deal has expired');
    END IF;

    -- 4. Fetch Deal Info
    SELECT * INTO v_deal
    FROM deals
    WHERE id = v_wallet_item.deal_id;

    IF v_deal IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Associated deal not found');
    END IF;

    -- 5. Strict Vendor Authorization:
    -- Verify that the scanning vendor actually owns this deal, unless they are a system admin
    IF v_deal.partner_id IS NOT NULL AND v_deal.partner_id != p_vendor_id THEN
        IF NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = p_vendor_id AND (is_admin = true OR role = 'admin')
        ) THEN
            RETURN json_build_object(
                'success', false, 
                'message', 'Unauthorized: You do not have permission to redeem deals on behalf of another merchant.'
            );
        END IF;
    END IF;

    -- 6. Mark as Redeemed
    UPDATE wallet_items
    SET 
        status = 'redeemed',
        redeemed_at = now()
    WHERE id = p_wallet_item_id;

    -- 7. Log Redemption
    INSERT INTO redemption_logs (wallet_item_id, user_id, deal_id, vendor_id, redeemed_at)
    VALUES (p_wallet_item_id, v_wallet_item.user_id, v_wallet_item.deal_id, p_vendor_id, now());

    -- 8. Increment Deal Stats
    UPDATE deals
    SET redemptions_count = COALESCE(redemptions_count, 0) + 1
    WHERE id = v_wallet_item.deal_id;

    -- 9. Update Partner Stats
    IF v_deal.partner_id IS NOT NULL THEN
        INSERT INTO partner_stats (partner_id, total_redemptions, updated_at)
        VALUES (v_deal.partner_id, 1, now())
        ON CONFLICT (partner_id) 
        DO UPDATE SET total_redemptions = partner_stats.total_redemptions + 1, updated_at = now();
    END IF;

    RETURN json_build_object(
        'success', true, 
        'message', 'Deal redeemed successfully!',
        'dealInfo', json_build_object('title', v_deal.title, 'originalPrice', v_deal.original_price, 'discountedPrice', v_deal.discounted_price)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
