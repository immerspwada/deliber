-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Add matched_at column for Provider Response Time Analytics
-- =====================================================

-- 1. Add matched_at column to ride_requests
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 2. Add matched_at column to delivery_requests
ALTER TABLE delivery_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 3. Add matched_at column to shopping_requests
ALTER TABLE shopping_requests 
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMPTZ;

-- 4. Create index for analytics
CREATE INDEX IF NOT EXISTS idx_ride_requests_matched_at 
ON ride_requests(matched_at) WHERE matched_at IS NOT NULL;

-- 5. Verify columns exist
SELECT 
  'ride_requests' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'ride_requests' 
  AND column_name = 'matched_at'
UNION ALL
SELECT 
  'delivery_requests' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'delivery_requests' 
  AND column_name = 'matched_at'
UNION ALL
SELECT 
  'shopping_requests' as table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'shopping_requests' 
  AND column_name = 'matched_at';
