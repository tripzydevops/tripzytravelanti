-- Add max_redemptions_total to deals table if it doesn't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'deals'
        AND column_name = 'max_redemptions_total'
) THEN
ALTER TABLE deals
ADD COLUMN max_redemptions_total INTEGER DEFAULT NULL;
END IF;
END $$;