-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT NOT NULL DEFAULT 'system',
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- RLS Policies for Announcements
-- Everyone can read active announcements
CREATE POLICY "Public can read active announcements" ON announcements FOR
SELECT USING (
        is_active = true
        AND (
            end_at IS NULL
            OR end_at > NOW()
        )
    );
-- Admins can do everything
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
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