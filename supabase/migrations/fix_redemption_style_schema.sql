-- Fix redemption_style column in deals table
-- This script ensures the column exists, is of type TEXT[], and has the correct check constraint.
DO $$ BEGIN -- 1. Check if column exists, if not add it as TEXT[]
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'redemption_style'
) THEN
ALTER TABLE deals
ADD COLUMN redemption_style TEXT [];
RAISE NOTICE 'Added redemption_style column as TEXT[]';
-- 2. If it exists but is not an array (e.g. TEXT), convert it
ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'redemption_style'
        AND data_type != 'ARRAY'
) THEN -- Drop old constraint if it exists (it might be named differently or unnamed)
-- We'll try to drop the likely name if it was created by previous scripts
BEGIN
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_redemption_style_check;
EXCEPTION
WHEN OTHERS THEN NULL;
END;
-- Convert column to array
ALTER TABLE deals
ALTER COLUMN redemption_style TYPE TEXT [] USING CASE
        WHEN redemption_style IS NULL THEN NULL
        WHEN redemption_style = '' THEN NULL
        ELSE ARRAY [redemption_style]
    END;
RAISE NOTICE 'Converted redemption_style column from TEXT to TEXT[]';
END IF;
-- 3. Ensure the check constraint exists and is correct
-- First drop any existing constraint to be safe and ensure we have the correct one
ALTER TABLE deals DROP CONSTRAINT IF EXISTS check_redemption_style_elements;
-- Add the constraint
ALTER TABLE deals
ADD CONSTRAINT check_redemption_style_elements CHECK (redemption_style <@ ARRAY ['online', 'in_store']);
RAISE NOTICE 'Updated check_redemption_style_elements constraint';
END $$;