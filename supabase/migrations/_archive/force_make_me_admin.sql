-- FORCE MAKE ME ADMIN
-- Replace 'YOUR_EMAIL_HERE' with your actual email address.
UPDATE profiles
SET is_admin = true,
    role = 'admin',
    tier = 'VIP'
WHERE id = (
        SELECT id
        FROM auth.users
        WHERE email = 'YOUR_EMAIL_HERE'
    );
-- Verify the result
SELECT email,
    is_admin,
    role
FROM profiles
    JOIN auth.users ON profiles.id = auth.users.id
WHERE email = 'YOUR_EMAIL_HERE';