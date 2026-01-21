-- =============================================
-- Migration: 052_delivery_signature.sql
-- Feature: Signature Capture for Delivery Confirmation
-- Description: Add signature column for recipient to sign on delivery
-- =============================================

-- Add signature columns to delivery_requests
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS recipient_signature TEXT,
ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature_name TEXT;

-- Comments
COMMENT ON COLUMN delivery_requests.recipient_signature IS 'Base64 encoded signature image from recipient';
COMMENT ON COLUMN delivery_requests.signature_timestamp IS 'Timestamp when signature was captured';
COMMENT ON COLUMN delivery_requests.signature_name IS 'Name of person who signed';

-- Function to save delivery signature
CREATE OR REPLACE FUNCTION save_delivery_signature(
  p_delivery_id UUID,
  p_provider_id UUID,
  p_signature TEXT,
  p_signer_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_delivery delivery_requests%ROWTYPE;
BEGIN
  -- Get delivery
  SELECT * INTO v_delivery FROM delivery_requests WHERE id = p_delivery_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'ไม่พบรายการส่งของ');
  END IF;
  
  -- Verify provider
  IF v_delivery.provider_id != p_provider_id THEN
    RETURN json_build_object('success', false, 'message', 'คุณไม่ใช่ไรเดอร์ของงานนี้');
  END IF;
  
  -- Update signature
  UPDATE delivery_requests SET
    recipient_signature = p_signature,
    signature_timestamp = NOW(),
    signature_name = COALESCE(p_signer_name, v_delivery.recipient_name)
  WHERE id = p_delivery_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'บันทึกลายเซ็นแล้ว',
    'timestamp', NOW()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION save_delivery_signature TO authenticated;
