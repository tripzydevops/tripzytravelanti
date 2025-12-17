
-- Check "deals" table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deals';

-- Check if "increment_redemptions_count" function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'increment_redemptions_count';
