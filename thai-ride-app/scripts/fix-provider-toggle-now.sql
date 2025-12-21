-- ============================================================================
-- QUICK FIX: PROVIDER TOGGLE ONLINE
-- ============================================================================
-- Copy and paste this entire script into Supabase SQL Editor and run it
-- ============================================================================

-- Step 1: Enable RLS
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop old policies
DROP POLICY IF EXISTS "providers_update_own_availability" ON service_providers;
DROP POLICY IF EXISTS "providers_read_own_profile" ON service_providers;
DROP POLICY IF EXISTS "providers_update_own" ON service_providers;
DROP POLICY IF EXISTS "providers_select_own" ON service_providers;
DROP POLICY IF EXISTS "service_providers_select_own" ON service_providers;
DROP POLICY IF EXISTS "service_providers_update_own" ON service_providers;
DROP POLICY IF EXISTS "providers_can_read_own" ON service_providers;
DROP POLICY IF EXISTS "providers_can_update_own" ON service_providers;
DROP POLICY IF EXISTS "anyone_can_see_online_providers" ON service_providers;

-- Step 3: Create new policies
CREATE POLICY "providers_can_read_own" ON service_providers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "providers_can_update_own" ON service_providers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "anyone_can_see_online_providers" ON service_providers
  FOR SELECT TO authenticated
  USING (is_available = true);

-- Step 4: Grant permissions
GRANT SELECT, UPDATE ON service_providers TO authenticated;

-- Step 5: Auto-approve all providers (for testing)
UPDATE service_providers
SET 
  status = 'approved',
  is_verified = true,
  updated_at = NOW()
WHERE status = 'pending' OR status IS NULL;

-- Step 6: Verify - show all providers
SELECT 
  id,
  user_id,
  status,
  is_verified,
  is_available,
  provider_type
FROM service_providers
ORDER BY created_at DESC;

