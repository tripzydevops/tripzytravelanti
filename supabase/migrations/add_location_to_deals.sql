-- Add latitude and longitude columns to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS latitude float8;
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS longitude float8;