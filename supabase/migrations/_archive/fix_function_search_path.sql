-- Fix mutable search_path in functions
-- This prevents potential security issues by forcing a fixed search_path.
-- Fix for update_updated_at_column (known to exist)
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';
-- Fix for public.set_updated_at (reported by user)
-- We use a DO block to avoid errors if the function doesn't exist in your specific instance
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
) THEN ALTER FUNCTION public.set_updated_at()
SET search_path = '';
END IF;
END $$;