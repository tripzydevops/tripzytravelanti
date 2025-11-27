-- Add partner_id and status columns to deals table
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'partner_id'
) THEN
ALTER TABLE deals
ADD COLUMN partner_id UUID REFERENCES profiles(id) ON DELETE
SET NULL;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'status'
) THEN
ALTER TABLE deals
ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
-- pending, approved, rejected
END IF;
END $$;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_deals_partner_id ON deals(partner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
-- Update RLS Policies
-- 1. Public can only view APPROVED deals
DROP POLICY IF EXISTS "Public can view all deals" ON deals;
CREATE POLICY "Public can view approved deals" ON deals FOR
SELECT USING (status = 'approved');
-- 2. Partners can view their OWN deals (regardless of status)
CREATE POLICY "Partners can view own deals" ON deals FOR
SELECT USING (auth.uid() = partner_id);
-- 3. Partners can INSERT deals (default status will be pending)
CREATE POLICY "Partners can insert deals" ON deals FOR
INSERT WITH CHECK (auth.uid() = partner_id);
-- 4. Partners can UPDATE their own deals (only if pending? or always? Let's say always for now)
CREATE POLICY "Partners can update own deals" ON deals FOR
UPDATE USING (auth.uid() = partner_id);
-- 5. Admins can view ALL deals (already covered if they bypass RLS, but let's be explicit if needed)
-- Usually admins use service role or have a policy. Assuming existing admin policy or role check.
-- If not, we might need:
-- CREATE POLICY "Admins can do everything" ON deals
--     USING (public.is_admin(auth.uid())); 
-- (Assuming is_admin function exists, or we rely on the 'admin' role in profiles)