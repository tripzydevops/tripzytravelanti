-- Create generations_cache table
CREATE TABLE IF NOT EXISTS public.generations_cache (
    prompt_hash TEXT PRIMARY KEY, -- SHA-256 hash of the prompt/config
    action_type TEXT NOT NULL,    -- 'rank', 'generate', 'chat'
    response_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE -- Optional TTL
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_generations_cache_expires_at ON public.generations_cache(expires_at);

-- Enable RLS (Service role primarily, or authenticated with specific rules)
ALTER TABLE public.generations_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (since they benefit from the cache)
CREATE POLICY "Anyone can read generations cache" 
ON public.generations_cache FOR SELECT 
TO authenticated 
USING (true);

-- Only service role (Edge Functions) can write - standard for cache
-- No specialized policy needed if Edge Function uses service role, 
-- but let's add one if needed for specific use cases.

-- Function to clean up expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_generations()
RETURNS void AS $$
BEGIN
    DELETE FROM public.generations_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
