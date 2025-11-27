-- Add subscription_start_date to profiles table for yearly renewal tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- Set existing users' subscription start date to their creation date or now
UPDATE profiles
SET subscription_start_date = COALESCE(created_at, NOW())
WHERE subscription_start_date IS NULL;
-- Add comment for documentation
COMMENT ON COLUMN profiles.subscription_start_date IS 'Date when the user''s current subscription period started, used for yearly renewal calculations';