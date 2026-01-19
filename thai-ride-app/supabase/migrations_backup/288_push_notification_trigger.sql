-- Migration: 288_push_notification_trigger.sql
-- Description: Database trigger to send push notifications when new jobs are created
-- Role Impact:
--   - Provider: Receives push notification for new jobs
--   - Customer: No impact
--   - Admin: Can monitor notification delivery

-- Function to notify providers of new jobs via Edge Function
CREATE OR REPLACE FUNCTION notify_providers_new_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_function_url TEXT;
  v_service_role_key TEXT;
  v_job_data JSONB;
  v_response JSONB;
BEGIN
  -- Only trigger on new pending jobs
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL from environment (set via vault or config)
  v_edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- If settings not available, skip (local dev without push)
  IF v_edge_function_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE '[Push] Edge function URL or service key not configured, skipping notification';
    RETURN NEW;
  END IF;

  -- Prepare job data
  v_job_data := jsonb_build_object(
    'action', 'send_new_job',
    'job', jsonb_build_object(
      'id', NEW.id,
      'service_type', COALESCE(NEW.service_type, 'ride'),
      'pickup_address', NEW.pickup_address,
      'estimated_fare', COALESCE(NEW.estimated_fare, 0)
    )
  );

  -- Call Edge Function asynchronously using pg_net (if available)
  -- Note: pg_net extension must be enabled for async HTTP calls
  BEGIN
    PERFORM net.http_post(
      url := v_edge_function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_role_key,
        'Content-Type', 'application/json'
      ),
      body := v_job_data
    );
    
    RAISE NOTICE '[Push] New job notification queued for job %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING '[Push] Failed to queue notification for job %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger on ride_requests table
DROP TRIGGER IF EXISTS trigger_notify_new_ride_request ON ride_requests;
CREATE TRIGGER trigger_notify_new_ride_request
  AFTER INSERT ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_providers_new_job();

-- Also create trigger for delivery_requests if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_requests') THEN
    DROP TRIGGER IF EXISTS trigger_notify_new_delivery_request ON delivery_requests;
    CREATE TRIGGER trigger_notify_new_delivery_request
      AFTER INSERT ON delivery_requests
      FOR EACH ROW
      EXECUTE FUNCTION notify_providers_new_job();
  END IF;
END $$;

-- Comments
COMMENT ON FUNCTION notify_providers_new_job() IS 'Sends push notification to online providers when a new job is created';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_providers_new_job() TO service_role;
