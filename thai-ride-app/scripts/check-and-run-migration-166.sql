-- Check and Run Migration 166
-- This script checks if migration 166 has been run and provides instructions

-- =====================================================
-- 1. Check if verification queue table exists
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'provider_verification_queue'
  ) THEN
    RAISE NOTICE '✓ Table provider_verification_queue exists';
  ELSE
    RAISE NOTICE '✗ Table provider_verification_queue DOES NOT exist - Migration 166 needs to be run!';
  END IF;
END $$;

-- =====================================================
-- 2. Check if RPC functions exist
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'admin_get_verification_queue'
  ) THEN
    RAISE NOTICE '✓ Function admin_get_verification_queue exists';
  ELSE
    RAISE NOTICE '✗ Function admin_get_verification_queue DOES NOT exist - Migration 166 needs to be run!';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'admin_get_pending_providers'
  ) THEN
    RAISE NOTICE '✓ Function admin_get_pending_providers exists';
  ELSE
    RAISE NOTICE '✗ Function admin_get_pending_providers DOES NOT exist - Migration 166 needs to be run!';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'admin_approve_provider_from_queue'
  ) THEN
    RAISE NOTICE '✓ Function admin_approve_provider_from_queue exists';
  ELSE
    RAISE NOTICE '✗ Function admin_approve_provider_from_queue DOES NOT exist - Migration 166 needs to be run!';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'admin_reject_provider_from_queue'
  ) THEN
    RAISE NOTICE '✓ Function admin_reject_provider_from_queue exists';
  ELSE
    RAISE NOTICE '✗ Function admin_reject_provider_from_queue DOES NOT exist - Migration 166 needs to be run!';
  END IF;
END $$;

-- =====================================================
-- 3. Check for pending providers
-- =====================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM service_providers
  WHERE status = 'pending';
  
  RAISE NOTICE 'Found % pending providers in service_providers table', v_count;
END $$;

-- =====================================================
-- 4. Instructions
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INSTRUCTIONS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If any checks above show ✗, you need to run migration 166:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Open Supabase Dashboard SQL Editor';
  RAISE NOTICE '2. Copy the contents of: supabase/migrations/166_fix_verification_queue_complete.sql';
  RAISE NOTICE '3. Paste and run it in the SQL Editor';
  RAISE NOTICE '';
  RAISE NOTICE 'OR use Supabase CLI:';
  RAISE NOTICE '  supabase db push';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
