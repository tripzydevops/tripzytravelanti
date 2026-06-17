-- Add columns for Global Redemption Limit
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS max_redemptions_total INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS redemptions_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT FALSE;
-- Function to maintain the redemptions_count AND is_sold_out status
CREATE OR REPLACE FUNCTION update_deal_redemption_count() RETURNS TRIGGER AS $$
DECLARE target_deal_id UUID;
deal_record RECORD;
BEGIN -- Determine deal_id based on operation
IF (TG_OP = 'INSERT') THEN target_deal_id := NEW.deal_id;
ELSIF (TG_OP = 'DELETE') THEN target_deal_id := OLD.deal_id;
END IF;
-- Update count
IF (TG_OP = 'INSERT') THEN
UPDATE deals
SET redemptions_count = redemptions_count + 1
WHERE id = target_deal_id;
ELSIF (TG_OP = 'DELETE') THEN
UPDATE deals
SET redemptions_count = GREATEST(0, redemptions_count - 1)
WHERE id = target_deal_id;
END IF;
-- Check and Update is_sold_out status
SELECT * INTO deal_record
FROM deals
WHERE id = target_deal_id;
IF deal_record.max_redemptions_total IS NOT NULL
AND deal_record.redemptions_count >= deal_record.max_redemptions_total THEN
UPDATE deals
SET is_sold_out = TRUE
WHERE id = target_deal_id;
ELSE
UPDATE deals
SET is_sold_out = FALSE
WHERE id = target_deal_id;
END IF;
RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger for Wallet Claims (user_deals)
DROP TRIGGER IF EXISTS tr_update_count_on_claim ON user_deals;
CREATE TRIGGER tr_update_count_on_claim
AFTER
INSERT
    OR DELETE ON user_deals FOR EACH ROW EXECUTE FUNCTION update_deal_redemption_count();
-- Trigger for Actual Redemptions (deal_redemptions)
DROP TRIGGER IF EXISTS tr_update_count_on_redeem ON deal_redemptions;
CREATE TRIGGER tr_update_count_on_redeem
AFTER
INSERT ON deal_redemptions FOR EACH ROW EXECUTE FUNCTION update_deal_redemption_count();
-- NEW: Trigger on DEALS table to handle Limit Updates (e.g. Admin increases limit)
CREATE OR REPLACE FUNCTION check_deal_limit_update() RETURNS TRIGGER AS $$ BEGIN -- If max_redemptions_total or redemptions_count changed
    IF (
        NEW.max_redemptions_total IS DISTINCT
        FROM OLD.max_redemptions_total
    )
    OR (
        NEW.redemptions_count IS DISTINCT
        FROM OLD.redemptions_count
    ) THEN IF NEW.max_redemptions_total IS NOT NULL
    AND NEW.redemptions_count >= NEW.max_redemptions_total THEN NEW.is_sold_out := TRUE;
ELSE NEW.is_sold_out := FALSE;
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS tr_check_limit_update ON deals;
CREATE TRIGGER tr_check_limit_update BEFORE
UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION check_deal_limit_update();
-- Backfill counts and status
DO $$
DECLARE r RECORD;
BEGIN FOR r IN
SELECT id
FROM deals LOOP -- Recalculate count
UPDATE deals
SET redemptions_count = (
        SELECT COUNT(*)
        FROM (
                SELECT deal_id
                FROM user_deals
                WHERE deal_id = r.id
                UNION ALL
                SELECT deal_id
                FROM deal_redemptions
                WHERE deal_id = r.id
            ) all_actions
    )
WHERE id = r.id;
-- Update sold_out status based on new count
UPDATE deals
SET is_sold_out = (
        max_redemptions_total IS NOT NULL
        AND redemptions_count >= max_redemptions_total
    )
WHERE id = r.id;
END LOOP;
END $$;