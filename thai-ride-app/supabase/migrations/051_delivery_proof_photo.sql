-- =============================================
-- Migration: 051_delivery_proof_photo.sql
-- Feature: Delivery Proof Photo with GPS Timestamp
-- Description: Add columns for rider to upload proof of delivery with GPS location
-- =============================================

-- Add delivery proof columns to delivery_requests
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS delivery_proof_photo TEXT,
ADD COLUMN IF NOT EXISTS delivery_proof_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS delivery_proof_lng DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS delivery_proof_timestamp TIMESTAMPTZ;

-- Add pickup proof columns (when rider picks up package)
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS pickup_proof_photo TEXT,
ADD COLUMN IF NOT EXISTS pickup_proof_lat DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS pickup_proof_lng DECIMAL(11,8),
ADD COLUMN IF NOT EXISTS pickup_proof_timestamp TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN delivery_requests.delivery_proof_photo IS 'Rider uploaded photo as proof of delivery';
COMMENT ON COLUMN delivery_requests.delivery_proof_lat IS 'GPS latitude when delivery proof photo was taken';
COMMENT ON COLUMN delivery_requests.delivery_proof_lng IS 'GPS longitude when delivery proof photo was taken';
COMMENT ON COLUMN delivery_requests.delivery_proof_timestamp IS 'Timestamp when delivery proof photo was taken';

COMMENT ON COLUMN delivery_requests.pickup_proof_photo IS 'Rider uploaded photo when picking up package';
COMMENT ON COLUMN delivery_requests.pickup_proof_lat IS 'GPS latitude when pickup proof photo was taken';
COMMENT ON COLUMN delivery_requests.pickup_proof_lng IS 'GPS longitude when pickup proof photo was taken';
COMMENT ON COLUMN delivery_requests.pickup_proof_timestamp IS 'Timestamp when pickup proof photo was taken';

-- Create storage bucket for delivery proof photos
-- Note: Run this in Supabase Dashboard SQL Editor or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('delivery-proofs', 'delivery-proofs', true);

-- Function to upload delivery proof with GPS
CREATE OR REPLACE FUNCTION upload_delivery_proof(
  p_delivery_id UUID,
  p_provider_id UUID,
  p_photo_url TEXT,
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_proof_type TEXT DEFAULT 'delivery' -- 'pickup' or 'delivery'
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
  
  -- Update based on proof type
  IF p_proof_type = 'pickup' THEN
    UPDATE delivery_requests SET
      pickup_proof_photo = p_photo_url,
      pickup_proof_lat = p_lat,
      pickup_proof_lng = p_lng,
      pickup_proof_timestamp = NOW()
    WHERE id = p_delivery_id;
  ELSE
    UPDATE delivery_requests SET
      delivery_proof_photo = p_photo_url,
      delivery_proof_lat = p_lat,
      delivery_proof_lng = p_lng,
      delivery_proof_timestamp = NOW()
    WHERE id = p_delivery_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', CASE WHEN p_proof_type = 'pickup' THEN 'บันทึกรูปรับพัสดุแล้ว' ELSE 'บันทึกรูปส่งพัสดุแล้ว' END,
    'timestamp', NOW()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upload_delivery_proof TO authenticated;
