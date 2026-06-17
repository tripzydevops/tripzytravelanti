-- Allow partners to update their own deals
-- This policy was missing or too restrictive (only admins)
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Partners can update own deals" ON deals;
DROP POLICY IF EXISTS "Partners can insert deals" ON deals;
-- Create policy for partners to update their own deals
CREATE POLICY "Partners can update own deals" ON deals FOR
UPDATE USING (auth.uid() = partner_id);
-- Create policy for partners to insert deals
CREATE POLICY "Partners can insert deals" ON deals FOR
INSERT WITH CHECK (auth.uid() = partner_id);
-- Ensure the existing admin policy doesn't conflict (it shouldn't, policies are OR'd)
-- But let's make sure the admin policy is still there and correct
-- (The existing schema had "Only admins can update deals", which is fine as long as we add the partner one)