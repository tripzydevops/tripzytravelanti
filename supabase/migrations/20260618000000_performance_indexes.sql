-- Create performance indexes for deals and engagement tracking
CREATE INDEX IF NOT EXISTS idx_deals_partner_status ON deals (partner_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals (category);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals (status);
CREATE INDEX IF NOT EXISTS idx_engagement_logs_user_event ON engagement_logs (user_id, event_type);
