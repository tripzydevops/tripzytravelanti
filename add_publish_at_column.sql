ALTER TABLE deals
ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_deals_publish_at ON deals(publish_at);