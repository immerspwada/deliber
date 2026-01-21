-- Migration: 277_setup_share_link_cleanup_cron.sql
-- Author: Kiro
-- Date: 2026-01-15
-- Description: Setup pg_cron job to cleanup expired share links every hour

-- Note: pg_cron extension must be enabled in Supabase Dashboard first
-- Go to: Database > Extensions > Search "pg_cron" > Enable

-- 1. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3. Schedule cleanup job to run every hour
SELECT cron.schedule(
  'cleanup-expired-share-links',  -- job name
  '0 * * * *',                    -- every hour at minute 0
  $$SELECT public.cleanup_expired_share_links()$$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To manually run the cleanup:
-- SELECT public.cleanup_expired_share_links();

-- To unschedule the job:
-- SELECT cron.unschedule('cleanup-expired-share-links');
