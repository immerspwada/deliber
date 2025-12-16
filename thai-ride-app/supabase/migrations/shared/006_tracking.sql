-- =============================================
-- SHARED MODULE: Tracking System
-- =============================================
-- Feature: F25 - Tracking System
-- Used by: Customer, Provider, Admin
-- Depends on: core/001_users_auth.sql
-- =============================================

-- Tracking sequences table
CREATE TABLE IF NOT EXISTS tracking_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix VARCHAR(10) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sequence INTEGER NOT NULL DEFAULT 1,
  UNIQUE(prefix, date)
);

-- Generate tracking ID
CREATE OR REPLACE FUNCTION generate_tracking_id(p_prefix VARCHAR(10))
RETURNS VARCHAR(25) AS $$
DECLARE
  v_sequence INTEGER;
  v_tracking_id VARCHAR(25);
BEGIN
  INSERT INTO tracking_sequences (prefix, date, sequence)
  VALUES (p_prefix, CURRENT_DATE, 1)
  ON CONFLICT (prefix, date) 
  DO UPDATE SET sequence = tracking_sequences.sequence + 1
  RETURNING sequence INTO v_sequence;
  
  v_tracking_id := p_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_sequence::TEXT, 6, '0');
  
  RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Lookup by tracking ID
CREATE OR REPLACE FUNCTION lookup_by_tracking_id(p_tracking_id VARCHAR(25))
RETURNS TABLE (
  entity_type VARCHAR(20),
  entity_id UUID,
  status VARCHAR(50),
  created_at TIMESTAMPTZ,
  details JSONB
) AS $$
DECLARE
  v_prefix VARCHAR(10);
BEGIN
  v_prefix := SPLIT_PART(p_tracking_id, '-', 1);
  
  CASE v_prefix
    WHEN 'RID' THEN
      RETURN QUERY
      SELECT 
        'ride'::VARCHAR(20) as entity_type,
        r.id as entity_id,
        r.status::VARCHAR(50),
        r.created_at,
        jsonb_build_object(
          'pickup', r.pickup_address,
          'destination', r.destination_address,
          'fare', r.estimated_fare
        ) as details
      FROM ride_requests r
      WHERE r.tracking_id = p_tracking_id;
      
    WHEN 'DEL' THEN
      RETURN QUERY
      SELECT 
        'delivery'::VARCHAR(20) as entity_type,
        d.id as entity_id,
        d.status::VARCHAR(50),
        d.created_at,
        jsonb_build_object(
          'sender', d.sender_address,
          'recipient', d.recipient_address,
          'fee', d.estimated_fee
        ) as details
      FROM delivery_requests d
      WHERE d.tracking_id = p_tracking_id;
      
    WHEN 'SHP' THEN
      RETURN QUERY
      SELECT 
        'shopping'::VARCHAR(20) as entity_type,
        s.id as entity_id,
        s.status::VARCHAR(50),
        s.created_at,
        jsonb_build_object(
          'store', s.store_name,
          'delivery', s.delivery_address,
          'budget', s.budget_limit
        ) as details
      FROM shopping_requests s
      WHERE s.tracking_id = p_tracking_id;
      
    WHEN 'PAY' THEN
      RETURN QUERY
      SELECT 
        'payment'::VARCHAR(20) as entity_type,
        p.id as entity_id,
        p.status::VARCHAR(50),
        p.created_at,
        jsonb_build_object(
          'amount', p.amount,
          'method', p.payment_method
        ) as details
      FROM payments p
      WHERE p.tracking_id = p_tracking_id;
      
    WHEN 'SUP' THEN
      RETURN QUERY
      SELECT 
        'support'::VARCHAR(20) as entity_type,
        t.id as entity_id,
        t.status::VARCHAR(50),
        t.created_at,
        jsonb_build_object(
          'subject', t.subject,
          'category', t.category,
          'priority', t.priority
        ) as details
      FROM support_tickets t
      WHERE t.tracking_id = p_tracking_id;
      
    ELSE
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Get tracking history
CREATE OR REPLACE FUNCTION get_tracking_history(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  tracking_id VARCHAR(25),
  entity_type VARCHAR(20),
  status VARCHAR(50),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.tracking_id, 'ride'::VARCHAR(20), r.status::VARCHAR(50), r.created_at
  FROM ride_requests r WHERE r.user_id = p_user_id AND r.tracking_id IS NOT NULL
  UNION ALL
  SELECT d.tracking_id, 'delivery'::VARCHAR(20), d.status::VARCHAR(50), d.created_at
  FROM delivery_requests d WHERE d.user_id = p_user_id AND d.tracking_id IS NOT NULL
  UNION ALL
  SELECT s.tracking_id, 'shopping'::VARCHAR(20), s.status::VARCHAR(50), s.created_at
  FROM shopping_requests s WHERE s.user_id = p_user_id AND s.tracking_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
