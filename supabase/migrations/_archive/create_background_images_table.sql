-- Create a table for managing background images
CREATE TABLE IF NOT EXISTS public.background_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    time_of_day TEXT NOT NULL CHECK (
        time_of_day IN ('morning', 'afternoon', 'evening', 'night')
    ),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Enable RLS
ALTER TABLE public.background_images ENABLE ROW LEVEL SECURITY;
-- Policies
-- Everyone can read active images
CREATE POLICY "Everyone can view active backgrounds" ON public.background_images FOR
SELECT USING (is_active = true);
-- Only admins can manage (insert/update/delete)
-- using the existing is_admin() function check or similar admin logic
CREATE POLICY "Admins can manage backgrounds" ON public.background_images FOR ALL USING (
    auth.uid() IN (
        SELECT id
        FROM public.profiles
        WHERE is_admin = true
    )
);
-- Insert initial High-Quality Unsplash data
INSERT INTO public.background_images (url, time_of_day)
VALUES -- Morning: Sunrise, Coffee, Calm
    (
        'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2070',
        'morning'
    ),
    -- Morning light on mountains
    (
        'https://images.unsplash.com/photo-1595835026938-1643c68504be?q=80&w=2070',
        'morning'
    ),
    -- Calm beach sunrise
    -- Afternoon: Bright, Sunny, Activity
    (
        'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2094',
        'afternoon'
    ),
    -- Tokyo City Bright
    (
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073',
        'afternoon'
    ),
    -- Tropical Beach
    -- Evening: Sunset, Golden Hour
    (
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1974',
        'evening'
    ),
    -- City Sunset
    (
        'https://images.unsplash.com/photo-1518684079-3c830dcef637?q=80&w=2070',
        'evening'
    ),
    -- Golden hour coast
    -- Night: City Lights, Stars
    (
        'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2144',
        'night'
    ),
    -- Chicago City at Night
    (
        'https://images.unsplash.com/photo-1532588213355-52317771cce6?q=80&w=1974',
        'night'
    );
-- Aurora Borealis