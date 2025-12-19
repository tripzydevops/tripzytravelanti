-- Cleaned TRIPZY Database Schema for Supabase (single-pass)
-- =====================================================
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =====================================================
-- TABLES
-- =====================================================
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
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  description_tr TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  category_tr TEXT NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discounted_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5, 2),
  required_tier TEXT NOT NULL DEFAULT 'FREE' REFERENCES subscription_tiers(id),
  is_external BOOLEAN DEFAULT FALSE,
  vendor TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  rating DECIMAL(2, 1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  usage_limit TEXT,
  usage_limit_tr TEXT,
  validity TEXT,
  validity_tr TEXT,
  terms_url TEXT,
  redemption_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Saved Deals Table
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

-- Page Content Table
CREATE TABLE IF NOT EXISTS page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  content_key TEXT NOT NULL,
  content_value TEXT NOT NULL,
  content_value_tr TEXT,
  content_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_key, section_key, content_key)
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
-- TRIGGER FUNCTION FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Attach triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at BEFORE
UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscription_tiers_updated_at ON subscription_tiers;
CREATE TRIGGER update_subscription_tiers_updated_at BEFORE
UPDATE ON subscription_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_page_content_updated_at ON page_content;
CREATE TRIGGER update_page_content_updated_at BEFORE
UPDATE ON page_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE USING (
    (
      SELECT auth.uid()
    ) = id
  );
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR
INSERT WITH CHECK (
    (
      SELECT auth.uid()
    ) = id
  );
-- Deals Policies
DROP POLICY IF EXISTS "Deals are viewable by everyone" ON deals;
CREATE POLICY "Deals are viewable by everyone" ON deals FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can insert deals" ON deals;
CREATE POLICY "Only admins can insert deals" ON deals FOR
INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (
          SELECT auth.uid()
        )
        AND profiles.is_admin = true
    )
  );
DROP POLICY IF EXISTS "Only admins can update deals" ON deals;
CREATE POLICY "Only admins can update deals" ON deals FOR
UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (
          SELECT auth.uid()
        )
        AND profiles.is_admin = true
    )
  );
DROP POLICY IF EXISTS "Only admins can delete deals" ON deals;
CREATE POLICY "Only admins can delete deals" ON deals FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = (
        SELECT auth.uid()
      )
      AND profiles.is_admin = true
  )
);
-- Saved Deals Policies
DROP POLICY IF EXISTS "Users can view own saved deals" ON saved_deals;
CREATE POLICY "Users can view own saved deals" ON saved_deals FOR
SELECT USING (
    (
      SELECT auth.uid()
    ) = user_id
  );
DROP POLICY IF EXISTS "Users can insert own saved deals" ON saved_deals;
CREATE POLICY "Users can insert own saved deals" ON saved_deals FOR
INSERT WITH CHECK (
    (
      SELECT auth.uid()
    ) = user_id
  );
DROP POLICY IF EXISTS "Users can delete own saved deals" ON saved_deals;
CREATE POLICY "Users can delete own saved deals" ON saved_deals FOR DELETE USING (
  (
    SELECT auth.uid()
  ) = user_id
);
-- Referrals Policies
DROP POLICY IF EXISTS "Users can view referrals they're involved in" ON referrals;
CREATE POLICY "Users can view referrals they're involved in" ON referrals FOR
SELECT USING (
    (
      SELECT auth.uid()
    ) = referrer_id
    OR (
      SELECT auth.uid()
    ) = referred_id
  );
DROP POLICY IF EXISTS "Users can create referrals" ON referrals;
CREATE POLICY "Users can create referrals" ON referrals FOR
INSERT WITH CHECK (
    (
      SELECT auth.uid()
    ) = referrer_id
  );
-- Deal Redemptions Policies
DROP POLICY IF EXISTS "Users can view own redemptions" ON deal_redemptions;
CREATE POLICY "Users can view own redemptions" ON deal_redemptions FOR
SELECT USING (
    (
      SELECT auth.uid()
    ) = user_id
  );
DROP POLICY IF EXISTS "Users can insert own redemptions" ON deal_redemptions;
CREATE POLICY "Users can insert own redemptions" ON deal_redemptions FOR
INSERT WITH CHECK (
    (
      SELECT auth.uid()
    ) = user_id
  );
-- Subscription Tiers Policies
DROP POLICY IF EXISTS "Subscription tiers are viewable by everyone" ON subscription_tiers;
CREATE POLICY "Subscription tiers are viewable by everyone" ON subscription_tiers FOR
SELECT USING (true);
-- Page Content Policies
DROP POLICY IF EXISTS "Page content is viewable by everyone" ON page_content;
CREATE POLICY "Page content is viewable by everyone" ON page_content FOR
SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can insert page content" ON page_content;
CREATE POLICY "Only admins can insert page content" ON page_content FOR
INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (
          SELECT auth.uid()
        )
        AND profiles.is_admin = true
    )
  );
DROP POLICY IF EXISTS "Only admins can update page content" ON page_content;
CREATE POLICY "Only admins can update page content" ON page_content FOR
UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (
          SELECT auth.uid()
        )
        AND profiles.is_admin = true
    )
  );
DROP POLICY IF EXISTS "Only admins can delete page content" ON page_content;
CREATE POLICY "Only admins can delete page content" ON page_content FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = (
        SELECT auth.uid()
      )
      AND profiles.is_admin = true
  )
);
-- Payment Transactions Policies
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view own payment transactions" ON payment_transactions FOR
SELECT USING (
    (
      SELECT auth.uid()
    ) = user_id
  );
