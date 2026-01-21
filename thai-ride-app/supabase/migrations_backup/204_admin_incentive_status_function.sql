-- Migration 204: Admin Incentive Status Update Function
-- =====================================================
-- Creates the admin_update_incentive_status function

-- Drop existing function if exists
DROP FUNCTION IF EXISTS admin_update_incentive_status(uuid, text);

-- Create function to update incentive status
CREATE OR REPLACE FUNCTION admin_update_incentive_status(
  p_incentive_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validate status
  IF p_status NOT IN ('active', 'paused', 'ended', 'draft') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status');
  END IF;

  -- Update the incentive
  UPDATE provider_incentives
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_incentive_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Incentive not found');
  END IF;

  RETURN json_build_object('success', true, 'status', p_status);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_update_incentive_status(uuid, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_update_incentive_status IS 'Update provider incentive status (active/paused/ended)';
