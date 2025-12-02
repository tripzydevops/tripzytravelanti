-- Convert redemption_style to text array
ALTER TABLE deals
ALTER COLUMN redemption_style TYPE text [] USING CASE
        WHEN redemption_style IS NULL THEN NULL
        ELSE ARRAY [redemption_style]
    END;
-- Update check constraint (if any existed, though we didn't name it explicitly before, so we might need to drop it if it was named, but usually inline checks are unnamed or auto-named. Best to just add a new one for array elements)
-- Dropping the old constraint is tricky without the name. 
-- However, since we changed the type, the old check constraint on TEXT might have been dropped automatically or is now invalid.
-- Let's try to add a new constraint that checks if elements are valid.
ALTER TABLE deals
ADD CONSTRAINT check_redemption_style_elements CHECK (redemption_style <@ ARRAY ['online', 'in_store']);