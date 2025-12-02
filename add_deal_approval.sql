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
-- Add partner_id and status to deals table
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
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'expired')
    );
END IF;
END $$;
-- Update RLS for deals
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view all deals" ON deals;
CREATE POLICY "Public can view approved deals" ON deals FOR
SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Partners can view own deals" ON deals;
CREATE POLICY "Partners can view own deals" ON deals FOR
SELECT USING (
        auth.uid() = partner_id
        OR (
            status = 'approved'
            AND (
                expires_at > NOW()
                OR expires_at IS NULL
            )
        )
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND (
                    role = 'admin'
                    OR is_admin = true
                )
        )
    );
DROP POLICY IF EXISTS "Partners can insert deals" ON deals;
CREATE POLICY "Partners can insert deals" ON deals FOR
INSERT WITH CHECK (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Partners can update own deals" ON deals;
CREATE POLICY "Partners can update own deals" ON deals FOR
UPDATE USING (
        auth.uid() = partner_id
        OR EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND (
                    role = 'admin'
                    OR is_admin = true
                )
        )
    );
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_deals_partner_id ON deals(partner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
-- 5. Admins can view ALL deals (already covered if they bypass RLS, but let's be explicit if needed)
-- Usually admins use service role or have a policy. Assuming existing admin policy or role check.
-- If not, we might need:
-- CREATE POLICY "Admins can do everything" ON deals
--     USING (public.is_admin(auth.uid()));
-- (Assuming is_admin function exists, or we rely on the 'admin' role in profiles)