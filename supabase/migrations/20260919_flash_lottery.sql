-- =====================================================
-- Migration: 20260919_flash_lottery.sql
-- Description: Flash Lottery & Instagram Share Verification Engine
-- =====================================================

-- 1. Create lottery_campaigns table
CREATE TABLE IF NOT EXISTS public.lottery_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    merchant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    merchant_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    title_tr VARCHAR(255) NOT NULL,
    description TEXT,
    description_tr TEXT,
    prize_description TEXT NOT NULL,
    prize_description_tr TEXT NOT NULL,
    image_url TEXT NOT NULL,
    total_winners INT DEFAULT 1,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'drawn', 'cancelled'
    winning_ticket_ids UUID[] DEFAULT '{}',
    total_tickets_minted INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create lottery_tickets table
CREATE TABLE IF NOT EXISTS public.lottery_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.lottery_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. TRPZ-LOT-89210
    verification_method VARCHAR(50) NOT NULL, -- 'webhook_tag', 'story_canvas', 'referral_click', 'ocr_screenshot', 'points_exchange'
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    is_winner BOOLEAN DEFAULT FALSE,
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create lottery_draws table (Provably Fair audit log)
CREATE TABLE IF NOT EXISTS public.lottery_draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.lottery_campaigns(id) ON DELETE CASCADE,
    winning_ticket_id UUID REFERENCES public.lottery_tickets(id) ON DELETE SET NULL,
    winning_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    winning_ticket_number VARCHAR(50) NOT NULL,
    winner_name VARCHAR(255),
    draw_seed VARCHAR(255) NOT NULL, -- Cryptographic SHA-256 seed for audit
    drawn_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.lottery_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lottery_draws ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Campaigns are public read
CREATE POLICY "Public read lottery campaigns" ON public.lottery_campaigns
    FOR SELECT USING (true);

-- Admins & Merchants can insert/update campaigns
CREATE POLICY "Admins and merchants manage campaigns" ON public.lottery_campaigns
    FOR ALL USING (
        auth.uid() = merchant_id OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'merchant'))
    );

-- Users can read their own tickets + winners public read
CREATE POLICY "Users read own tickets" ON public.lottery_tickets
    FOR SELECT USING (auth.uid() = user_id OR is_winner = true);

-- Authenticated users can insert their own tickets
CREATE POLICY "Users insert own tickets" ON public.lottery_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read lottery draws
CREATE POLICY "Public read lottery draws" ON public.lottery_draws
    FOR SELECT USING (true);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_lottery_campaigns_status ON public.lottery_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_lottery_campaigns_ends_at ON public.lottery_campaigns(ends_at);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user_id ON public.lottery_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_campaign_id ON public.lottery_tickets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lottery_tickets_number ON public.lottery_tickets(ticket_number);
