-- Grant Admin Privileges
-- Replace 'YOUR_EMAIL_HERE' with the email address you use to log in to the app.
UPDATE profiles
SET role = 'admin',
    is_admin = true
WHERE id = (
        SELECT id
        FROM auth.users
        WHERE email = 'YOUR_EMAIL_HERE' -- <--- CHANGE THIS TO YOUR EMAIL
    );
-- Verify the change
SELECT email,
    role,
    is_admin
FROM profiles
    JOIN auth.users ON profiles.id = auth.users.id
WHERE email = 'YOUR_EMAIL_HERE';
-- <--- CHANGE THIS TO YOUR EMAIL