-- Secure Redemption Function
-- This function allows a vendor to redeem a user's wallet item if the code matches.

CREATE OR REPLACE FUNCTION validate_redemption(
    p_wallet_item_id uuid,
    p_redemption_code text,
    p_vendor_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
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
    
    -- Optional: Check if Vendor owns the deal? 
    -- For now, we allow any valid vendor/admin to scan any valid code.
    -- Strict mode: IF v_deal.partner_id != p_vendor_id AND NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_vendor_id AND is_admin = true) THEN ...

    -- 5. Mark as Redeemed
    UPDATE wallet_items
    SET 
        status = 'redeemed',
        redeemed_at = now()
    WHERE id = p_wallet_item_id;

    -- 6. Log Redemption
    INSERT INTO redemption_logs (wallet_item_id, user_id, deal_id, vendor_id, redeemed_at)
    VALUES (p_wallet_item_id, v_wallet_item.user_id, v_wallet_item.deal_id, p_vendor_id, now());

    -- 7. Increment Stats
    UPDATE deals
    SET redemptions_count = COALESCE(redemptions_count, 0) + 1
    WHERE id = v_wallet_item.deal_id;

    -- Update Partner Stats
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
