-- 1. Make handle_new_user bulletproof
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN -- Check if profile already exists to avoid unique violation
    IF EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = new.id
    ) THEN RETURN new;
END IF;
BEGIN
INSERT INTO public.profiles (
        id,
        email,
        name,
        avatar_url,
        tier,
        referred_by
    )
VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        new.raw_user_meta_data->>'avatar_url',
        'FREE',
        new.raw_user_meta_data->>'referred_by'
    );
EXCEPTION
WHEN OTHERS THEN -- Log error but DO NOT FAIL the transaction, so the user can still log in
RAISE WARNING 'Error in handle_new_user: %',
SQLERRM;
END;
RETURN new;
END;
$$;
-- 2. Ensure Grants are correct (RLS policies are useless without Table Permissions)
GRANT USAGE ON SCHEMA public TO anon,
    authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.deals TO anon,
    authenticated;
GRANT SELECT ON public.profiles TO anon,
    authenticated;
GRANT SELECT ON public.categories TO anon,
    authenticated;
-- if exists
-- 3. Double check Deals RLS (Ensure nothing blocks public)
DROP POLICY IF EXISTS "Public can view approved deals" ON public.deals;
CREATE POLICY "Public can view approved deals" ON public.deals FOR
SELECT TO public USING (status = 'approved');