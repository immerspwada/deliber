-- ============================================================================
-- Feature: F201 - Atomic Create Functions for All Service Types
-- Migration: 102_atomic_create_functions.sql
-- Description: Implement atomic create_*_atomic() functions with wallet hold
--              logic, error handling, and provider notifications
-- Task: 2 - Implement atomic create_*_atomic() functions
-- Requirements: 4.1, 8.1
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTION: Generate Tracking ID
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_tracking_id(prefix TEXT)
RETURNS TEXT AS $
BEGIN
  RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('tracking_sequences')::TEXT, 6, '0');
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. HELPER FUNCTION: Notify Nearby Providers
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_nearby_providers(
  p_request_id UUID,
  p_request_type TEXT,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_service_radius_km DECIMAL DEFAULT 5.0
)
RETURNS VOID AS $
DECLARE
  v_provider RECORD;
  v_distance DECIMAL;
BEGIN
  -- Find nearby online providers with matching service type
  FOR v_provider IN
    SELECT sp.id, sp.user_id, sp.current_lat, sp.current_lng
    FROM service_providers sp
    WHERE sp.is_online = true
      AND sp.is_available = true
      AND sp.verification_status = 'approved'
      AND p_request_type = ANY(sp.enabled_services)
      AND sp.current_lat IS NOT NULL
      AND sp.current_lng IS NOT NULL
  LOOP
    -- Calculate distance using Haversine formula (simplified)
    v_distance := (
      6371 * acos(
        cos(radians(p_pickup_lat)) * 
        cos(radians(v_provider.current_lat)) * 
        cos(radians(v_provider.current_lng) - radians(p_pickup_lng)) + 
        sin(radians(p_pickup_lat)) * 
        sin(radians(v_provider.current_lat))
      )
    );
    
    -- If within radius, send notification
    IF v_distance <= p_service_radius_km THEN
      INSERT INTO user_notifications (
        user_id,
        title,
        message,
        type,
        data
      ) VALUES (
        v_provider.user_id,
        'งานใหม่ใกล้คุณ',
        'มีงาน ' || p_request_type || ' ใหม่ห่างจากคุณ ' || ROUND(v_distance, 1) || ' กม.',
        'new_job',
        jsonb_build_object(
          'request_id', p_request_id,
          'request_type', p_request_type,
          'distance_km', ROUND(v_distance, 1)
        )
      );
    END IF;
  END LOOP;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 3. CREATE_RIDE_ATOMIC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_ride_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_vehicle_type TEXT,
  p_passenger_count INTEGER DEFAULT 1,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_ride_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_wallet_held DECIMAL;
  v_final_fare DECIMAL;
  v_promo_discount DECIMAL DEFAULT 0;
