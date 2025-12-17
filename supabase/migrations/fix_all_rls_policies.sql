-- Comprehensive RLS Performance Fix
-- Replaces direct auth.uid() calls with (SELECT auth.uid()) to prevent per-row re-evaluation.
-- 1. partner_stats
DROP POLICY IF EXISTS "Partners can view own stats" ON partner_stats;
CREATE POLICY "Partners can view own stats" ON partner_stats FOR
SELECT USING (
        partner_id = (
            SELECT auth.uid()
        )
    );
-- 2. notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications FOR
SELECT USING (
        (
            SELECT auth.uid()
        ) = user_id
    );
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR
UPDATE USING (
        (
            SELECT auth.uid()
        ) = user_id
    );
-- 3. deals (Partner policies)
DROP POLICY IF EXISTS "Partners can view own deals" ON deals;
CREATE POLICY "Partners can view own deals" ON deals FOR
SELECT USING (
        (
            SELECT auth.uid()
        ) = partner_id
    );
DROP POLICY IF EXISTS "Partners can insert deals" ON deals;
CREATE POLICY "Partners can insert deals" ON deals FOR
INSERT WITH CHECK (
        (
            SELECT auth.uid()
        ) = partner_id
    );
DROP POLICY IF EXISTS "Partners can update own deals" ON deals;
CREATE POLICY "Partners can update own deals" ON deals FOR
UPDATE USING (
        (
            SELECT auth.uid()
        ) = partner_id
    );
-- 4. payment_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
CREATE POLICY "Users can view own transactions" ON payment_transactions FOR
SELECT USING (
        (
            SELECT auth.uid()
        ) = user_id
    );
-- Note: Admin policies using EXISTS(...) are more complex to optimize fully without a dedicated admin lookup function or claim,
-- but ensuring auth.uid() is wrapped inside them is a good start.
-- For now, we focus on the direct ID comparisons which are the most frequent.