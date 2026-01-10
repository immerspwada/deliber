-- ============================================================================
-- Provider System Redesign - Database Functions and Triggers
-- Migration: 219
-- Description: Core functions for provider system operations
-- ============================================================================

-- ============================================================================
-- PART 1: PROVIDER LOCATION TRACKING
-- ============================================================================

-- Update provider location during active job
CREATE OR REPLACE FUNCTION update_provider_location(
  p_job_id UUID,
  p_location GEOGRAPHY
) RETURNS VOID AS $$
BEGIN
  UPDATE jobs_v2
  SET provider_location = p_location,
      updated_at = NOW()
  WHERE id = p_job_id
    AND status IN ('accepted', 'arrived', 'in_progress');
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'JOB_NOT_ACTIVE: Job is not in active state';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: JOB ACCEPTANCE
-- ============================================================================

-- Accept job with validation
CREATE OR REPLACE FUNCTION accept_job(
  p_job_id UUID,
  p_provider_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_job_status job_status;
  v_provider_has_active_job BOOLEAN;
  v_provider_status provider_status;
  v_provider_is_online BOOLEAN;
BEGIN
  -- Check provider status and online state
  SELECT status, is_online INTO v_provider_status, v_provider_is_online
  FROM providers_v2
  WHERE id = p_provider_id;
  
  IF v_provider_status NOT IN ('approved', 'active') THEN
    RAISE EXCEPTION 'PROVIDER_NOT_APPROVED: Provider is not approved';
  END IF;
  
  IF NOT v_provider_is_online THEN
    RAISE EXCEPTION 'PROVIDER_OFFLINE: Provider must be online to accept jobs';
  END IF;
  
  -- Check if job is still available
  SELECT status INTO v_job_status
  FROM jobs_v2
  WHERE id = p_job_id
  FOR UPDATE;
  
  IF v_job_status IS NULL THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND: Job does not exist';
  END IF;
  
  IF v_job_status != 'offered' AND v_job_status != 'pending' THEN
    RAISE EXCEPTION 'JOB_NOT_AVAILABLE: Job has already been accepted';
  END IF;
  
  -- Check if provider has active job
  SELECT EXISTS(
    SELECT 1 FROM jobs_v2
    WHERE provider_id = p_provider_id
    AND status IN ('accepted', 'arrived', 'in_progress')
  ) INTO v_provider_has_active_job;
  
  IF v_provider_has_active_job THEN
    RAISE EXCEPTION 'PROVIDER_HAS_ACTIVE_JOB: Provider already has an active job';
  END IF;
  
  -- Accept job
  UPDATE jobs_v2
  SET status = 'accepted',
      provider_id = p_provider_id,
      accepted_at = NOW()
  WHERE id = p_job_id;
  
  -- Update provider status to active
  UPDATE providers_v2
  SET status = 'active'
  WHERE id = p_provider_id
    AND status = 'approved';
  
  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'provider_id', p_provider_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 3: EARNINGS CALCULATION
-- ============================================================================

-- Calculate earnings for completed job
CREATE OR REPLACE FUNCTION calculate_earnings(
  p_job_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_job jobs_v2%ROWTYPE;
  v_gross_earnings DECIMAL(10,2);
  v_platform_fee DECIMAL(10,2);
  v_net_earnings DECIMAL(10,2);
  v_platform_fee_rate DECIMAL(3,2) := 0.20; -- 20% platform fee
BEGIN
  -- Get job details
  SELECT * INTO v_job
  FROM jobs_v2
  WHERE id = p_job_id;
  
  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'JOB_NOT_FOUND: Job does not exist';
  END IF;
  
  IF v_job.status != 'completed' THEN
    RAISE EXCEPTION 'JOB_NOT_COMPLETED: Job must be completed to calculate earnings';
  END IF;
  
  -- Calculate gross earnings
  v_gross_earnings := v_job.base_fare + 
                      v_job.distance_fare + 
                      v_job.time_fare + 
                      v_job.tip_amount +
                      ((v_job.base_fare + v_job.distance_fare + v_job.time_fare) * (v_job.surge_multiplier - 1));
  
  -- Calculate platform fee
  v_platform_fee := v_gross_earnings * v_platform_fee_rate;
  
  -- Calculate net earnings
  v_net_earnings := v_gross_earnings - v_platform_fee;
  
  -- Insert earnings record
  INSERT INTO earnings_v2 (
    provider_id,
    job_id,
    base_fare,
    distance_fare,
    time_fare,
    surge_amount,
    tip_amount,
    bonus_amount,
    gross_earnings,
    platform_fee,
    net_earnings,
    service_type,
    earned_at
  ) VALUES (
    v_job.provider_id,
    p_job_id,
    v_job.base_fare,
    v_job.distance_fare,
    v_job.time_fare,
    (v_job.base_fare + v_job.distance_fare + v_job.time_fare) * (v_job.surge_multiplier - 1),
    v_job.tip_amount,
    0, -- bonus_amount (calculated separately)
    v_gross_earnings,
    v_platform_fee,
    v_net_earnings,
    v_job.service_type,
    NOW()
  );
  
  -- Update job with actual earnings
  UPDATE jobs_v2
  SET actual_earnings = v_net_earnings
  WHERE id = p_job_id;
  
  RETURN jsonb_build_object(
    'gross_earnings', v_gross_earnings,
    'platform_fee', v_platform_fee,
    'net_earnings', v_net_earnings
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: WALLET INTEGRATION
-- ============================================================================

-- Trigger to update wallet on earning
CREATE OR REPLACE FUNCTION update_wallet_on_earning()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from provider
  SELECT user_id INTO v_user_id
  FROM providers_v2
  WHERE id = NEW.provider_id;
  
  -- Update wallet balance
  UPDATE wallets
  SET balance = balance + NEW.net_earnings,
      updated_at = NOW()
  WHERE user_id = v_user_id;
  
  -- If wallet doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance, created_at, updated_at)
    VALUES (v_user_id, NEW.net_earnings, NOW(), NOW());
  END IF;
  
  -- Update provider total earnings and trips
  UPDATE providers_v2
  SET total_earnings = total_earnings + NEW.net_earnings,
      total_trips = total_trips + 1,
      updated_at = NOW()
  WHERE id = NEW.provider_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_wallet_on_earning ON earnings_v2;
CREATE TRIGGER trigger_update_wallet_on_earning
  AFTER INSERT ON earnings_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_on_earning();

-- ============================================================================
-- PART 5: DOCUMENT EXPIRY CHECK
-- ============================================================================

-- Check and suspend providers with expired documents
CREATE OR REPLACE FUNCTION check_document_expiry()
RETURNS VOID AS $$
BEGIN
  -- Update expired documents
  UPDATE provider_documents_v2
  SET status = 'expired'
  WHERE status = 'approved'
    AND expiry_date IS NOT NULL
    AND expiry_date < CURRENT_DATE;
  
  -- Suspend providers with expired required documents
  UPDATE providers_v2 p
  SET status = 'suspended',
      suspended_at = NOW(),
      suspension_reason = 'Required document expired'
  WHERE status IN ('approved', 'active')
    AND EXISTS (
      SELECT 1 FROM provider_documents_v2 d
      WHERE d.provider_id = p.id
        AND d.status = 'expired'
        AND d.document_type IN ('national_id', 'driver_license', 'vehicle_registration')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: PROVIDER ACCESS CONTROL
-- ============================================================================

-- Check if user can access provider routes
CREATE OR REPLACE FUNCTION can_access_provider_routes(
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_provider providers_v2%ROWTYPE;
  v_can_access BOOLEAN := FALSE;
  v_message TEXT;
BEGIN
  -- Get provider record
  SELECT * INTO v_provider
  FROM providers_v2
  WHERE user_id = p_user_id;
  
  -- If no provider record, cannot access
  IF v_provider.id IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'status', 'no_provider',
      'message', 'No provider account found'
    );
  END IF;
  
  -- Check status
  CASE v_provider.status
    WHEN 'pending' THEN
      v_message := 'Application pending - please complete registration';
    WHEN 'pending_verification' THEN
      v_message := 'Documents under review';
    WHEN 'approved', 'active' THEN
      v_can_access := TRUE;
      v_message := 'Access granted';
    WHEN 'suspended' THEN
      v_message := 'Account suspended: ' || COALESCE(v_provider.suspension_reason, 'Contact support');
    WHEN 'rejected' THEN
      v_message := 'Application rejected';
    ELSE
      v_message := 'Unknown status';
  END CASE;
  
  RETURN jsonb_build_object(
    'can_access', v_can_access,
    'status', v_provider.status,
    'message', v_message,
    'provider_id', v_provider.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: PERFORMANCE METRICS VIEW
-- ============================================================================

-- Create materialized view for performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_performance_metrics_v2 AS
SELECT
  p.id AS provider_id,
  p.rating,
  
  -- Acceptance rate
  COALESCE(
    COUNT(CASE WHEN j.status IN ('accepted', 'completed') THEN 1 END)::DECIMAL /
    NULLIF(COUNT(CASE WHEN j.status = 'offered' THEN 1 END), 0),
    0
  ) AS acceptance_rate,
  
  -- Completion rate
  COALESCE(
    COUNT(CASE WHEN j.status = 'completed' THEN 1 END)::DECIMAL /
    NULLIF(COUNT(CASE WHEN j.status IN ('accepted', 'arrived', 'in_progress', 'completed') THEN 1 END), 0),
    0
  ) AS completion_rate,
  
  -- Cancellation rate
  COALESCE(
    COUNT(CASE WHEN j.status = 'cancelled' AND j.cancelled_by = 'provider' THEN 1 END)::DECIMAL /
    NULLIF(COUNT(CASE WHEN j.status IN ('accepted', 'arrived', 'in_progress', 'completed', 'cancelled') THEN 1 END), 0),
    0
  ) AS cancellation_rate,
  
  -- Counts
  COUNT(CASE WHEN j.status = 'completed' THEN 1 END) AS total_completed_jobs,
  COUNT(CASE WHEN j.status = 'cancelled' THEN 1 END) AS total_cancelled_jobs,
  COUNT(CASE WHEN j.status = 'offered' THEN 1 END) AS total_offered_jobs,
  
  -- Last updated
  NOW() AS calculated_at
FROM providers_v2 p
LEFT JOIN jobs_v2 j ON j.provider_id = p.id
GROUP BY p.id, p.rating;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_performance_metrics_v2_provider 
  ON provider_performance_metrics_v2(provider_id);

-- Function to refresh performance metrics
CREATE OR REPLACE FUNCTION refresh_provider_performance_metrics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_performance_metrics_v2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: PROVIDER UID GENERATION
-- ============================================================================

-- Generate unique provider UID
CREATE OR REPLACE FUNCTION generate_provider_uid()
RETURNS TEXT AS $$
DECLARE
  v_uid TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate UID: PRV + 8 random digits
    v_uid := 'PRV' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    
    -- Check if exists
    SELECT EXISTS(
      SELECT 1 FROM providers_v2 WHERE provider_uid = v_uid
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: ADMIN FUNCTIONS
-- ============================================================================

-- Approve provider
CREATE OR REPLACE FUNCTION admin_approve_provider(
  p_provider_id UUID,
  p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_provider_uid TEXT;
  v_user_id UUID;
BEGIN
  -- Generate provider UID
  v_provider_uid := generate_provider_uid();
  
  -- Update provider
  UPDATE providers_v2
  SET status = 'approved',
      provider_uid = v_provider_uid,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_provider_id
  RETURNING user_id INTO v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVIDER_NOT_FOUND: Provider does not exist';
  END IF;
  
  -- Create notification
  INSERT INTO notifications_v2 (
    recipient_id,
    type,
    title,
    body,
    data,
    sent_push,
    sent_email
  ) VALUES (
    v_user_id,
    'application_approved',
    'Application Approved!',
    'Your provider application has been approved. You can now start accepting jobs.',
    jsonb_build_object('provider_uid', v_provider_uid),
    TRUE,
    TRUE
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'provider_uid', v_provider_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject provider
CREATE OR REPLACE FUNCTION admin_reject_provider(
  p_provider_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REASON_REQUIRED: Rejection reason is required';
  END IF;
  
  -- Update provider
  UPDATE providers_v2
  SET status = 'rejected',
      suspension_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_provider_id
  RETURNING user_id INTO v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVIDER_NOT_FOUND: Provider does not exist';
  END IF;
  
  -- Create notification
  INSERT INTO notifications_v2 (
    recipient_id,
    type,
    title,
    body,
    data,
    sent_push,
    sent_email
  ) VALUES (
    v_user_id,
    'application_rejected',
    'Application Rejected',
    'Your provider application has been rejected. Reason: ' || p_reason,
    jsonb_build_object('reason', p_reason),
    TRUE,
    TRUE
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Suspend provider
CREATE OR REPLACE FUNCTION admin_suspend_provider(
  p_provider_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_cancelled_jobs INTEGER;
BEGIN
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0 THEN
    RAISE EXCEPTION 'REASON_REQUIRED: Suspension reason is required';
  END IF;
  
  -- Update provider
  UPDATE providers_v2
  SET status = 'suspended',
      suspended_at = NOW(),
      suspension_reason = p_reason,
      is_online = FALSE,
      updated_at = NOW()
  WHERE id = p_provider_id
  RETURNING user_id INTO v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROVIDER_NOT_FOUND: Provider does not exist';
  END IF;
  
  -- Cancel active jobs
  UPDATE jobs_v2
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = 'system',
      cancellation_reason = 'Provider suspended: ' || p_reason
  WHERE provider_id = p_provider_id
    AND status IN ('accepted', 'arrived', 'in_progress');
  
  GET DIAGNOSTICS v_cancelled_jobs = ROW_COUNT;
  
  -- Create notification
  INSERT INTO notifications_v2 (
    recipient_id,
    type,
    title,
    body,
    data,
    sent_push,
    sent_email
  ) VALUES (
    v_user_id,
    'account_suspended',
    'Account Suspended',
    'Your provider account has been suspended. Reason: ' || p_reason,
    jsonb_build_object('reason', p_reason, 'cancelled_jobs', v_cancelled_jobs),
    TRUE,
    TRUE
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'cancelled_jobs', v_cancelled_jobs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_provider_location TO authenticated;
GRANT EXECUTE ON FUNCTION accept_job TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_provider_routes TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_provider_performance_metrics TO authenticated;

-- Grant execute permissions to service role (for admin functions)
GRANT EXECUTE ON FUNCTION admin_approve_provider TO service_role;
GRANT EXECUTE ON FUNCTION admin_reject_provider TO service_role;
GRANT EXECUTE ON FUNCTION admin_suspend_provider TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION update_provider_location IS 'Update provider location during active job';
COMMENT ON FUNCTION accept_job IS 'Accept job with validation checks';
COMMENT ON FUNCTION calculate_earnings IS 'Calculate and record earnings for completed job';
COMMENT ON FUNCTION update_wallet_on_earning IS 'Trigger to update wallet when earnings are added';
COMMENT ON FUNCTION check_document_expiry IS 'Check and suspend providers with expired documents';
COMMENT ON FUNCTION can_access_provider_routes IS 'Check if user can access provider routes';
COMMENT ON FUNCTION generate_provider_uid IS 'Generate unique provider UID';
COMMENT ON FUNCTION admin_approve_provider IS 'Admin function to approve provider';
COMMENT ON FUNCTION admin_reject_provider IS 'Admin function to reject provider';
COMMENT ON FUNCTION admin_suspend_provider IS 'Admin function to suspend provider';

