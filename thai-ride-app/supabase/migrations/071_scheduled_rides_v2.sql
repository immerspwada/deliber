-- Migration: 071_scheduled_rides_v2.sql
-- Feature: F15 - Scheduled Rides Enhancement V2
-- Description: Recurring rides, reminders, auto-matching

-- =====================================================
-- 1. Scheduled Ride Templates
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_ride_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  template_name TEXT NOT NULL,
  
  -- Route
  pickup_lat NUMERIC(10,7) NOT NULL,
  pickup_lng NUMERIC(10,7) NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat NUMERIC(10,7) NOT NULL,
  destination_lng NUMERIC(10,7) NOT NULL,
  destination_address TEXT NOT NULL,
  
  -- Preferences
  vehicle_type TEXT DEFAULT 'car',
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  
  -- Recurring settings
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekdays', 'weekends', 'weekly', 'custom')),
  recurrence_days INTEGER[] DEFAULT '{}', -- 0=Sun, 1=Mon, etc.
  recurrence_time TIME,
  recurrence_end_date DATE,
  
  -- Auto-booking
  auto_book BOOLEAN DEFAULT FALSE,
  auto_book_minutes_before INTEGER DEFAULT 30,
  
  -- Favorite driver
  preferred_provider_id UUID REFERENCES service_providers(id),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_templates_user ON scheduled_ride_templates(user_id);

