-- DEFINITIVE FIX FOR REDEMPTION STYLE
-- This script recreates the redemption_style column to ensure it is exactly TEXT[] (Array).
-- It handles data migration and removes any conflicting old constraints.
-- 1. Drop existing check constraints on redemption_style if any
DO $$
DECLARE r record;
BEGIN FOR r IN (
    SELECT constraint_name
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'deals'
        AND column_name = 'redemption_style'
) LOOP EXECUTE 'ALTER TABLE deals DROP CONSTRAINT ' || quote_ident(r.constraint_name);
END LOOP;
END $$;
-- 2. Rename the old column to save data (if it exists and isn't already renamed)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'redemption_style'
) THEN
ALTER TABLE deals
    RENAME COLUMN redemption_style TO redemption_style_old;
END IF;
END $$;
-- 3. Create the new column as TEXT[] (Array of Text)
ALTER TABLE deals
ADD COLUMN redemption_style TEXT [] DEFAULT '{}';
-- 4. Migrate data from old column
-- Handle cases where old column was Text ('online') or JSON/Array
DO $$ BEGIN -- Try to migrate if old column exists
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'redemption_style_old'
) THEN
UPDATE deals
SET redemption_style = CASE
        -- If it was a simple text string, wrap in array
        WHEN redemption_style_old::text = 'online' THEN ARRAY ['online']
        WHEN redemption_style_old::text = 'in_store' THEN ARRAY ['in_store'] -- If it looks like a JSON array string (e.g. '["online"]')
        WHEN redemption_style_old::text LIKE '["%"]' THEN ARRAY(
            SELECT jsonb_array_elements_text(redemption_style_old::jsonb)
        ) -- Default to empty array
        ELSE '{}'::text []
    END;
END IF;
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Could not migrate some data: %',
SQLERRM;
END $$;
-- 5. Add the correct check constraint
ALTER TABLE deals
ADD CONSTRAINT deals_redemption_style_check CHECK (redemption_style <@ ARRAY ['online', 'in_store']);
-- 6. Clean up (Optional: Drop old column after verifying)
-- ALTER TABLE deals DROP COLUMN redemption_style_old;
-- RAISE NOTICE 'Fixed redemption_style schema successfully.';