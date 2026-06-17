-- Fix RLS performance issue on partner_stats
-- Original policy used auth.uid() directly which causes per-row re-evaluation
-- New policy uses (SELECT auth.uid()) to force single evaluation
DROP POLICY IF EXISTS "Partners can view own stats" ON partner_stats;
CREATE POLICY "Partners can view own stats" ON partner_stats FOR
SELECT USING (
        partner_id = (
            SELECT auth.uid()
        )
    );