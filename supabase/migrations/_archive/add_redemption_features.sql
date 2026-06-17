
-- 1. Add max_user_redemptions column to deals table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' AND column_name = 'max_user_redemptions'
    ) THEN
        ALTER TABLE deals ADD COLUMN max_user_redemptions INTEGER DEFAULT NULL;
    END IF;
END $$;

-- 2. Create increment_redemptions_count function
CREATE OR REPLACE FUNCTION increment_redemptions_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE deals
  SET redemptions_count = COALESCE(redemptions_count, 0) + 1
  WHERE id = row_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_redemptions_count(UUID) TO public;
GRANT EXECUTE ON FUNCTION increment_redemptions_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_redemptions_count(UUID) TO service_role;