-- =====================================================
-- 2. Scheduled Ride Reminders
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_ride_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_ride_id UUID NOT NULL REFERENCES scheduled_rides(id) ON DELETE CASCADE,
  
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('push', 'sms', 'email')),
  remind_minutes_before INTEGER NOT NULL,
  
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_reminders_ride ON scheduled_ride_reminders(scheduled_ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_reminders_sent ON scheduled_ride_reminders(is_sent);

-- =====================================================
-- 3. Auto-Match Queue
-- =====================================================
CREATE TABLE IF NOT EXISTS scheduled_auto_match (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_ride_id UUID NOT NULL REFERENCES scheduled_rides(id) ON DELETE CASCADE,
  
  match_status TEXT DEFAULT 'pending' CHECK (match_status IN ('pending', 'searching', 'matched', 'failed')),
  search_started_at TIMESTAMPTZ,
  search_radius_km NUMERIC(5,2) DEFAULT 5,
  max_search_attempts INTEGER DEFAULT 3,
  current_attempt INTEGER DEFAULT 0,
  
  matched_provider_id UUID REFERENCES service_providers(id),
  matched_at TIMESTAMPTZ,
  
  failure_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_match_status ON scheduled_auto_match(match_status);

-- =====================================================
-- 4. Add columns to scheduled_rides
-- =====================================================
ALTER TABLE scheduled_rides
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES scheduled_ride_templates(id),
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_booked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS booking_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_booking_attempt TIMESTAMPTZ;

-- =====================================================
-- 5. Enable RLS
-- =====================================================
ALTER TABLE scheduled_ride_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_ride_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_auto_match ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates" ON scheduled_ride_templates
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users read own reminders" ON scheduled_ride_reminders
  FOR SELECT TO authenticated USING (
    scheduled_ride_id IN (SELECT id FROM scheduled_rides WHERE user_id = auth.uid())
  );

CREATE POLICY "Users read own auto_match" ON scheduled_auto_match
  FOR SELECT TO authenticated USING (
    scheduled_ride_id IN (SELECT id FROM scheduled_rides WHERE user_id = auth.uid())
  );

-- =====================================================
-- 6. Functions
-- =====================================================

-- Create scheduled ride from template
CREATE OR REPLACE FUNCTION create_ride_from_template(
  p_template_id UUID,
  p_scheduled_datetime TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE
  v_template scheduled_ride_templates%ROWTYPE;
  v_ride_id UUID;
BEGIN
  SELECT * INTO v_template FROM scheduled_ride_templates WHERE id = p_template_id;
  
  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  INSERT INTO scheduled_rides (
    user_id, template_id, scheduled_datetime,
    pickup_lat, pickup_lng, pickup_address,
    destination_lat, destination_lng, destination_address,
    vehicle_type, payment_method, notes, status
  ) VALUES (
    v_template.user_id, p_template_id, p_scheduled_datetime,
    v_template.pickup_lat, v_template.pickup_lng, v_template.pickup_address,
    v_template.destination_lat, v_template.destination_lng, v_template.destination_address,
    v_template.vehicle_type, v_template.payment_method, v_template.notes, 'scheduled'
  ) RETURNING id INTO v_ride_id;
  
  -- Create default reminder
  INSERT INTO scheduled_ride_reminders (scheduled_ride_id, reminder_type, remind_minutes_before)
  VALUES (v_ride_id, 'push', 30);
  
  -- Create auto-match if preferred provider
  IF v_template.preferred_provider_id IS NOT NULL THEN
    INSERT INTO scheduled_auto_match (scheduled_ride_id, matched_provider_id, match_status)
    VALUES (v_ride_id, v_template.preferred_provider_id, 'matched');
  END IF;
  
  RETURN v_ride_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate recurring rides
CREATE OR REPLACE FUNCTION generate_recurring_rides(
  p_template_id UUID,
  p_days_ahead INTEGER DEFAULT 7
) RETURNS INTEGER AS $$
DECLARE
  v_template scheduled_ride_templates%ROWTYPE;
  v_date DATE;
  v_datetime TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_template FROM scheduled_ride_templates 
  WHERE id = p_template_id AND is_recurring = true AND is_active = true;
  
  IF v_template.id IS NULL THEN
    RETURN 0;
  END IF;
  
  FOR v_date IN SELECT generate_series(
    CURRENT_DATE, 
    CURRENT_DATE + p_days_ahead, 
    '1 day'::INTERVAL
  )::DATE
  LOOP
    -- Check if this day matches recurrence pattern
    IF v_template.recurrence_pattern = 'daily' 
       OR (v_template.recurrence_pattern = 'weekdays' AND EXTRACT(DOW FROM v_date) BETWEEN 1 AND 5)
       OR (v_template.recurrence_pattern = 'weekends' AND EXTRACT(DOW FROM v_date) IN (0, 6))
       OR (v_template.recurrence_pattern = 'custom' AND EXTRACT(DOW FROM v_date) = ANY(v_template.recurrence_days))
    THEN
      -- Check end date
      IF v_template.recurrence_end_date IS NULL OR v_date <= v_template.recurrence_end_date THEN
        v_datetime := v_date + v_template.recurrence_time;
        
        -- Check if ride already exists
        IF NOT EXISTS (
          SELECT 1 FROM scheduled_rides 
          WHERE template_id = p_template_id 
          AND DATE(scheduled_datetime) = v_date
        ) THEN
          PERFORM create_ride_from_template(p_template_id, v_datetime);
          v_count := v_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process scheduled ride reminders
CREATE OR REPLACE FUNCTION process_scheduled_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_reminder RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_reminder IN
    SELECT srr.*, sr.user_id, sr.scheduled_datetime, sr.pickup_address, sr.destination_address
    FROM scheduled_ride_reminders srr
    JOIN scheduled_rides sr ON srr.scheduled_ride_id = sr.id
    WHERE srr.is_sent = false
      AND sr.status = 'scheduled'
      AND sr.scheduled_datetime - (srr.remind_minutes_before || ' minutes')::INTERVAL <= NOW()
  LOOP
    -- Send notification
    INSERT INTO user_notifications (user_id, type, title, message, data)
    VALUES (
      v_reminder.user_id,
      'ride',
      'Scheduled Ride Reminder',
      format('Your ride to %s is scheduled in %s minutes', 
        v_reminder.destination_address, v_reminder.remind_minutes_before),
      jsonb_build_object('scheduled_ride_id', v_reminder.scheduled_ride_id)
    );
    
    -- Mark as sent
    UPDATE scheduled_ride_reminders SET is_sent = true, sent_at = NOW()
    WHERE id = v_reminder.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-book scheduled rides
CREATE OR REPLACE FUNCTION auto_book_scheduled_rides()
RETURNS INTEGER AS $$
DECLARE
  v_ride RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_ride IN
    SELECT sr.*, srt.auto_book_minutes_before
    FROM scheduled_rides sr
    JOIN scheduled_ride_templates srt ON sr.template_id = srt.id
    WHERE sr.status = 'scheduled'
      AND srt.auto_book = true
      AND sr.auto_booked = false
      AND sr.scheduled_datetime - (srt.auto_book_minutes_before || ' minutes')::INTERVAL <= NOW()
  LOOP
    -- Create actual ride request
    INSERT INTO ride_requests (
      user_id, pickup_lat, pickup_lng, pickup_address,
      destination_lat, destination_lng, destination_address,
      vehicle_type, payment_method, notes, status, scheduled_ride_id
    )
    SELECT 
      sr.user_id, sr.pickup_lat, sr.pickup_lng, sr.pickup_address,
      sr.destination_lat, sr.destination_lng, sr.destination_address,
      sr.vehicle_type, sr.payment_method, sr.notes, 'pending', sr.id
    FROM scheduled_rides sr WHERE sr.id = v_ride.id;
    
    -- Update scheduled ride
    UPDATE scheduled_rides 
    SET auto_booked = true, status = 'confirmed'
    WHERE id = v_ride.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE scheduled_ride_templates IS 'Templates for recurring scheduled rides';
COMMENT ON TABLE scheduled_ride_reminders IS 'Reminders for scheduled rides';
COMMENT ON TABLE scheduled_auto_match IS 'Auto-matching queue for scheduled rides';
