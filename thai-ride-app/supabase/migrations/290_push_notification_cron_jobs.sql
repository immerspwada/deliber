-- Migration: 290_push_notification_cron_jobs.sql
-- Description: Scheduled jobs for silent push and log cleanup
-- Role Impact:
--   - Provider: Receives silent push for background sync
--   - Admin: Logs are automatically cleaned up

-- ============================================
-- 1. Silent Push Cron Job (every 15 minutes)
-- ============================================

-- Function to send silent push to online providers
CREATE OR REPLACE FUNCTION send_silent_push_to_online_providers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_edge_function_url TEXT;
  v_service_role_key TEXT;
  v_provider_count INTEGER := 0;
BEGIN
  -- Get configuration
  v_edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Skip if not configured
  IF v_edge_function_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE NOTICE '[Silent Push] Edge function not configured, skipping';
    RETURN 0;
  END IF;

  -- Get count of online providers with active subscriptions
  SELECT COUNT(DISTINCT ps.provider_id) INTO v_provider_count
  FROM push_subscriptions ps
  INNER JOIN providers_v2 p ON p.id = ps.provider_id
  WHERE ps.is_active = true
    AND p.is_online = true
    AND p.status = 'approved';

  IF v_provider_count = 0 THEN
    RAISE NOTICE '[Silent Push] No online providers with subscriptions';
    RETURN 0;
  END IF;

  -- Call Edge Function to send silent push
  BEGIN
    PERFORM net.http_post(
      url := v_edge_function_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'action', 'send_silent_sync',
        'sync', ARRAY['jobs', 'earnings']
      )
    );
    
    RAISE NOTICE '[Silent Push] Sent to % online providers', v_provider_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[Silent Push] Failed: %', SQLERRM;
  END;

  RETURN v_provider_count;
END;
$$;

-- Schedule silent push every 15 minutes (if pg_cron is available)
DO $$
BEGIN
  -- Check if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('silent-push-sync');
    
    -- Schedule new job
    PERFORM cron.schedule(
      'silent-push-sync',
      '*/15 * * * *', -- Every 15 minutes
      'SELECT send_silent_push_to_online_providers()'
    );
    
    RAISE NOTICE '[Cron] Silent push job scheduled';
  ELSE
    RAISE NOTICE '[Cron] pg_cron not available, silent push job not scheduled';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[Cron] Failed to schedule silent push: %', SQLERRM;
END $$;

-- ============================================
-- 2. Log Cleanup Cron Job (daily at midnight)
-- ============================================

-- Schedule log cleanup daily at midnight (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('push-logs-cleanup');
    
    -- Schedule new job
    PERFORM cron.schedule(
      'push-logs-cleanup',
      '0 0 * * *', -- Daily at midnight
      'SELECT cleanup_old_push_logs()'
    );
    
    RAISE NOTICE '[Cron] Push logs cleanup job scheduled';
  ELSE
    RAISE NOTICE '[Cron] pg_cron not available, cleanup job not scheduled';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[Cron] Failed to schedule cleanup: %', SQLERRM;
END $$;

-- ============================================
-- 3. Comments
-- ============================================

COMMENT ON FUNCTION send_silent_push_to_online_providers() IS 'Sends silent push to all online providers for background sync';

-- ============================================
-- 4. Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION send_silent_push_to_online_providers() TO service_role;
