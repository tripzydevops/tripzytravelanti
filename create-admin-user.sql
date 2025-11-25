-- Create Admin User for TRIPZY
-- Run this in Supabase SQL Editor

-- First, you need to create the user in Supabase Auth
-- Go to Authentication -> Users -> Add User
-- Email: admin@tripzy.com
-- Password: (choose a secure password)
-- After creating the user, copy the User ID and use it below

-- Then run this SQL to make them admin:
-- Replace 'USER_ID_HERE' with the actual UUID from the auth.users table

UPDATE profiles 
SET is_admin = true, 
    tier = 'VIP'
WHERE id = 'USER_ID_HERE';

-- If the profile doesn't exist yet, create it:
-- (Replace USER_ID_HERE with the UUID from auth.users)

INSERT INTO profiles (id, name, email, tier, is_admin)
VALUES (
  'USER_ID_HERE',
  'Admin User',
  'admin@tripzy.com',
  'VIP',
  true
);
