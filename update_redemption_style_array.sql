-- Convert redemption_style to text array (Idempotent)
DO $$ BEGIN -- Check if the column is already an array
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'redemption_style'
        AND data_type = 'ARRAY'
) THEN RAISE NOTICE 'Column redemption_style is already an array.';
ELSE -- Perform conversion
ALTER TABLE deals
ALTER COLUMN redemption_style TYPE text [] USING CASE
        WHEN redemption_style IS NULL THEN NULL
        ELSE ARRAY [redemption_style]
    END;
END IF;
END $$;
-- Update check constraint (if any existed, though we didn't name it explicitly before, so we might need to drop it if it was named, but usually inline checks are unnamed or auto-named. Best to just add a new one for array elements)
-- Dropping the old constraint is tricky without the name.
-- However, since we changed the type, the old check constraint on TEXT might have been dropped automatically or is now invalid.
-- Let's try to add a new constraint that checks if elements are valid.
-- Update check constraint (Idempotent)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_redemption_style_elements'
) THEN RAISE NOTICE 'Constraint check_redemption_style_elements already exists.';
ELSE
ALTER TABLE deals
ADD CONSTRAINT check_redemption_style_elements CHECK (redemption_style <@ ARRAY ['online', 'in_store']);
END IF;
END $$;