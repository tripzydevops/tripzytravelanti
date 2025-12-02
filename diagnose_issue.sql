-- DIAGNOSTIC SCRIPT
-- Run this and share the output (or check it yourself)
-- 1. Check Deals Table Columns (especially redemption_style type)
SELECT column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'deals'
    AND column_name = 'redemption_style';
-- 2. Check Active Policies on Deals Table
SELECT policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'deals';
-- 3. Check Your Profile (fastearn21@gmail.com)
SELECT id,
    email,
    role,
    is_admin,
    tier
FROM profiles
    JOIN auth.users ON profiles.id = auth.users.id
WHERE email = 'fastearn21@gmail.com';
-- 4. Check if you can update a deal (Simulation)
-- Replace DEAL_ID_HERE with the ID of the deal you can't edit
-- Replace YOUR_USER_ID_HERE with your User ID
-- DO $$
-- DECLARE
--    v_deal_id UUID := 'DEAL_ID_HERE';
--    v_user_id UUID := 'YOUR_USER_ID_HERE';
-- BEGIN
--    -- Try to update
--    UPDATE deals SET title = title || ' (Test)' WHERE id = v_deal_id;
--    ROLLBACK; -- Don't actually save
-- END $$;