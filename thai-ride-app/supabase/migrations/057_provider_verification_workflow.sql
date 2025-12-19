-- Migration: 057_provider_verification_workflow.sql
-- Feature: F14 - Enhanced Provider Verification Workflow
-- Description: Complete verification workflow with document expiry tracking, auto-reminders, and verification queue

-- =====================================================
-- 1. Provider Verification Queue Table
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES users(id),
  priority INTEGER DEFAULT 0, -- Higher = more urgent
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

-- =====================================================
-- 2. Document Expiry Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_document_expiry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_card', 'license', 'vehicle_registration', 'insurance', 'background_check')),
  expiry_date DATE NOT NULL,
  reminder_sent_30d BOOLEAN DEFAULT FALSE,
  reminder_sent_7d BOOLEAN DEFAULT FALSE,
  reminder_sent_1d BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  renewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_doc_expiry_date ON provider_document_expiry(expiry_date);
CREATE INDEX IF NOT EXISTS idx_doc_expiry_provider ON provider_document_expiry(provider_id);

-- =====================================================
-- 3. Verification Checklist Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_type TEXT NOT NULL,
  checklist_items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default checklist templates
INSERT INTO verification_checklist_templates (provider_type, checklist_items) VALUES
('driver', '[
  {"key": "id_card_clear", "label": "บัตรประชาชนชัดเจน", "required": true},
  {"key": "id_card_name_match", "label": "ชื่อตรงกับข้อมูลที่กรอก", "required": true},
  {"key": "id_card_not_expired", "label": "บัตรไม่หมดอายุ", "required": true},
  {"key": "license_clear", "label": "ใบขับขี่ชัดเจน", "required": true},
  {"key": "license_type_correct", "label": "ประเภทใบขับขี่ถูกต้อง", "required": true},
  {"key": "license_not_expired", "label": "ใบขับขี่ไม่หมดอายุ", "required": true},
  {"key": "vehicle_photo_clear", "label": "รูปรถชัดเจน", "required": true},
  {"key": "vehicle_plate_visible", "label": "เห็นทะเบียนชัดเจน", "required": true},
  {"key": "vehicle_condition_ok", "label": "สภาพรถดี", "required": true},
  {"key": "background_check_passed", "label": "ผ่านการตรวจประวัติ", "required": false}
]'::jsonb),
('rider', '[
  {"key": "id_card_clear", "label": "บัตรประชาชนชัดเจน", "required": true},
  {"key": "id_card_name_match", "label": "ชื่อตรงกับข้อมูลที่กรอก", "required": true},
  {"key": "license_clear", "label": "ใบขับขี่มอเตอร์ไซค์ชัดเจน", "required": true},
  {"key": "license_not_expired", "label": "ใบขับขี่ไม่หมดอายุ", "required": true},
  {"key": "vehicle_photo_clear", "label": "รูปมอเตอร์ไซค์ชัดเจน", "required": true},
  {"key": "vehicle_plate_visible", "label": "เห็นทะเบียนชัดเจน", "required": true}
]'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. Provider Verification Results
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES users(id),
  checklist_results JSONB NOT NULL DEFAULT '{}',
  overall_result TEXT CHECK (overall_result IN ('approved', 'rejected', 'needs_revision')),
  rejection_reasons JSONB DEFAULT '[]',
  revision_requests JSONB DEFAULT '[]',
  admin_notes TEXT,
  verification_score INTEGER, -- 0-100
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_results_provider ON provider_verification_results(provider_id);

-- =====================================================
-- 5. Enable RLS
-- =====================================================
ALTER TABLE provider_verification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_document_expiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_verification_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin full access verification_queue" ON provider_verification_queue
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin full access doc_expiry" ON provider_document_expiry
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Provider read own doc_expiry" ON provider_document_expiry
  FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

CREATE POLICY "Anyone read checklist_templates" ON verification_checklist_templates
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admin manage checklist_templates" ON verification_checklist_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin full access verification_results" ON provider_verification_results
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Provider read own verification_results" ON provider_verification_results
  FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid()));

-- =====================================================
-- 6. Functions
-- =====================================================

-- Add provider to verification queue
CREATE OR REPLACE FUNCTION add_to_verification_queue(p_provider_id UUID)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_position INTEGER;
BEGIN
  -- Get next position
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_position
  FROM provider_verification_queue
  WHERE status IN ('pending', 'in_review');
  
  -- Insert into queue
  INSERT INTO provider_verification_queue (provider_id, queue_position)
  VALUES (p_provider_id, v_position)
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign admin to verification
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

-- Complete verification
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
  -- Get provider and start time
  SELECT provider_id, started_at INTO v_provider_id, v_started_at
  FROM provider_verification_queue
  WHERE id = p_queue_id;
  
  IF v_provider_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update queue
  UPDATE provider_verification_queue
  SET 
    status = 'completed',
    completed_at = NOW(),
    actual_review_time = NOW() - v_started_at,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_queue_id;
  
  -- Insert verification result
  INSERT INTO provider_verification_results (
    provider_id,
    admin_id,
    checklist_results,
    overall_result,
    admin_notes
  )
  SELECT 
    v_provider_id,
    assigned_admin_id,
    p_checklist,
    p_result,
    p_notes
  FROM provider_verification_queue
  WHERE id = p_queue_id;
  
  -- Update provider status
  IF p_result = 'approved' THEN
    UPDATE service_providers
    SET status = 'approved', is_verified = true, updated_at = NOW()
    WHERE id = v_provider_id;
  ELSIF p_result = 'rejected' THEN
    UPDATE service_providers
    SET status = 'rejected', is_verified = false, updated_at = NOW()
    WHERE id = v_provider_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check document expiry and send reminders
