-- Migration: 056_provider_status_history.sql
-- Feature: F14 - Provider Status History
-- Description: Track all provider status changes with reasons and admin info

-- Create provider_status_history table
CREATE TABLE IF NOT EXISTS provider_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES users(id),
  changed_by_role TEXT DEFAULT 'admin',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_provider_status_history_provider ON provider_status_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_status_history_created ON provider_status_history(created_at DESC);

-- Enable RLS
ALTER TABLE provider_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin can read all
CREATE POLICY "Admin can read all status history"
  ON provider_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Admin can insert
CREATE POLICY "Admin can insert status history"
  ON provider_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Provider can read own history
CREATE POLICY "Provider can read own status history"
  ON provider_status_history FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM service_providers 
      WHERE user_id = auth.uid()
    )
  );

-- Function to log status change
CREATE OR REPLACE FUNCTION log_provider_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO provider_status_history (
      provider_id,
      old_status,
      new_status,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.rejection_reason, ''),
      jsonb_build_object(
        'is_verified', NEW.is_verified,
        'is_available', NEW.is_available,
        'provider_type', NEW.provider_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_provider_status ON service_providers;
CREATE TRIGGER trigger_log_provider_status
  AFTER UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION log_provider_status_change();

-- Function to get provider status history
CREATE OR REPLACE FUNCTION get_provider_status_history(p_provider_id UUID)
RETURNS TABLE (
  id UUID,
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  changed_by_name TEXT,
  changed_by_role TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.old_status,
    h.new_status,
    h.reason,
    COALESCE(u.first_name || ' ' || u.last_name, 'ระบบ') as changed_by_name,
    h.changed_by_role,
    h.metadata,
    h.created_at
  FROM provider_status_history h
  LEFT JOIN users u ON h.changed_by = u.id
  WHERE h.provider_id = p_provider_id
  ORDER BY h.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add rejection_reasons column to service_providers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'rejection_reasons'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN rejection_reasons JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_providers' AND column_name = 'document_timestamps'
  ) THEN
    ALTER TABLE service_providers ADD COLUMN document_timestamps JSONB DEFAULT '{}';
  END IF;
END $$;

-- Comment
COMMENT ON TABLE provider_status_history IS 'Tracks all provider status changes for audit purposes';
COMMENT ON FUNCTION get_provider_status_history IS 'Returns status change history for a provider';
