-- Migration: 276_share_link_analytics_and_cleanup.sql
-- Author: Kiro
-- Date: 2026-01-15
-- Description: Share Link Analytics tracking and Auto-expire cleanup

-- 1. Create ride_share_link_views table for analytics
CREATE TABLE IF NOT EXISTS public.ride_share_link_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id UUID NOT NULL REFERENCES public.ride_share_links(id) ON DELETE CASCADE,
  viewer_ip VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  is_unique_view BOOLEAN DEFAULT true
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_share_link_views_link ON public.ride_share_link_views(share_link_id);
CREATE INDEX IF NOT EXISTS idx_share_link_views_time ON public.ride_share_link_views(viewed_at);

-- Enable RLS
ALTER TABLE public.ride_share_link_views ENABLE ROW LEVEL SECURITY;

-- RLS: Only link owners can view analytics
DROP POLICY IF EXISTS "link_owners_view_analytics" ON public.ride_share_link_views;
CREATE POLICY "link_owners_view_analytics" ON public.ride_share_link_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ride_share_links rsl
      WHERE rsl.id = share_link_id
      AND rsl.created_by = (SELECT auth.uid())
    )
  );

-- Admin can view all analytics
DROP POLICY IF EXISTS "admin_view_all_analytics" ON public.ride_share_link_views;
CREATE POLICY "admin_view_all_analytics" ON public.ride_share_link_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- 2. Create function to log share link view (public access)
CREATE OR REPLACE FUNCTION public.log_share_link_view(
  p_share_token VARCHAR,
  p_viewer_ip VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_link_id UUID;
  v_is_unique BOOLEAN := true;
BEGIN
  -- Find the share link
  SELECT id INTO v_link_id
  FROM public.ride_share_links
  WHERE share_token = p_share_token
  AND is_active = true
  AND expires_at > NOW();
  
  IF v_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_link');
  END IF;
  
  -- Check if this IP already viewed (for unique view tracking)
  IF p_viewer_ip IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.ride_share_link_views
      WHERE share_link_id = v_link_id
      AND viewer_ip = p_viewer_ip
      AND viewed_at > NOW() - INTERVAL '24 hours'
    ) INTO v_is_unique;
  END IF;
  
  -- Insert view record
  INSERT INTO public.ride_share_link_views (share_link_id, viewer_ip, user_agent, referrer, is_unique_view)
  VALUES (v_link_id, p_viewer_ip, p_user_agent, p_referrer, v_is_unique);
  
  -- Update view count on share link
  UPDATE public.ride_share_links
  SET view_count = view_count + 1
  WHERE id = v_link_id;
  
  RETURN jsonb_build_object('success', true, 'is_unique', v_is_unique);
END;
$$;

-- Grant execute to anon (for public tracking)
GRANT EXECUTE ON FUNCTION public.log_share_link_view(VARCHAR, VARCHAR, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_share_link_view(VARCHAR, VARCHAR, TEXT, TEXT) TO authenticated;

-- 3. Create function to get share link analytics
CREATE OR REPLACE FUNCTION public.get_share_link_analytics(p_share_link_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_total_views INTEGER;
  v_unique_views INTEGER;
  v_recent_views JSONB;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.ride_share_links
    WHERE id = p_share_link_id
    AND created_by = auth.uid()
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;
  
  -- Get total views
  SELECT COUNT(*) INTO v_total_views
  FROM public.ride_share_link_views
  WHERE share_link_id = p_share_link_id;
  
  -- Get unique views
  SELECT COUNT(*) INTO v_unique_views
  FROM public.ride_share_link_views
  WHERE share_link_id = p_share_link_id
  AND is_unique_view = true;
  
  -- Get recent views (last 10)
  SELECT COALESCE(jsonb_agg(row_to_json(v)), '[]'::jsonb) INTO v_recent_views
  FROM (
    SELECT viewed_at, user_agent, referrer
    FROM public.ride_share_link_views
    WHERE share_link_id = p_share_link_id
    ORDER BY viewed_at DESC
    LIMIT 10
  ) v;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_views', v_total_views,
    'unique_views', v_unique_views,
    'recent_views', v_recent_views
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_link_analytics(UUID) TO authenticated;

-- 4. Create function to cleanup expired share links
CREATE OR REPLACE FUNCTION public.cleanup_expired_share_links()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Deactivate expired links (soft delete)
  UPDATE public.ride_share_links
  SET is_active = false
  WHERE is_active = true
  AND expires_at < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Hard delete links expired more than 7 days ago
  DELETE FROM public.ride_share_links
  WHERE is_active = false
  AND expires_at < NOW() - INTERVAL '7 days';
  
  RETURN v_deleted_count;
END;
$$;

-- Grant execute to service role for cron job
GRANT EXECUTE ON FUNCTION public.cleanup_expired_share_links() TO service_role;
