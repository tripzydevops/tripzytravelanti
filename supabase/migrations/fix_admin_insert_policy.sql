-- Allow Admins to insert deals regardless of partner_id
DROP POLICY IF EXISTS "Partners can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Partners and Admins can insert deals" ON public.deals;
CREATE POLICY "Partners and Admins can insert deals" ON public.deals FOR
INSERT TO authenticated WITH CHECK (
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