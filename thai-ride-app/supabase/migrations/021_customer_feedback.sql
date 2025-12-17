-- Migration: 021_customer_feedback.sql
-- Feature: F39 - Customer Feedback System
-- ระบบรับ feedback จากลูกค้าหลังใช้บริการ

-- =============================================
-- 1. Create customer_feedback table
-- =============================================
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ride', 'delivery', 'shopping', 'app', 'support')),
  reference_id UUID, -- ride_id, delivery_id, shopping_id
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  categories TEXT[] DEFAULT '{}',
  comment TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. Create indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customer_feedback_user_id ON customer_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON customer_feedback(type);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_is_resolved ON customer_feedback(is_resolved);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON customer_feedback(created_at DESC);

-- =============================================
-- 3. Enable RLS
-- =============================================
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON customer_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON customer_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin can view all feedback
CREATE POLICY "Admin can view all feedback"
  ON customer_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admin can update feedback (respond)
CREATE POLICY "Admin can update feedback"
  ON customer_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =============================================
-- 4. Create updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_customer_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_feedback_updated_at ON customer_feedback;
CREATE TRIGGER trigger_customer_feedback_updated_at
  BEFORE UPDATE ON customer_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_feedback_updated_at();

-- =============================================
-- 5. Function to get feedback statistics
-- =============================================
CREATE OR REPLACE FUNCTION get_feedback_stats(days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_date TIMESTAMPTZ;
BEGIN
  start_date := NOW() - (days_back || ' days')::INTERVAL;
  
  SELECT json_build_object(
    'total_feedback', COUNT(*),
    'avg_rating', ROUND(AVG(rating)::NUMERIC, 2),
    'nps_score', CASE 
      WHEN COUNT(CASE WHEN nps_score IS NOT NULL THEN 1 END) > 0 THEN
        ROUND(
          (
            (COUNT(CASE WHEN nps_score >= 9 THEN 1 END)::NUMERIC - 
             COUNT(CASE WHEN nps_score <= 6 THEN 1 END)::NUMERIC) / 
            COUNT(CASE WHEN nps_score IS NOT NULL THEN 1 END)::NUMERIC
          ) * 100
        )
      ELSE 0
    END,
    'promoters', COUNT(CASE WHEN nps_score >= 9 THEN 1 END),
    'passives', COUNT(CASE WHEN nps_score >= 7 AND nps_score < 9 THEN 1 END),
    'detractors', COUNT(CASE WHEN nps_score <= 6 THEN 1 END),
    'pending_count', COUNT(CASE WHEN NOT is_resolved THEN 1 END),
    'by_type', json_build_object(
      'ride', COUNT(CASE WHEN type = 'ride' THEN 1 END),
      'delivery', COUNT(CASE WHEN type = 'delivery' THEN 1 END),
      'shopping', COUNT(CASE WHEN type = 'shopping' THEN 1 END),
      'app', COUNT(CASE WHEN type = 'app' THEN 1 END),
      'support', COUNT(CASE WHEN type = 'support' THEN 1 END)
    ),
    'by_rating', json_build_object(
      '5', COUNT(CASE WHEN rating = 5 THEN 1 END),
      '4', COUNT(CASE WHEN rating = 4 THEN 1 END),
      '3', COUNT(CASE WHEN rating = 3 THEN 1 END),
      '2', COUNT(CASE WHEN rating = 2 THEN 1 END),
      '1', COUNT(CASE WHEN rating = 1 THEN 1 END)
    )
  ) INTO result
  FROM customer_feedback
  WHERE created_at >= start_date;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. Function to auto-request feedback after service
-- =============================================
CREATE OR REPLACE FUNCTION request_feedback_after_service()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for completed services
  IF NEW.status IN ('completed', 'delivered') AND 
     (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    
    -- Send notification to request feedback
    INSERT INTO user_notifications (
      user_id,
      title,
      message,
      type,
      data
    ) VALUES (
      NEW.user_id,
      'ให้คะแนนบริการ',
      'กรุณาให้คะแนนและความคิดเห็นเกี่ยวกับบริการที่ได้รับ',
      'feedback_request',
      jsonb_build_object(
        'service_type', TG_TABLE_NAME,
        'service_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to ride_requests
DROP TRIGGER IF EXISTS trigger_request_feedback_ride ON ride_requests;
CREATE TRIGGER trigger_request_feedback_ride
  AFTER UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION request_feedback_after_service();

-- Apply trigger to delivery_requests
DROP TRIGGER IF EXISTS trigger_request_feedback_delivery ON delivery_requests;
CREATE TRIGGER trigger_request_feedback_delivery
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  EXECUTE FUNCTION request_feedback_after_service();

-- Apply trigger to shopping_requests
DROP TRIGGER IF EXISTS trigger_request_feedback_shopping ON shopping_requests;
CREATE TRIGGER trigger_request_feedback_shopping
  AFTER UPDATE ON shopping_requests
  FOR EACH ROW
  EXECUTE FUNCTION request_feedback_after_service();

-- =============================================
-- 7. Grant permissions
-- =============================================
GRANT SELECT, INSERT ON customer_feedback TO authenticated;
GRANT UPDATE (admin_response, is_resolved, resolved_at, resolved_by) ON customer_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION get_feedback_stats TO authenticated;
