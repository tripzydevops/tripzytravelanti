-- Allow Admins to DELETE wallet items (needed for Reset History / Remove Deal)
CREATE POLICY "Admins can delete wallet items" ON wallet_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (role = 'admin' OR is_admin = true)
    )
);

-- Allow Admins to DELETE redemption logs (needed for Reset History)
CREATE POLICY "Admins can delete redemption logs" ON redemption_logs FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND (role = 'admin' OR is_admin = true)
    )
);
