-- 1) Create an enum type for status (idempotent)
DO $$ BEGIN CREATE TYPE public.deal_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
BEGIN;
-- 2) Add partner_id column if missing
ALTER TABLE IF EXISTS public.deals
ADD COLUMN IF NOT EXISTS partner_id uuid;
-- 2.5) Drop policies that depend on status column (to allow column type change)
DROP POLICY IF EXISTS "Public can view approved deals" ON public.deals;
DROP POLICY IF EXISTS "Partners can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Partners can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Partners can update own deals" ON public.deals;
-- 3) Safe conversion of status column to ENUM
-- This approach avoids issues with existing default values and type casting
DO $$ BEGIN -- Only proceed if status is not already the correct enum type
IF EXISTS (
    SELECT 1a
    FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
        AND c.relname = 'deals'
        AND a.attname = 'status'
        AND a.atttypid <> 'public.deal_status'::regtype
) THEN -- Create new column
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS status_new public.deal_status;
-- Copy values (casting will fail if invalid values exist, which is good for safety)
-- We assume existing values are compatible or NULL.
UPDATE public.deals
SET status_new = status::public.deal_status
WHERE status IS NOT NULL;
-- Set default on new column
ALTER TABLE public.deals
ALTER COLUMN status_new
SET DEFAULT 'pending'::public.deal_status;
-- Drop old column and rename new one
ALTER TABLE public.deals DROP COLUMN IF EXISTS status;
ALTER TABLE public.deals
    RENAME COLUMN status_new TO status;
ELSE -- If column doesn't exist at all (unlikely given previous steps, but for safety)
ALTER TABLE IF EXISTS public.deals
ADD COLUMN IF NOT EXISTS status public.deal_status DEFAULT 'pending';
END IF;
END $$;
-- 4) Add foreign key constraint for partner_id (idempotent)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.contype = 'f'
        AND n.nspname = 'public'
        AND t.relname = 'deals'
        AND c.conname = 'deals_partner_id_fkey'
) THEN
ALTER TABLE public.deals
ADD CONSTRAINT deals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE
SET NULL;
END IF;
END;
$$;
-- 5) Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_deals_partner_id ON public.deals (partner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals (status);
-- 6) Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
-- 7) Recreate RLS policies (idempotent and explicit)
-- Public view approved deals
DROP POLICY IF EXISTS "Public can view approved deals" ON public.deals;
CREATE POLICY "Public can view approved deals" ON public.deals FOR
SELECT TO public USING (status = 'approved');
-- Partners view own deals
DROP POLICY IF EXISTS "Partners can view own deals" ON public.deals;
CREATE POLICY "Partners can view own deals" ON public.deals FOR
SELECT TO authenticated USING (
        auth.uid() IS NOT NULL
        AND (
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
                FROM public.profiles p
                WHERE p.id = auth.uid()
                    AND (
                        p.role = 'admin'
                        OR p.is_admin = true
                    )
            )
        )
    );
-- Partners insert deals
DROP POLICY IF EXISTS "Partners can insert deals" ON public.deals;
CREATE POLICY "Partners can insert deals" ON public.deals FOR
INSERT TO authenticated WITH CHECK (auth.uid() = partner_id);
-- Partners update own deals
DROP POLICY IF EXISTS "Partners can update own deals" ON public.deals;
CREATE POLICY "Partners can update own deals" ON public.deals FOR
UPDATE TO authenticated USING (
        auth.uid() = partner_id
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
                AND (
                    p.role = 'admin'
                    OR p.is_admin = true
                )
        )
    ) WITH CHECK (
        auth.uid() = partner_id
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
                AND (
                    p.role = 'admin'
                    OR p.is_admin = true
                )
        )
    );
COMMIT;