-- FIX RLS GAPS FOR ADMINS
-- This script ensures admins can view wallet items and redemption logs

-- 1. Update wallet_items SELECT policy to allow Admins
DROP POLICY IF EXISTS "Users view own wallet items" ON public.wallet_items;
CREATE POLICY "Users view own wallet items" ON public.wallet_items
FOR SELECT USING (auth.uid() = user_id OR public.check_is_admin());

-- 2. Update redemption_logs SELECT policy to allow Admins
DROP POLICY IF EXISTS "Users view own redemption logs" ON public.redemption_logs;
CREATE POLICY "Users view own redemption logs" ON public.redemption_logs
FOR SELECT USING (auth.uid() = user_id OR public.check_is_admin());

-- 3. Ensure admins can also view logs for all vendors
DROP POLICY IF EXISTS "Partners view redemption logs" ON public.redemption_logs;
CREATE POLICY "Partners view redemption logs" ON public.redemption_logs
FOR SELECT USING (auth.uid() = vendor_id OR public.check_is_admin());

-- 4. Audit Grant
GRANT SELECT ON public.wallet_items TO authenticated;
GRANT SELECT ON public.redemption_logs TO authenticated;
