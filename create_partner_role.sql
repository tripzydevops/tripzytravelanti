-- Add role column to profiles if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'role'
) THEN
ALTER TABLE profiles
ADD COLUMN role VARCHAR(20) DEFAULT 'user';
END IF;
END $$;
-- Create partner_stats table
CREATE TABLE IF NOT EXISTS partner_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    total_views INTEGER DEFAULT 0,
    total_redemptions INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable RLS on partner_stats
ALTER TABLE partner_stats ENABLE ROW LEVEL SECURITY;
-- Policy: Partners can view their own stats
CREATE POLICY "Partners can view own stats" ON partner_stats FOR
SELECT USING (auth.uid() = partner_id);
-- Policy: System can update stats (for now, allow all authenticated to update if logic is in app, ideally restricted to service role)
-- For simplicity, we'll rely on app logic to update stats via RPC or service role, but for now allow read.
-- Update RLS on profiles to allow partners to see their own profile (already exists usually)
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_partner_stats_partner_id ON partner_stats(partner_id);