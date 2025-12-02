)
);
-- RLS Policies for Notifications
-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications FOR
SELECT USING (auth.uid() = user_id);
-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications FOR
UPDATE USING (auth.uid() = user_id);
-- Admins can insert notifications (send them)
CREATE POLICY "Admins can insert notifications" ON notifications FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
        )
    );