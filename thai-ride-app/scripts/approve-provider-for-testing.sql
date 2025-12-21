-- ============================================================================
-- APPROVE PROVIDER FOR TESTING - Run this in Supabase SQL Editor
-- ============================================================================
-- Use this script to approve a provider for testing the toggle online feature
-- ============================================================================

-- ============================================================================
-- STEP 1: VIEW ALL PROVIDERS AND THEIR STATUS
-- ============================================================================

SELECT 
  sp.id as provider_id,
  sp.user_id,
  u.email,
  u.first_name,
  u.last_name,
  sp.provider_type,
  sp.status,
  sp.is_verified,
  sp.is_available,
  sp.license_number,
  sp.vehicle_plate,
  sp.vehicle_plate_number,
  sp.created_at
FROM service_providers sp
LEFT JOIN users u ON u.id = sp.user_id
ORDER BY sp.created_at DESC;

-- ============================================================================
-- STEP 2: APPROVE A SPECIFIC PROVIDER (Replace with actual user_id or email)
-- ============================================================================

-- Option A: Approve by user_id
-- UPDATE service_providers
-- SET status = 'approved', is_verified = true, updated_at = NOW()
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- Option B: Approve by email (join with users table)
-- UPDATE service_providers sp
-- SET status = 'approved', is_verified = true, updated_at = NOW()
-- FROM users u
-- WHERE sp.user_id = u.id AND u.email = 'provider@example.com';

-- ============================================================================
-- STEP 3: APPROVE ALL PENDING PROVIDERS (For testing only!)
-- ============================================================================

-- WARNING: Only use this in development/testing environment!
UPDATE service_providers
SET 
  status = 'approved', 
  is_verified = true, 
  updated_at = NOW()
WHERE status = 'pending';

-- ============================================================================
-- STEP 4: VERIFY THE UPDATE
-- ============================================================================

SELECT 
  sp.id as provider_id,
  u.email,
  u.first_name || ' ' || u.last_name as name,
  sp.provider_type,
  sp.status,
  sp.is_verified,
  sp.is_available
FROM service_providers sp
LEFT JOIN users u ON u.id = sp.user_id
WHERE sp.status = 'approved'
ORDER BY sp.updated_at DESC;

-- ============================================================================
-- STEP 5: CHECK IF TOGGLE ONLINE WILL WORK
-- ============================================================================

-- This query shows which providers can go online
SELECT 
  sp.id as provider_id,
  u.email,
  sp.status,
  sp.is_verified,
  CASE 
    WHEN sp.status IN ('approved', 'active') OR sp.is_verified = true 
    THEN 'CAN GO ONLINE ✓'
    ELSE 'CANNOT GO ONLINE ✗'
  END as can_toggle_online
FROM service_providers sp
LEFT JOIN users u ON u.id = sp.user_id
ORDER BY sp.created_at DESC;

