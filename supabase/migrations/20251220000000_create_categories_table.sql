-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_tr TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    description_tr TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read categories
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

-- Allow admins to manage categories
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Seed initial categories
INSERT INTO categories (name, name_tr, icon, description, description_tr)
VALUES 
    ('Hotels', 'Oteller', 'hotel', 'Discounted accommodation and stay deals', 'İndirimli konaklama ve tatil fırsatları'),
    ('Flights', 'Uçuşlar', 'flight', 'Exclusive flight tickets and airfare discounts', 'Özel uçak biletleri ve uçuş indirimleri'),
    ('Restaurants', 'Restoranlar', 'restaurant', 'Food, dining, and culinary experiences', 'Yemek, restoran ve mutfak deneyimleri'),
    ('Tours', 'Turlar', 'Turlar', 'Guided tours, excursions, and activities', 'Rehberli turlar, geziler ve aktiviteler'),
    ('Transport', 'Ulaşım', 'directions_car', 'Car rentals, transfers, and local transport', 'Araç kiralama, transfer ve yerel ulaşım'),
    ('Shopping', 'Alışveriş', 'shopping_bag', 'Retail discounts and shopping experiences', 'Perakende indirimleri ve alışveriş deneyimleri'),
    ('Spa & Wellness', 'Spa ve Sağlık', 'spa', 'Wellness, massages, and spa treatments', 'Sağlık, masaj ve spa bakımları')
ON CONFLICT (name) DO NOTHING;

-- Add category_id to deals if it doesn't exist, but keep category for backwards compatibility for now
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'category_id') THEN
        ALTER TABLE deals ADD COLUMN category_id UUID REFERENCES categories(id);
    END IF;
END $$;
