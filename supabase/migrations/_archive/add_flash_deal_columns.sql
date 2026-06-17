-- Add Flash Deal columns to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS is_flash_deal BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS flash_end_time TIMESTAMP WITH TIME ZONE;