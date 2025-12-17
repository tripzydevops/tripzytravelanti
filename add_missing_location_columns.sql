-- Add latitude and longitude columns to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS latitude float8;
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS longitude float8;
-- Add store_locations column (JSONB array)
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS store_locations jsonb DEFAULT '[]'::jsonb;
-- Comment: This migration fixes the "400 Bad Request" error when creating deals with location data.