CREATE OR REPLACE FUNCTION check_document_expiry_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT 
      de.id,
      de.provider_id,
      de.document_type,
      de.expiry_date,
      de.reminder_sent_30d,
      de.reminder_sent_7d,
      de.reminder_sent_1d,
      sp.user_id
    FROM provider_document_expiry de
    JOIN service_providers sp ON de.provider_id = sp.id
    WHERE de.is_expired = false
      AND de.expiry_date >= CURRENT_DATE
  LOOP
    -- 30 day reminder
    IF v_record.expiry_date - CURRENT_DATE <= 30 
       AND v_record.expiry_date - CURRENT_DATE > 7
       AND NOT v_record.reminder_sent_30d THEN
      
      INSERT INTO user_notifications (user_id, type, title, message, action_url)
      VALUES (
        v_record.user_id,
        'system',
        'เอกสารใกล้หมดอายุ',
        format('%s จะหมดอายุใน %s วัน กรุณาต่ออายุ', 
          CASE v_record.document_type 
            WHEN 'license' THEN 'ใบขับขี่'
            WHEN 'id_card' THEN 'บัตรประชาชน'
            WHEN 'vehicle_registration' THEN 'ทะเบียนรถ'
            WHEN 'insurance' THEN 'ประกันภัย'
            ELSE v_record.document_type
          END,
          v_record.expiry_date - CURRENT_DATE
        ),
        '/provider/documents'
      );
      
      UPDATE provider_document_expiry SET reminder_sent_30d = true WHERE id = v_record.id;
      v_count := v_count + 1;
    END IF;
    
    -- 7 day reminder
    IF v_record.expiry_date - CURRENT_DATE <= 7 
       AND v_record.expiry_date - CURRENT_DATE > 1
       AND NOT v_record.reminder_sent_7d THEN
      
      INSERT INTO user_notifications (user_id, type, title, message, action_url)
      VALUES (
        v_record.user_id,
        'urgent',
        'เอกสารใกล้หมดอายุ - เร่งด่วน',
        format('%s จะหมดอายุใน %s วัน!', 
          CASE v_record.document_type 
            WHEN 'license' THEN 'ใบขับขี่'
            WHEN 'id_card' THEN 'บัตรประชาชน'
            ELSE v_record.document_type
          END,
          v_record.expiry_date - CURRENT_DATE
        ),
        '/provider/documents'
      );
      
      UPDATE provider_document_expiry SET reminder_sent_7d = true WHERE id = v_record.id;
      v_count := v_count + 1;
    END IF;
    
    -- 1 day reminder
    IF v_record.expiry_date - CURRENT_DATE <= 1 
       AND NOT v_record.reminder_sent_1d THEN
      
      INSERT INTO user_notifications (user_id, type, title, message, action_url)
      VALUES (
        v_record.user_id,
        'urgent',
        'เอกสารหมดอายุพรุ่งนี้!',
        format('%s จะหมดอายุพรุ่งนี้ หากไม่ต่ออายุจะไม่สามารถรับงานได้', 
          CASE v_record.document_type 
            WHEN 'license' THEN 'ใบขับขี่'
            WHEN 'id_card' THEN 'บัตรประชาชน'
            ELSE v_record.document_type
          END
        ),
        '/provider/documents'
      );
      
      UPDATE provider_document_expiry SET reminder_sent_1d = true WHERE id = v_record.id;
      v_count := v_count + 1;
    END IF;
    
    -- Mark as expired
    IF v_record.expiry_date < CURRENT_DATE THEN
      UPDATE provider_document_expiry SET is_expired = true WHERE id = v_record.id;
      
      -- Suspend provider if critical document expired
      IF v_record.document_type IN ('license', 'id_card') THEN
        UPDATE service_providers 
        SET is_available = false, status = 'suspended'
        WHERE id = v_record.provider_id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get verification queue stats
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

-- Trigger: Auto-add to queue when provider submits documents
CREATE OR REPLACE FUNCTION auto_add_to_verification_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- When provider status changes to pending (submitted for review)
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    -- Check if not already in queue
    IF NOT EXISTS (
      SELECT 1 FROM provider_verification_queue 
      WHERE provider_id = NEW.id AND status IN ('pending', 'in_review')
    ) THEN
      PERFORM add_to_verification_queue(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_verification_queue ON service_providers;
CREATE TRIGGER trigger_auto_verification_queue
  AFTER INSERT OR UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_to_verification_queue();

-- Comments
COMMENT ON TABLE provider_verification_queue IS 'Queue for provider verification workflow';
COMMENT ON TABLE provider_document_expiry IS 'Track document expiry dates and send reminders';
COMMENT ON TABLE verification_checklist_templates IS 'Checklist templates for different provider types';
COMMENT ON TABLE provider_verification_results IS 'Store verification results and checklist outcomes';
