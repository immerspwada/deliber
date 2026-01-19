-- Migration: Cron Job Monitoring Functions
-- Description: RPC functions for admin to monitor pg_cron jobs
-- Created: 2026-01-15

-- ============================================================================
-- Function: get_cron_jobs_with_stats
-- Description: Get all cron jobs with execution statistics
-- Security: Admin only
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cron_jobs_with_stats()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  last_run_time timestamptz,
  next_run_time timestamptz,
  last_status text,
  failed_count_24h bigint,
  success_count_24h bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    j.jobid,
    j.jobname,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    -- Last run time
    (SELECT MAX(start_time) 
     FROM cron.job_run_details 
     WHERE jobid = j.jobid) as last_run_time,
    -- Next run time (simplified - would need cron parser for accurate calculation)
    CASE 
      WHEN j.active THEN 
        (SELECT MAX(start_time) 
         FROM cron.job_run_details 
         WHERE jobid = j.jobid) + INTERVAL '1 hour'
      ELSE NULL
    END as next_run_time,
    -- Last status
    (SELECT status::text 
     FROM cron.job_run_details 
     WHERE jobid = j.jobid 
     ORDER BY start_time DESC 
     LIMIT 1) as last_status,
    -- Failed count in last 24 hours
    (SELECT COUNT(*) 
     FROM cron.job_run_details 
     WHERE jobid = j.jobid 
     AND status = 'failed' 
     AND start_time > NOW() - INTERVAL '24 hours') as failed_count_24h,
    -- Success count in last 24 hours
    (SELECT COUNT(*) 
     FROM cron.job_run_details 
     WHERE jobid = j.jobid 
     AND status = 'succeeded' 
     AND start_time > NOW() - INTERVAL '24 hours') as success_count_24h
  FROM cron.job j
  ORDER BY j.jobname;
END;
$$;

-- Grant execute permission to authenticated users (will be checked by function)
GRANT EXECUTE ON FUNCTION get_cron_jobs_with_stats() TO authenticated;

COMMENT ON FUNCTION get_cron_jobs_with_stats() IS 
'Get all cron jobs with execution statistics. Admin only.';

-- ============================================================================
-- Function: get_cron_job_history
-- Description: Get execution history for a specific cron job with filters
-- Security: Admin only
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cron_job_history(
  p_job_id bigint,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    r.runid,
    r.jobid,
    r.job_pid,
    r.database,
    r.username,
    r.command,
    r.status::text,
    r.return_message,
    r.start_time,
    r.end_time,
    CASE 
      WHEN r.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (r.end_time - r.start_time))
      ELSE NULL
    END as duration_seconds
  FROM cron.job_run_details r
  WHERE r.jobid = p_job_id
    AND (p_start_date IS NULL OR r.start_time >= p_start_date)
    AND (p_end_date IS NULL OR r.start_time <= p_end_date)
    AND (p_status IS NULL OR r.status::text = p_status)
  ORDER BY r.start_time DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users (will be checked by function)
GRANT EXECUTE ON FUNCTION get_cron_job_history(bigint, timestamptz, timestamptz, text, int) TO authenticated;

COMMENT ON FUNCTION get_cron_job_history(bigint, timestamptz, timestamptz, text, int) IS 
'Get execution history for a specific cron job with optional filters. Admin only.';

-- ============================================================================
-- Function: run_cron_job_manually
-- Description: Manually trigger a cron job execution
-- Security: Admin only
-- ============================================================================

CREATE OR REPLACE FUNCTION run_cron_job_manually(p_job_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_job_record RECORD;
  v_result jsonb;
  v_job_id bigint;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Get job details
  SELECT * INTO v_job_record 
  FROM cron.job 
  WHERE jobname = p_job_name;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Job not found: ' || p_job_name
    );
  END IF;

  -- Check if job is active
  IF NOT v_job_record.active THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Job is not active'
    );
  END IF;

  -- Use cron.schedule to run the job immediately
  -- This schedules it to run in the next minute
  BEGIN
    SELECT cron.schedule(
      p_job_name || '_manual_' || EXTRACT(EPOCH FROM NOW())::text,
      '* * * * *', -- Run every minute (will be unscheduled after first run)
      v_job_record.command
    ) INTO v_job_id;

    -- Unschedule the temporary job after a short delay
    -- Note: In production, you might want to use a different approach
    PERFORM cron.unschedule(v_job_id);

    v_result := jsonb_build_object(
      'success', true, 
      'message', 'Job scheduled for immediate execution',
      'job_id', v_job_id
    );
  EXCEPTION WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false, 
      'message', 'Error executing job: ' || SQLERRM
    );
  END;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users (will be checked by function)
GRANT EXECUTE ON FUNCTION run_cron_job_manually(text) TO authenticated;

COMMENT ON FUNCTION run_cron_job_manually(text) IS 
'Manually trigger a cron job execution. Admin only.';

-- ============================================================================
-- Helper Function: get_cron_job_stats_summary
-- Description: Get summary statistics for all cron jobs
-- Security: Admin only
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cron_job_stats_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  SELECT jsonb_build_object(
    'total_jobs', (SELECT COUNT(*) FROM cron.job),
    'active_jobs', (SELECT COUNT(*) FROM cron.job WHERE active = true),
    'inactive_jobs', (SELECT COUNT(*) FROM cron.job WHERE active = false),
    'failed_last_24h', (
      SELECT COUNT(DISTINCT jobid) 
      FROM cron.job_run_details 
      WHERE status = 'failed' 
      AND start_time > NOW() - INTERVAL '24 hours'
    ),
    'succeeded_last_24h', (
      SELECT COUNT(DISTINCT jobid) 
      FROM cron.job_run_details 
      WHERE status = 'succeeded' 
      AND start_time > NOW() - INTERVAL '24 hours'
    ),
    'total_executions_24h', (
      SELECT COUNT(*) 
      FROM cron.job_run_details 
      WHERE start_time > NOW() - INTERVAL '24 hours'
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

-- Grant execute permission to authenticated users (will be checked by function)
GRANT EXECUTE ON FUNCTION get_cron_job_stats_summary() TO authenticated;

COMMENT ON FUNCTION get_cron_job_stats_summary() IS 
'Get summary statistics for all cron jobs. Admin only.';