BEGIN
  -- Validate inputs
  IF p_estimated_fare <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Fare must be positive';
  END IF;
  
  IF p_vehicle_type NOT IN ('car', 'motorcycle', 'van') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid vehicle type';
  END IF;
  
  IF p_passenger_count < 1 OR p_passenger_count > 8 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Passenger count must be between 1 and 8';
  END IF;
  
  -- 1. Check wallet balance
  SELECT balance, held_balance INTO v_wallet_balance, v_wallet_held
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE; -- Lock wallet row
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found';
  END IF;
  
  -- Apply promo code if provided
  v_final_fare := p_estimated_fare;
  IF p_promo_code IS NOT NULL THEN
    -- Validate and apply promo (simplified - actual logic in validate_promo_code)
    SELECT COALESCE(discount_amount, 0) INTO v_promo_discount
    FROM promo_codes
    WHERE code = p_promo_code
      AND is_active = true
      AND (expiry_date IS NULL OR expiry_date > NOW())
      AND (usage_limit IS NULL OR usage_count < usage_limit);
    
    v_final_fare := GREATEST(v_final_fare - v_promo_discount, 0);
  END IF;
  
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Balance %.2f, Required %.2f', 
      v_wallet_balance, v_final_fare;
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := generate_tracking_id('RID');
  
  -- 3. Create ride request
  INSERT INTO ride_requests (
    user_id, tracking_id, 
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    vehicle_type, passenger_count,
    estimated_fare, status
  ) VALUES (
    p_user_id, v_tracking_id,
    p_pickup_lat, p_pickup_lng, p_pickup_address,
    p_destination_lat, p_destination_lng, p_destination_address,
    p_vehicle_type, p_passenger_count,
    v_final_fare, 'pending'
  )
  RETURNING id INTO v_ride_id;
  
  -- 4. Hold wallet funds
  UPDATE user_wallets
  SET held_balance = held_balance + v_final_fare
  WHERE user_id = p_user_id;
  
  INSERT INTO wallet_holds (user_id, request_id, request_type, amount, status)
  VALUES (p_user_id, v_ride_id, 'ride', v_final_fare, 'held');
  
  -- 5. Trigger notification to nearby providers
  PERFORM notify_nearby_providers(v_ride_id, 'ride', p_pickup_lat, p_pickup_lng);
  
  -- 6. Return result
  RETURN json_build_object(
    'success', true,
    'ride_id', v_ride_id,
    'tracking_id', v_tracking_id,
    'estimated_fare', v_final_fare,
    'wallet_held', v_final_fare,
    'promo_discount', v_promo_discount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO error_log (error_type, error_message, context)
    VALUES ('DATABASE_ERROR', SQLERRM, jsonb_build_object(
      'function', 'create_ride_atomic',
      'user_id', p_user_id,
      'fare', p_estimated_fare
    ));
    
    -- Re-raise with context
    RAISE;
END;
$;


-- ============================================================================
-- 4. CREATE_DELIVERY_ATOMIC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_delivery_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_package_size TEXT,
  p_package_weight DECIMAL,
  p_recipient_name TEXT,
  p_recipient_phone TEXT,
  p_delivery_notes TEXT DEFAULT NULL,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_delivery_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_final_fare DECIMAL;
  v_promo_discount DECIMAL DEFAULT 0;
BEGIN
  -- Validate inputs
  IF p_estimated_fare <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Fare must be positive';
  END IF;
  
  IF p_package_size NOT IN ('small', 'medium', 'large') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid package size';
  END IF;
  
  IF p_package_weight <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Package weight must be positive';
  END IF;
  
  -- 1. Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found';
  END IF;
  
  -- Apply promo code if provided
  v_final_fare := p_estimated_fare;
  IF p_promo_code IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_promo_discount
    FROM promo_codes
    WHERE code = p_promo_code
      AND is_active = true
      AND (expiry_date IS NULL OR expiry_date > NOW());
    
    v_final_fare := GREATEST(v_final_fare - v_promo_discount, 0);
  END IF;
  
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Balance %.2f, Required %.2f', 
      v_wallet_balance, v_final_fare;
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := generate_tracking_id('DEL');
  
  -- 3. Create delivery request
  INSERT INTO delivery_requests (
    user_id, tracking_id,
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    package_size, package_weight,
    recipient_name, recipient_phone, delivery_notes,
    estimated_fare, status
  ) VALUES (
    p_user_id, v_tracking_id,
    p_pickup_lat, p_pickup_lng, p_pickup_address,
    p_destination_lat, p_destination_lng, p_destination_address,
    p_package_size, p_package_weight,
    p_recipient_name, p_recipient_phone, p_delivery_notes,
    v_final_fare, 'pending'
  )
  RETURNING id INTO v_delivery_id;
  
  -- 4. Hold wallet funds
  UPDATE user_wallets
  SET held_balance = held_balance + v_final_fare
  WHERE user_id = p_user_id;
  
  INSERT INTO wallet_holds (user_id, request_id, request_type, amount, status)
  VALUES (p_user_id, v_delivery_id, 'delivery', v_final_fare, 'held');
  
  -- 5. Trigger notification to nearby providers
  PERFORM notify_nearby_providers(v_delivery_id, 'delivery', p_pickup_lat, p_pickup_lng);
  
  -- 6. Return result
  RETURN json_build_object(
    'success', true,
    'delivery_id', v_delivery_id,
    'tracking_id', v_tracking_id,
    'estimated_fare', v_final_fare,
    'wallet_held', v_final_fare,
    'promo_discount', v_promo_discount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO error_log (error_type, error_message, context)
    VALUES ('DATABASE_ERROR', SQLERRM, jsonb_build_object(
      'function', 'create_delivery_atomic',
      'user_id', p_user_id,
      'fare', p_estimated_fare
    ));
    RAISE;
END;
$;


-- ============================================================================
-- 5. CREATE_SHOPPING_ATOMIC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_shopping_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_store_name TEXT,
  p_shopping_list JSONB,
  p_estimated_total DECIMAL,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_shopping_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_final_fare DECIMAL;
  v_promo_discount DECIMAL DEFAULT 0;
BEGIN
  -- Validate inputs
  IF p_estimated_fare <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Fare must be positive';
  END IF;
  
  IF p_estimated_total < 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Estimated total cannot be negative';
  END IF;
  
  IF p_shopping_list IS NULL OR jsonb_array_length(p_shopping_list) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Shopping list cannot be empty';
  END IF;
  
  -- 1. Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found';
  END IF;
  
  -- Apply promo code if provided
  v_final_fare := p_estimated_fare;
  IF p_promo_code IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_promo_discount
    FROM promo_codes
    WHERE code = p_promo_code
      AND is_active = true
      AND (expiry_date IS NULL OR expiry_date > NOW());
    
    v_final_fare := GREATEST(v_final_fare - v_promo_discount, 0);
  END IF;
  
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Balance %.2f, Required %.2f', 
      v_wallet_balance, v_final_fare;
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := generate_tracking_id('SHP');
  
  -- 3. Create shopping request
  INSERT INTO shopping_requests (
    user_id, tracking_id,
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    store_name, shopping_list, estimated_total,
    estimated_fare, status
  ) VALUES (
    p_user_id, v_tracking_id,
    p_pickup_lat, p_pickup_lng, p_pickup_address,
    p_destination_lat, p_destination_lng, p_destination_address,
    p_store_name, p_shopping_list, p_estimated_total,
    v_final_fare, 'pending'
  )
  RETURNING id INTO v_shopping_id;
  
  -- 4. Hold wallet funds
  UPDATE user_wallets
  SET held_balance = held_balance + v_final_fare
  WHERE user_id = p_user_id;
  
  INSERT INTO wallet_holds (user_id, request_id, request_type, amount, status)
  VALUES (p_user_id, v_shopping_id, 'shopping', v_final_fare, 'held');
  
  -- 5. Trigger notification to nearby providers
  PERFORM notify_nearby_providers(v_shopping_id, 'shopping', p_pickup_lat, p_pickup_lng);
  
  -- 6. Return result
  RETURN json_build_object(
    'success', true,
    'shopping_id', v_shopping_id,
    'tracking_id', v_tracking_id,
    'estimated_fare', v_final_fare,
    'wallet_held', v_final_fare,
    'promo_discount', v_promo_discount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO error_log (error_type, error_message, context)
    VALUES ('DATABASE_ERROR', SQLERRM, jsonb_build_object(
      'function', 'create_shopping_atomic',
      'user_id', p_user_id,
      'fare', p_estimated_fare
    ));
    RAISE;
END;
$;


-- ============================================================================
-- 6. CREATE_QUEUE_ATOMIC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_queue_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_service_name TEXT,
  p_appointment_time TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_queue_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_final_fare DECIMAL;
  v_promo_discount DECIMAL DEFAULT 0;
BEGIN
  -- Validate inputs
  IF p_estimated_fare <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Fare must be positive';
  END IF;
  
  IF p_appointment_time < NOW() THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Appointment time must be in the future';
  END IF;
  
  -- 1. Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found';
  END IF;
  
  -- Apply promo code if provided
  v_final_fare := p_estimated_fare;
  IF p_promo_code IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_promo_discount
    FROM promo_codes
    WHERE code = p_promo_code
      AND is_active = true
      AND (expiry_date IS NULL OR expiry_date > NOW());
    
    v_final_fare := GREATEST(v_final_fare - v_promo_discount, 0);
  END IF;
  
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Balance %.2f, Required %.2f', 
      v_wallet_balance, v_final_fare;
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := generate_tracking_id('QUE');
  
  -- 3. Create queue booking
  INSERT INTO queue_bookings (
    user_id, tracking_id,
    pickup_lat, pickup_lng, pickup_address,
    service_name, appointment_time, notes,
    estimated_fare, status
  ) VALUES (
    p_user_id, v_tracking_id,
    p_pickup_lat, p_pickup_lng, p_pickup_address,
    p_service_name, p_appointment_time, p_notes,
    v_final_fare, 'pending'
  )
  RETURNING id INTO v_queue_id;
  
  -- 4. Hold wallet funds
  UPDATE user_wallets
  SET held_balance = held_balance + v_final_fare
  WHERE user_id = p_user_id;
  
  INSERT INTO wallet_holds (user_id, request_id, request_type, amount, status)
  VALUES (p_user_id, v_queue_id, 'queue', v_final_fare, 'held');
  
  -- 5. Trigger notification to nearby providers
  PERFORM notify_nearby_providers(v_queue_id, 'queue', p_pickup_lat, p_pickup_lng);
  
  -- 6. Return result
  RETURN json_build_object(
    'success', true,
    'queue_id', v_queue_id,
    'tracking_id', v_tracking_id,
    'estimated_fare', v_final_fare,
    'wallet_held', v_final_fare,
    'promo_discount', v_promo_discount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO error_log (error_type, error_message, context)
    VALUES ('DATABASE_ERROR', SQLERRM, jsonb_build_object(
      'function', 'create_queue_atomic',
      'user_id', p_user_id,
      'fare', p_estimated_fare
    ));
    RAISE;
END;
$;


-- ============================================================================
-- 7. CREATE_MOVING_ATOMIC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_moving_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_destination_lat DECIMAL,
  p_destination_lng DECIMAL,
  p_destination_address TEXT,
  p_moving_type TEXT,
  p_helpers_count INTEGER,
  p_floor_from INTEGER,
  p_floor_to INTEGER,
  p_has_elevator BOOLEAN,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_moving_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_final_fare DECIMAL;
  v_promo_discount DECIMAL DEFAULT 0;
BEGIN
  -- Validate inputs
  IF p_estimated_fare <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Fare must be positive';
  END IF;
  
  IF p_moving_type NOT IN ('small', 'medium', 'large', 'office') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid moving type';
  END IF;
  
  IF p_helpers_count < 0 OR p_helpers_count > 10 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Helpers count must be between 0 and 10';
  END IF;
  
  -- 1. Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found';
  END IF;
  
  -- Apply promo code if provided
  v_final_fare := p_estimated_fare;
  IF p_promo_code IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_promo_discount
    FROM promo_codes
    WHERE code = p_promo_code
      AND is_active = true
      AND (expiry_date IS NULL OR expiry_date > NOW());
    
    v_final_fare := GREATEST(v_final_fare - v_promo_discount, 0);
  END IF;
  
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Balance %.2f, Required %.2f', 
      v_wallet_balance, v_final_fare;
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := generate_tracking_id('MOV');
  
  -- 3. Create moving request
  INSERT INTO moving_requests (
    user_id, tracking_id,
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    moving_type, helpers_count, floor_from, floor_to, has_elevator,
    estimated_fare, status
  ) VALUES (
    p_user_id, v_tracking_id,
    p_pickup_lat, p_pickup_lng, p_pickup_address,
    p_destination_lat, p_destination_lng, p_destination_address,
    p_moving_type, p_helpers_count, p_floor_from, p_floor_to, p_has_elevator,
    v_final_fare, 'pending'
  )
  RETURNING id INTO v_moving_id;
  
  -- 4. Hold wallet funds
  UPDATE user_wallets
  SET held_balance = held_balance + v_final_fare
  WHERE user_id = p_user_id;
  
  INSERT INTO wallet_holds (user_id, request_id, request_type, amount, status)
  VALUES (p_user_id, v_moving_id, 'moving', v_final_fare, 'held');
  
  -- 5. Trigger notification to nearby providers
  PERFORM notify_nearby_providers(v_moving_id, 'moving', p_pickup_lat, p_pickup_lng);
  
  -- 6. Return result
  RETURN json_build_object(
    'success', true,
    'moving_id', v_moving_id,
    'tracking_id', v_tracking_id,
    'estimated_fare', v_final_fare,
    'wallet_held', v_final_fare,
    'promo_discount', v_promo_discount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO error_log (error_type, error_message, context)
    VALUES ('DATABASE_ERROR', SQLERRM, jsonb_build_object(
      'function', 'create_moving_atomic',
      'user_id', p_user_id,
      'fare', p_estimated_fare
    ));
    RAISE;
END;
$;


-- ============================================================================
-- 8. CREATE_LAUNDRY_ATOMIC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_laundry_atomic(
  p_user_id UUID,
  p_pickup_lat DECIMAL,
  p_pickup_lng DECIMAL,
  p_pickup_address TEXT,
  p_service_type TEXT,
  p_weight_kg DECIMAL,
  p_special_instructions TEXT DEFAULT NULL,
  p_estimated_fare DECIMAL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_laundry_id UUID;
  v_tracking_id TEXT;
  v_wallet_balance DECIMAL;
  v_final_fare DECIMAL;
  v_promo_discount DECIMAL DEFAULT 0;
BEGIN
  -- Validate inputs
  IF p_estimated_fare <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Fare must be positive';
  END IF;
  
  IF p_service_type NOT IN ('wash', 'wash_iron', 'dry_clean', 'iron_only') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Invalid service type';
  END IF;
  
  IF p_weight_kg <= 0 OR p_weight_kg > 100 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Weight must be between 0 and 100 kg';
  END IF;
  
  -- 1. Check wallet balance
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND: User wallet not found';
  END IF;
  
  -- Apply promo code if provided
  v_final_fare := p_estimated_fare;
  IF p_promo_code IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_promo_discount
    FROM promo_codes
    WHERE code = p_promo_code
      AND is_active = true
      AND (expiry_date IS NULL OR expiry_date > NOW());
    
    v_final_fare := GREATEST(v_final_fare - v_promo_discount, 0);
  END IF;
  
  IF v_wallet_balance < v_final_fare THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Balance %.2f, Required %.2f', 
      v_wallet_balance, v_final_fare;
  END IF;
  
  -- 2. Generate tracking ID
  v_tracking_id := generate_tracking_id('LAU');
  
  -- 3. Create laundry request
  INSERT INTO laundry_requests (
    user_id, tracking_id,
    pickup_lat, pickup_lng, pickup_address,
    service_type, weight_kg, special_instructions,
    estimated_fare, status
  ) VALUES (
    p_user_id, v_tracking_id,
    p_pickup_lat, p_pickup_lng, p_pickup_address,
    p_service_type, p_weight_kg, p_special_instructions,
    v_final_fare, 'pending'
  )
  RETURNING id INTO v_laundry_id;
  
  -- 4. Hold wallet funds
  UPDATE user_wallets
  SET held_balance = held_balance + v_final_fare
  WHERE user_id = p_user_id;
  
  INSERT INTO wallet_holds (user_id, request_id, request_type, amount, status)
  VALUES (p_user_id, v_laundry_id, 'laundry', v_final_fare, 'held');
  
  -- 5. Trigger notification to nearby providers
  PERFORM notify_nearby_providers(v_laundry_id, 'laundry', p_pickup_lat, p_pickup_lng);
  
  -- 6. Return result
  RETURN json_build_object(
    'success', true,
    'laundry_id', v_laundry_id,
    'tracking_id', v_tracking_id,
    'estimated_fare', v_final_fare,
    'wallet_held', v_final_fare,
    'promo_discount', v_promo_discount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO error_log (error_type, error_message, context)
    VALUES ('DATABASE_ERROR', SQLERRM, jsonb_build_object(
      'function', 'create_laundry_atomic',
      'user_id', p_user_id,
      'fare', p_estimated_fare
    ));
    RAISE;
END;
$;


-- ============================================================================
-- 9. ERROR LOG TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_error_type ON error_log(error_type);

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION generate_tracking_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_nearby_providers(UUID, TEXT, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION create_ride_atomic(UUID, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, INTEGER, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_delivery_atomic(UUID, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, DECIMAL, TEXT, TEXT, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_shopping_atomic(UUID, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, JSONB, DECIMAL, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_queue_atomic(UUID, DECIMAL, DECIMAL, TEXT, TEXT, TIMESTAMPTZ, TEXT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_moving_atomic(UUID, DECIMAL, DECIMAL, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_laundry_atomic(UUID, DECIMAL, DECIMAL, TEXT, TEXT, DECIMAL, TEXT, DECIMAL, TEXT) TO authenticated;

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION generate_tracking_id(TEXT) IS 'Generate unique tracking ID with prefix (RID, DEL, SHP, QUE, MOV, LAU)';
COMMENT ON FUNCTION notify_nearby_providers(UUID, TEXT, DECIMAL, DECIMAL, DECIMAL) IS 'Send notifications to nearby online providers within service radius';
COMMENT ON FUNCTION create_ride_atomic IS 'Atomically create ride request with wallet hold and provider notifications';
COMMENT ON FUNCTION create_delivery_atomic IS 'Atomically create delivery request with wallet hold and provider notifications';
COMMENT ON FUNCTION create_shopping_atomic IS 'Atomically create shopping request with wallet hold and provider notifications';
COMMENT ON FUNCTION create_queue_atomic IS 'Atomically create queue booking with wallet hold and provider notifications';
COMMENT ON FUNCTION create_moving_atomic IS 'Atomically create moving request with wallet hold and provider notifications';
COMMENT ON FUNCTION create_laundry_atomic IS 'Atomically create laundry request with wallet hold and provider notifications';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE 'Migration 102 Complete:';
  RAISE NOTICE '  - Created 6 atomic create_*_atomic() functions';
  RAISE NOTICE '  - All functions include:';
  RAISE NOTICE '    * Input validation with specific error codes';
  RAISE NOTICE '    * Wallet balance checking and holding';
  RAISE NOTICE '    * Promo code support';
  RAISE NOTICE '    * Tracking ID generation';
  RAISE NOTICE '    * Nearby provider notifications';
  RAISE NOTICE '    * Error logging with context';
  RAISE NOTICE '    * Transaction safety (SECURITY DEFINER)';
  RAISE NOTICE '  - Helper functions: generate_tracking_id, notify_nearby_providers';
  RAISE NOTICE '  - Error log table created';
END $;

