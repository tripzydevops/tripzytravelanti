-- Ensure partner_id exists in deals
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'partner_id') THEN
        ALTER TABLE public.deals ADD COLUMN partner_id uuid REFERENCES public.profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'status') THEN
        ALTER TABLE public.deals ADD COLUMN status text CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending';
    END IF;
END $$;

-- Create partner_stats table if not exists (Materialized view or regular table)
CREATE TABLE IF NOT EXISTS public.partner_stats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id uuid REFERENCES public.profiles(id) NOT NULL UNIQUE,
    total_views integer DEFAULT 0,
    total_redemptions integer DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

-- RLS for partner_stats
ALTER TABLE public.partner_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own stats"
    ON public.partner_stats
    FOR SELECT
    USING (auth.uid() = partner_id);

-- RLS for deals (update for partners)
-- Allow partners to view their own deals
CREATE POLICY "Partners can view own deals"
    ON public.deals
    FOR SELECT
    USING (partner_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Allow partners to insert deals (default pending)
CREATE POLICY "Partners can insert deals"
    ON public.deals
    FOR INSERT
    WITH CHECK (partner_id = auth.uid());

-- Allow partners to update own deals (but maybe reset status to pending?)
CREATE POLICY "Partners can update own deals"
    ON public.deals
    FOR UPDATE
    USING (partner_id = auth.uid());