DROP POLICY IF EXISTS "Users can insert own payment transactions" ON payment_transactions;
CREATE POLICY "Users can insert own payment transactions" ON payment_transactions FOR
INSERT WITH CHECK (
    (
      SELECT auth.uid()
    ) = user_id
  );
DROP POLICY IF EXISTS "Users can update own payment transactions" ON payment_transactions;
CREATE POLICY "Users can update own payment transactions" ON payment_transactions FOR
UPDATE USING (
    (
      SELECT auth.uid()
    ) = user_id
  );
-- =====================================================
-- FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION get_referral_network(user_uuid UUID) RETURNS TABLE(referred_user_id UUID) AS $$ BEGIN RETURN QUERY WITH RECURSIVE referral_tree AS (
    SELECT referred_id
    FROM referrals
    WHERE referrer_id = user_uuid
    UNION
    SELECT r.referred_id
    FROM referrals r
      INNER JOIN referral_tree rt ON r.referrer_id = rt.referred_id
  )
SELECT *
FROM referral_tree;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_referral_chain(user_uuid UUID) RETURNS TABLE(referrer_user_id UUID) AS $$ BEGIN RETURN QUERY WITH RECURSIVE referral_chain AS (
    SELECT referred_by
    FROM profiles
    WHERE id = user_uuid
      AND referred_by IS NOT NULL
    UNION
    SELECT p.referred_by
    FROM profiles p
      INNER JOIN referral_chain rc ON p.id = rc.referred_by
    WHERE p.referred_by IS NOT NULL
  )
SELECT *
FROM referral_chain;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- SEED DATA - Subscription Tiers
-- =====================================================
INSERT INTO subscription_tiers (
    id,
    name,
    name_tr,
    price,
    redemptions_per_month,
    features,
    features_tr
  )
VALUES (
    'FREE',
    'Free',
    'Ücretsiz',
    0,
    3,
    '["Access to select local deals", "Personalized deal alerts", "Basic support"]',
    '["Seçili yerel fırsatlara erişim", "Kişiselleştirilmiş fırsat uyarıları", "Temel destek"]'
  ),
  (
    'BASIC',
    'Basic',
    'Temel',
    9.99,
    10,
    '["Access to local dining deals", "Weekly newsletter", "Standard support"]',
    '["Yerel yemek fırsatlarına erişim", "Haftalık bülten", "Standart destek"]'
  ),
  (
    'PREMIUM',
    'Premium',
    'Premium',
    19.99,
    30,
    '["All Basic features", "Exclusive travel deals", "Early access to new deals", "Priority support"]',
    '["Tüm Temel özellikler", "Özel seyahat fırsatları", "Yeni fırsatlara erken erişim", "Öncelikli destek"]'
  ),
  (
    'VIP',
    'VIP',
    'VIP',
    49.99,
    999999,
    '["All Premium features", "AI-powered trip planning", "Concierge service", "Partner event invitations"]',
    '["Tüm Premium özellikler", "Yapay zeka destekli gezi planlama", "Konsiyerj hizmeti", "Partner etkinlik davetiyeleri"]'
  ) ON CONFLICT (id) DO NOTHING;
-- =====================================================
-- SEED DATA - Page Content
-- =====================================================
INSERT INTO page_content (
    page_key,
    section_key,
    content_key,
    content_value,
    content_value_tr,
    content_type
  )
VALUES (
    'home',
    'hero',
    'title',
    'Discover Amazing Deals',
    'Harika Fırsatları Keşfet',
    'text'
  ),
  (
    'home',
    'hero',
    'subtitle',
    'Save up to 50% on dining, wellness, and travel.',
    'Yemek, sağlık ve seyahatte %50''ye varan indirimler.',
    'text'
  ),
  (
    'home',
    'hero',
    'image_url',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=2021&q=80',
    NULL,
    'image'
  ),
  (
    'home',
    'categories',
    'title',
    'Categories',
    'Kategoriler',
    'text'
  ),
  (
    'home',
    'featured_deals',
    'title',
    'Featured Deals',
    'Öne Çıkan Fırsatlar',
    'text'
  ),
  (
    'home',
    'flights',
    'title',
    'Find the Best Flight Deals',
    'En İyi Uçuş Fırsatlarını Bul',
    'text'
  ),
  (
    'login',
    'hero',
    'title',
    'Welcome Back',
    'Tekrar Hoşgeldiniz',
    'text'
  ),
  (
    'login',
    'hero',
    'subtitle',
    'Sign in to access your exclusive travel deals.',
    'Özel seyahat fırsatlarınızı erişmek için giriş yapın.',
    'text'
  ),
  (
    'login',
    'hero',
    'badge',
    'New Adventures Await',
    'Yeni Maceralar Bekliyor',
    'text'
  ),
  (
    'login',
    'hero',
    'image_url',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop',
    NULL,
    'image'
  ),
  (
    'login',
    'form',
    'title',
    'Let''s Get You Started',
    'Hadi Başlayalım',
    'text'
  ),
  (
    'login',
    'form',
    'subtitle',
    'Your next adventure is just a click away.',
    'Bir sonraki maceranız sadece bir tık uzağınızda.',
    'text'
  ),
  (
    'subscriptions',
    'header',
    'title',
    'Choose Your Plan',
    'Planınızı Seçin',
    'text'
  ),
  (
    'subscriptions',
    'header',
    'subtitle',
    'Unlock exclusive deals and features with our premium plans.',
    'Premium planlarımızla özel fırsatların ve özelliklerin kilidini açın.',
    'text'
  ) ON CONFLICT (page_key, section_key, content_key) DO NOTHING;