-- Fix Unindexed Foreign Keys
-- Adds a covering index for the user_id foreign key in the notifications table to improve performance.
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
-- Note on Unused Indexes:
-- The lint report shows many "Unused Indexes" on the deals table (created_at, category, etc.).
-- These are likely unused because the database doesn't have enough traffic or specific queries running yet.
-- It is recommended to KEEP these indexes as they will be critical for performance as the data grows 
-- and users start filtering deals by category, status, etc.