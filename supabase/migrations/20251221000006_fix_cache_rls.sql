-- Safely apply RLS policies for generations_cache
DO $$ 
BEGIN
    -- Drop existing policies if they exist to ensure we apply the latest version
    DROP POLICY IF EXISTS "Authenticated users can insert cache" ON public.generations_cache;
    DROP POLICY IF EXISTS "Authenticated users can update cache" ON public.generations_cache;

    -- Create Insert Policy
    CREATE POLICY "Authenticated users can insert cache" ON public.generations_cache
        FOR INSERT 
        WITH CHECK (auth.role() = 'authenticated');

    -- Create Update Policy
    CREATE POLICY "Authenticated users can update cache" ON public.generations_cache
        FOR UPDATE
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
        
END $$;
