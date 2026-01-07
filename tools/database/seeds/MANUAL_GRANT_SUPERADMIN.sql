/*
 * MANUAL SUPERADMIN GRANT
 *
 * If the seed script doesn't work, you can run this simplified version
 * directly in your Supabase SQL Editor or any psql client.
 *
 * Instructions:
 * 1. Go to Supabase Dashboard > SQL Editor
 * 2. Paste this entire script
 * 3. Click "Run"
 * 4. Refresh your browser and visit /admin
 */

-- Grant superadmin access
UPDATE profiles
SET
  is_admin = true,
  admin_role = 'superadmin',
  admin_role_level = 4,
  admin_granted_at = NOW(),
  updated_at = NOW()
WHERE email = 'micquan@gmail.com';

-- Verify the grant
SELECT
  id,
  email,
  first_name,
  is_admin,
  admin_role,
  admin_role_level
FROM profiles
WHERE email = 'micquan@gmail.com';

-- Expected output:
-- is_admin: true
-- admin_role: superadmin
-- admin_role_level: 4
