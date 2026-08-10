-- Migration: SVD++ Latent Factors tables for Collaborative Filtering
-- Dimensions: 32-dimensional vectors representing latent user taste, deal characteristics, and implicit category feedback contributions.

-- 1. Create user latent factors table
CREATE TABLE IF NOT EXISTS public.user_latent_factors (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    factors vector(32) NOT NULL,
    bias double precision NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create deal latent factors table
CREATE TABLE IF NOT EXISTS public.deal_latent_factors (
    deal_id UUID PRIMARY KEY REFERENCES public.deals(id) ON DELETE CASCADE,
    factors vector(32) NOT NULL,
    bias double precision NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create implicit category latent factors table
CREATE TABLE IF NOT EXISTS public.implicit_latent_factors (
    category TEXT PRIMARY KEY,
    factors vector(32) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.user_latent_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_latent_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implicit_latent_factors ENABLE ROW LEVEL SECURITY;

-- Select Policies
CREATE POLICY "Allow users to read their own latent factors"
ON public.user_latent_factors FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to read deal latent factors"
ON public.deal_latent_factors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read implicit latent factors"
ON public.implicit_latent_factors FOR SELECT
TO authenticated
USING (true);
