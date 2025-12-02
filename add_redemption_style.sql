ALTER TABLE deals
ADD COLUMN IF NOT EXISTS redemption_style TEXT CHECK (redemption_style IN ('online', 'in_store'));
CREATE INDEX IF NOT EXISTS idx_deals_redemption_style ON deals(redemption_style);