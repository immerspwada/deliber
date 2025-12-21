-- Migration: 137_provider_verification_queue_complete.sql
-- Feature: F14 - Provider Verification Queue (Complete Setup)
-- Description: Creates verification queue table, functions, and trigger
-- Note: This migration was applied via Supabase MCP on 2025-12-21

-- =====================================================
-- 1. Provider Verification Queue Table
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES users(id),
  priority INTEGER DEFAULT 0,
  queue_position INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'escalated')),
  notes TEXT,
  estimated_review_time INTERVAL DEFAULT '30 minutes',
  actual_review_time INTERVAL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_queue_status ON provider_verification_queue(status);
CREATE INDEX IF NOT EXISTS idx_verification_queue_priority ON provider_verification_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_verification_queue_admin ON provider_verification_queue(assigned_admin_id);

-- Enable RLS
ALTER TABLE provider_verification_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy for Admin
CREATE POLICY "Admin full access verification_queue" ON provider_verification_queue
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 2. Functions
-- =====================================================

-- Function to add provider to verification queue
CREATE OR REPLACE FUNCTION add_to_verification_queue(p_provider_id UUID)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_position
  FROM provider_verification_queue
  WHERE status IN ('pending', 'in_review');
  
  INSERT INTO provider_verification_queue (provider_id, queue_position)
  VALUES (p_provider_id, v_position)
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-add to queue
CREATE OR REPLACE FUNCTION auto_add_to_verification_queue()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      IF NOT EXISTS (
        SELECT 1 FROM provider_verification_queue 
        WHERE provider_id = NEW.id AND status IN ('pending', 'in_review')
      ) THEN
        PERFORM add_to_verification_queue(NEW.id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
      IF NOT EXISTS (
        SELECT 1 FROM provider_verification_queue 
        WHERE provider_id = NEW.id AND status IN ('pending', 'in_review')
      ) THEN
        PERFORM add_to_verification_queue(NEW.id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_verification_queue ON service_providers;
CREATE TRIGGER trigger_auto_verification_queue
  AFTER INSERT OR UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_to_verification_queue();

-- Function to assign admin to verification
CREATE OR REPLACE FUNCTION assign_verification_to_admin(
  p_queue_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE provider_verification_queue
  SET 
    assigned_admin_id = p_admin_id,
    status = 'in_review',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete verification
CREATE OR REPLACE FUNCTION complete_verification(
  p_queue_id UUID,
  p_result TEXT,
  p_checklist JSONB,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_provider_id UUID;
  v_started_at TIMESTAMPTZ;
BEGIN
  SELECT provider_id, started_at INTO v_provider_id, v_started_at
  FROM provider_verification_queue
  WHERE id = p_queue_id;
  
  IF v_provider_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE provider_verification_queue
  SET 
    status = 'completed',
    completed_at = NOW(),
    actual_review_time = NOW() - v_started_at,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_queue_id;
  
  IF p_result = 'approved' THEN
    UPDATE service_providers
    SET status = 'approved', is_verified = true, approved_at = NOW(), updated_at = NOW()
    WHERE id = v_provider_id;
  ELSIF p_result = 'rejected' THEN
    UPDATE service_providers
    SET status = 'rejected', is_verified = false, rejection_reason = p_notes, updated_at = NOW()
    WHERE id = v_provider_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get queue stats
CREATE OR REPLACE FUNCTION get_verification_queue_stats()
RETURNS TABLE (
  pending_count INTEGER,
  in_review_count INTEGER,
  completed_today INTEGER,
  avg_review_time INTERVAL,
  oldest_pending_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM provider_verification_queue WHERE status = 'pending'),
    (SELECT COUNT(*)::INTEGER FROM provider_verification_queue WHERE status = 'in_review'),
    (SELECT COUNT(*)::INTEGER FROM provider_verification_queue WHERE status = 'completed' AND completed_at::DATE = CURRENT_DATE),
    (SELECT AVG(actual_review_time) FROM provider_verification_queue WHERE actual_review_time IS NOT NULL),
    (SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))/3600 FROM provider_verification_queue WHERE status = 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE provider_verification_queue IS 'Queue for provider verification workflow';
COMMENT ON FUNCTION add_to_verification_queue IS 'Add provider to verification queue';
COMMENT ON FUNCTION auto_add_to_verification_queue IS 'Trigger function to auto-add providers when status=pending';
