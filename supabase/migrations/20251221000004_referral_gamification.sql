-- Migration to add Referral and Points (Loyalty) System
-- Phase 4: User Growth & Loyalty

-- 1. Enhance Profiles with Referral and Loyalty columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

-- 2. Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- 3. Function to generate a unique random referral code
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    is_unique BOOLEAN DEFAULT FALSE;
BEGIN
    WHILE NOT is_unique LOOP
        -- Generate a 6-character uppercase alphanumeric code
        new_code := upper(substring(md5(random()::text) from 1 for 6));
        
        -- Check if it exists
        SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO is_unique;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to generate referral code for new users
CREATE OR REPLACE FUNCTION public.on_profile_created_referral()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_unique_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_referral_code ON public.profiles;
CREATE TRIGGER tr_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_created_referral();

-- 5. RPC: Handle Referral (called when a user signs up with a code or adds it later)
CREATE OR REPLACE FUNCTION public.handle_referral(referrer_code TEXT, referee_id UUID)
RETURNS JSONB AS $$
DECLARE
    referrer_profile RECORD;
    target_referee_id UUID;
BEGIN
    -- 1. Find referrer
    SELECT * INTO referrer_profile FROM public.profiles WHERE referral_code = referrer_code;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid referral code');
    END IF;

    -- 2. Check if referee already has a referrer
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = referee_id AND referred_by IS NOT NULL) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Referrer already set');
    END IF;

    -- 3. Prevent self-referral
    IF referrer_profile.id = referee_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot refer yourself');
    END IF;

    -- 4. Update Profile
    UPDATE public.profiles 
    SET referred_by = referrer_profile.id 
    WHERE id = referee_id;

    -- 5. Log in referrals table
    INSERT INTO public.referrals (referrer_id, referred_id)
    VALUES (referrer_profile.id, referee_id)
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;

    -- 6. Reward Referrer (500 points + increment count)
    UPDATE public.profiles 
    SET points = points + 500,
        total_referrals = total_referrals + 1
    WHERE id = referrer_profile.id;

    -- 7. Reward Referee (100 points)
    UPDATE public.profiles 
    SET points = points + 100
    WHERE id = referee_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Referral applied successfully',
        'referrer_name', referrer_profile.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Add points (for redemptions, etc.)
CREATE OR REPLACE FUNCTION public.add_user_points(user_uuid UUID, points_to_add INTEGER)
RETURNS INTEGER AS $$
DECLARE
    new_total INTEGER;
BEGIN
    UPDATE public.profiles 
    SET points = points + points_to_add 
    WHERE id = user_uuid
    RETURNING points INTO new_total;
    
    RETURN new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update existing profiles with referral codes
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
        UPDATE public.profiles SET referral_code = public.generate_unique_referral_code() WHERE id = p.id;
    END LOOP;
END $$;
