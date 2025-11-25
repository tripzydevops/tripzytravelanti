-- =====================================================
-- TRIPZY Database Schema for Supabase
-- =====================================================
-- This schema supports the TRIPZY travel deals app
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Subscription Tiers Table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  redemptions_per_month INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]',
  features_tr JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'FREE' REFERENCES subscription_tiers(id),
  is_admin BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  referred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  extra_redemptions INTEGER DEFAULT 0,
  notification_preferences JSONB DEFAULT '{"newDeals": true, "expiringDeals": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals Table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  usage_limit TEXT,
  usage_limit_tr TEXT,
  validity TEXT,
  validity_tr TEXT,
  terms_url TEXT,
  redemption_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Deals Table (User Bookmarks)
CREATE TABLE IF NOT EXISTS saved_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deal_id)
);

-- Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Deal Redemptions Table
CREATE TABLE IF NOT EXISTS deal_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_deals_required_tier ON deals(required_tier);
CREATE INDEX IF NOT EXISTS idx_deals_expires_at ON deals(expires_at);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_saved_deals_user_id ON saved_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_deals_deal_id ON saved_deals(deal_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_deal_redemptions_user_id ON deal_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_redemptions_deal_id ON deal_redemptions(deal_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_tiers_updated_at BEFORE UPDATE ON subscription_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Deals Policies
CREATE POLICY "Deals are viewable by everyone"
  ON deals FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert deals"
  ON deals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can update deals"
  ON deals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

CREATE POLICY "Only admins can delete deals"
  ON deals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Saved Deals Policies
CREATE POLICY "Users can view own saved deals"
  ON saved_deals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved deals"
  ON saved_deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved deals"
  ON saved_deals FOR DELETE
  USING (auth.uid() = user_id);

-- Referrals Policies
CREATE POLICY "Users can view referrals they're involved in"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- Deal Redemptions Policies
CREATE POLICY "Users can view own redemptions"
  ON deal_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own redemptions"
  ON deal_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Subscription Tiers Policies
CREATE POLICY "Subscription tiers are viewable by everyone"
  ON subscription_tiers FOR SELECT
  USING (true);

-- =====================================================
-- SEED DATA - Subscription Tiers
-- =====================================================

INSERT INTO subscription_tiers (id, name, name_tr, price, redemptions_per_month, features, features_tr)
VALUES
  ('FREE', 'Free', 'Ücretsiz', 0, 3, 
   '["Access to select local deals", "Personalized deal alerts", "Basic support"]',
   '["Seçili yerel fırsatlara erişim", "Kişiselleştirilmiş fırsat uyarıları", "Temel destek"]'),
  ('BASIC', 'Basic', 'Temel', 9.99, 10,
   '["Access to local dining deals", "Weekly newsletter", "Standard support"]',
   '["Yerel yemek fırsatlarına erişim", "Haftalık bülten", "Standart destek"]'),
  ('PREMIUM', 'Premium', 'Premium', 19.99, 30,
   '["All Basic features", "Exclusive travel deals", "Early access to new deals", "Priority support"]',
   '["Tüm Temel özellikler", "Özel seyahat fırsatları", "Yeni fırsatlara erken erişim", "Öncelikli destek"]'),
  ('VIP', 'VIP', 'VIP', 49.99, 999999,
   '["All Premium features", "AI-powered trip planning", "Concierge service", "Partner event invitations"]',
   '["Tüm Premium özellikler", "Yapay zeka destekli gezi planlama", "Konsiyerj hizmeti", "Partner etkinlik davetiyeleri"]')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to get user's referral network (all descendants)
CREATE OR REPLACE FUNCTION get_referral_network(user_uuid UUID)
RETURNS TABLE(referred_user_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE referral_tree AS (
    -- Base case: direct referrals
    SELECT referred_id
    FROM referrals
    WHERE referrer_id = user_uuid
    
    UNION
    
    -- Recursive case: referrals of referrals
    SELECT r.referred_id
    FROM referrals r
    INNER JOIN referral_tree rt ON r.referrer_id = rt.referred_id
  )
  SELECT * FROM referral_tree;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's referral chain (all ancestors)
CREATE OR REPLACE FUNCTION get_referral_chain(user_uuid UUID)
RETURNS TABLE(referrer_user_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE referral_chain AS (
    -- Base case: direct referrer
    SELECT referred_by
    FROM profiles
    WHERE id = user_uuid AND referred_by IS NOT NULL
    
    UNION
    
    -- Recursive case: referrer's referrer
    SELECT p.referred_by
    FROM profiles p
    INNER JOIN referral_chain rc ON p.id = rc.referred_by
    WHERE p.referred_by IS NOT NULL
  )
  SELECT * FROM referral_chain;
END;
$$ LANGUAGE plpgsql;
