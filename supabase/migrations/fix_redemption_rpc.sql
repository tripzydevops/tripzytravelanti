-- Function to increment redemptions_count (used by redeemDeal)
CREATE OR REPLACE FUNCTION increment_redemptions_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE deals
  SET redemptions_count = COALESCE(redemptions_count, 0) + 1
  WHERE id = row_id;
END;
$$;

-- Function to increment deal redemption (used by redeemWalletItem/confirmRedemption)
-- Creating this as an alias/duplicate to ensure both calls work
CREATE OR REPLACE FUNCTION increment_deal_redemption(deal_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE deals
  SET redemptions_count = COALESCE(redemptions_count, 0) + 1
  WHERE id = deal_id_input;
END;
$$;

-- Ensure public access
GRANT EXECUTE ON FUNCTION increment_redemptions_count(UUID) TO public;
GRANT EXECUTE ON FUNCTION increment_redemptions_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_redemptions_count(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION increment_deal_redemption(UUID) TO public;
GRANT EXECUTE ON FUNCTION increment_deal_redemption(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_deal_redemption(UUID) TO service_role;
