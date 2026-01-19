-- Migration: Add Sample Promo Codes for Testing
-- Description: Insert sample promotional codes for the Smart Promo feature

-- Insert sample promo codes (skip if already exists)
INSERT INTO promo_codes (
  code, 
  description, 
  discount_type, 
  discount_value, 
  max_discount, 
  min_order_amount, 
  service_types, 
  valid_from, 
  valid_until, 
  is_active, 
  usage_limit, 
  per_user_limit
)
VALUES
  -- New User Welcome Promo
  (
    'WELCOME50', 
    'ยินดีต้อนรับ! รับส่วนลด 50 บาทสำหรับการเดินทางแรก', 
    'fixed', 
    50, 
    NULL, 
    100, 
    ARRAY['ride'], 
    NOW(), 
    NOW() + INTERVAL '30 days', 
    true, 
    1000, 
    1
  ),
  
  -- Percentage Discount
  (
    'RIDE20', 
    'ลด 20% สูงสุด 100 บาท สำหรับทุกการเดินทาง', 
    'percentage', 
    20, 
    100, 
    50, 
    ARRAY['ride'], 
    NOW(), 
    NOW() + INTERVAL '7 days', 
    true, 
    500, 
    3
  ),
  
  -- Premium Ride Discount
  (
    'PREMIUM15', 
    'ลด 15% สำหรับรถพรีเมียม', 
    'percentage', 
    15, 
    150, 
    150, 
    ARRAY['ride'], 
    NOW(), 
    NOW() + INTERVAL '30 days', 
    true, 
    200, 
    5
  ),
  
  -- Flash Sale (Expiring Soon)
  (
    'FLASH100', 
    'Flash Sale! ลด 100 บาท (เหลือน้อย)', 
    'fixed', 
    100, 
    NULL, 
    200, 
    ARRAY['ride', 'delivery'], 
    NOW(), 
    NOW() + INTERVAL '3 days', 
    true, 
    50, 
    1
  ),
  
  -- Multi-Service Promo
  (
    'MULTI25', 
    'ลด 25% ทุกบริการ สูงสุด 80 บาท', 
    'percentage', 
    25, 
    80, 
    60, 
    ARRAY['ride', 'delivery', 'shopping'], 
    NOW(), 
    NOW() + INTERVAL '15 days', 
    true, 
    400, 
    3
  ),
  
  -- Late Night Promo
  (
    'NIGHT40', 
    'ส่วนลดกลางคืน 40 บาท (22:00-06:00)', 
    'fixed', 
    40, 
    NULL, 
    100, 
    ARRAY['ride'], 
    NOW(), 
    NOW() + INTERVAL '30 days', 
    true, 
    300, 
    5
  ),
  
  -- VIP Member Promo
  (
    'VIP50OFF', 
    'สมาชิก VIP ลด 50 บาททุกครั้ง', 
    'fixed', 
    50, 
    NULL, 
    0, 
    ARRAY['ride', 'delivery', 'shopping', 'moving', 'laundry'], 
    NOW(), 
    NOW() + INTERVAL '90 days', 
    true, 
    NULL, 
    10
  )
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  max_discount = EXCLUDED.max_discount,
  min_order_amount = EXCLUDED.min_order_amount,
  service_types = EXCLUDED.service_types,
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  is_active = EXCLUDED.is_active,
  usage_limit = EXCLUDED.usage_limit,
  per_user_limit = EXCLUDED.per_user_limit,
  updated_at = NOW();

-- Create index for better promo query performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_active_valid 
ON promo_codes(is_active, valid_from, valid_until) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_promo_codes_service_types 
ON promo_codes USING GIN(service_types);

-- Comment
COMMENT ON INDEX idx_promo_codes_active_valid IS 'Optimize queries for active and valid promo codes';
COMMENT ON INDEX idx_promo_codes_service_types IS 'Optimize queries filtering by service types';
