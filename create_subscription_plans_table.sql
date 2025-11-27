CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier VARCHAR(50) NOT NULL UNIQUE,
    -- e.g., 'FREE', 'BASIC', 'PREMIUM', 'VIP'
    name VARCHAR(100) NOT NULL,
    name_tr VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    price_tr DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_period VARCHAR(20) DEFAULT 'yearly',
    redemptions_per_period INTEGER NOT NULL,
    features JSONB NOT NULL,
    -- Array of strings
    features_tr JSONB NOT NULL,
    -- Array of strings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Seed with current yearly plans
INSERT INTO subscription_plans (
        tier,
        name,
        name_tr,
        price,
        price_tr,
        redemptions_per_period,
        features,
        features_tr
    )
VALUES (
        'FREE',
        'Free',
        'Ücretsiz',
        0,
        0,
        36,
        '["Access to select local deals","Personalized deal alerts","Basic support"]',
        '["Seçili yerel fırsatlara erişim","Kişiselleştirilmiş fırsat uyarıları","Temel destek"]'
    ),
    (
        'BASIC',
        'Basic',
        'Temel',
        119.88,
        4199.88,
        120,
        '["Access to local dining deals","Weekly newsletter","Standard support"]',
        '["Yerel yemek fırsatlarına erişim","Haftalık bülten","Standart destek"]'
    ),
    (
        'PREMIUM',
        'Premium',
        'Premium',
        239.88,
        8399.88,
        360,
        '["All Basic features","Exclusive travel deals","Early access to new deals","Priority support"]',
        '["Tüm Temel özellikler","Özel seyahat fırsatları","Yeni fırsatlara erken erişim","Öncelikli destek"]'
    ),
    (
        'VIP',
        'VIP',
        'VIP',
        599.88,
        20399.88,
        999999,
        '["All Premium features","AI-powered trip planning","Concierge service","Partner event invitations"]',
        '["Tüm Premium özellikler","Yapay zeka destekli gezi planlama","Konsiyerj hizmeti","Partner etkinlik davetiyeleri"]'
    );
-- Add RLS policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
-- Allow public read access
CREATE POLICY "Public plans are viewable by everyone" ON subscription_plans FOR
SELECT USING (true);
-- Allow admin write access (assuming admin check logic exists or will be handled by service role for now)
-- For simplicity in this step, we'll allow authenticated users to read, but only admins to write.
-- Since we don't have a robust admin role check in RLS yet, we'll rely on app logic for write protection or add a basic policy if admin flag exists in profiles.