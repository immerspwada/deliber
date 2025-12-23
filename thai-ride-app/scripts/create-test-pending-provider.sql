-- Create Test Pending Provider
-- This script creates a test pending provider for testing the verification queue

-- =====================================================
-- 1. Check if customer@demo.com exists
-- =====================================================
DO $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_existing_provider_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'customer@demo.com'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User customer@demo.com not found! Please create this user first.';
  END IF;
  
  RAISE NOTICE 'Found user: %', v_user_id;
  
  -- Check if already has a provider record
  SELECT id INTO v_existing_provider_id
  FROM service_providers
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_provider_id IS NOT NULL THEN
    RAISE NOTICE 'User already has provider record: %', v_existing_provider_id;
    RAISE NOTICE 'Updating status to pending...';
    
    -- Update existing provider to pending
    UPDATE service_providers
    SET 
      status = 'pending',
      is_verified = false,
      updated_at = NOW()
    WHERE id = v_existing_provider_id;
    
    v_provider_id := v_existing_provider_id;
  ELSE
    RAISE NOTICE 'Creating new provider record...';
    
    -- Create new provider record
    INSERT INTO service_providers (
      user_id,
      provider_type,
      status,
      is_verified,
      vehicle_type,
      vehicle_plate,
      documents
    ) VALUES (
      v_user_id,
      'driver',
      'pending',
      false,
      'sedan',
      'ABC-1234',
      '{"id_card": "uploaded", "license": "uploaded", "vehicle_registration": "uploaded"}'::jsonb
    )
    RETURNING id INTO v_provider_id;
  END IF;
  
  RAISE NOTICE '✓ Provider ID: %', v_provider_id;
  RAISE NOTICE '✓ Status: pending';
  RAISE NOTICE '';
  RAISE NOTICE 'Now check /admin/verification-queue to see this provider!';
  RAISE NOTICE '';
  
  -- Show provider details
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PROVIDER DETAILS:';
  RAISE NOTICE '========================================';
  
  -- Display provider info
  PERFORM 
    RAISE NOTICE 'Provider UID: %', sp.provider_uid,
    RAISE NOTICE 'Type: %', sp.provider_type,
    RAISE NOTICE 'Status: %', sp.status,
    RAISE NOTICE 'User: % %', u.first_name, u.last_name,
    RAISE NOTICE 'Email: %', u.email,
    RAISE NOTICE 'Phone: %', COALESCE(u.phone_number, u.phone)
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE sp.id = v_provider_id;
  
END $$;

-- =====================================================
-- 2. Verify the provider is in the queue (if migration 166 is run)
-- =====================================================
DO $$
DECLARE
  v_queue_count INTEGER;
BEGIN
  -- Check if queue table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'provider_verification_queue'
  ) THEN
    SELECT COUNT(*) INTO v_queue_count
    FROM provider_verification_queue
    WHERE status IN ('pending', 'in_review');
    
    RAISE NOTICE '';
    RAISE NOTICE 'Verification queue has % pending items', v_queue_count;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Verification queue table does not exist!';
    RAISE NOTICE '⚠️  Run migration 166 first!';
  END IF;
END $$;
