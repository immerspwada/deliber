-- Migration: 050_recurring_rides_and_notifications.sql
-- Feature: F15 - Recurring Scheduled Rides & Push Notifications
-- Description: Add recurring ride templates and scheduled ride notifications

-- =====================================================
-- PART 1: Recurring Ride Templates
-- =====================================================

-- Table for recurring ride templates
CREATE TABLE IF NOT EXISTS recurring_ride_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Route info
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_lat DECIMAL(10,8) NOT NULL,
  destination_lng DECIMAL(11,8) NOT NULL,
  destination_address TEXT NOT NULL,
  
  -- Ride preferences
  ride_type VARCHAR(20) DEFAULT 'standard' CHECK (ride_type IN ('standard', 'premium', 'shared')),
  passenger_count INTEGER DEFAULT 1,
  special_requests TEXT,
  
  -- Schedule pattern
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekdays', 'weekends', 'weekly', 'custom')),
  schedule_time TIME NOT NULL, -- Time of day for the ride
  schedule_days INTEGER[] DEFAULT NULL, -- For weekly/custom: 0=Sun, 1=Mon, ..., 6=Sat
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  
  -- Metadata
  name VARCHAR(100), -- User-friendly name like "ไปทำงาน", "กลับบ้าน"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active recurring templates
CREATE INDEX IF NOT EXISTS idx_recurring_templates_active 
ON recurring_ride_templates(user_id, is_active, next_scheduled_at) 
WHERE is_active = true;

-- Enable RLS
ALTER TABLE recurring_ride_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recurring templates"
ON recurring_ride_templates FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own recurring templates"
ON recurring_ride_templates FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recurring templates"
ON recurring_ride_templates FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recurring templates"
ON recurring_ride_templates FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- PART 2: Scheduled Ride Notifications
-- =====================================================

-- Table for scheduled ride reminders
CREATE TABLE IF NOT EXISTS scheduled_ride_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('15min', '30min', '1hour', '1day')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for pending reminders
CREATE INDEX IF NOT EXISTS idx_ride_reminders_pending 
ON scheduled_ride_reminders(scheduled_for, status) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE scheduled_ride_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
ON scheduled_ride_reminders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- PART 3: Functions
-- =====================================================

-- Function to calculate next scheduled time for recurring template
CREATE OR REPLACE FUNCTION calculate_next_schedule(
  p_schedule_type VARCHAR(20),
  p_schedule_time TIME,
  p_schedule_days INTEGER[],
  p_from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_date DATE;
  v_current_dow INTEGER;
  v_target_dow INTEGER;
  v_days_ahead INTEGER;
  v_result TIMESTAMPTZ;
BEGIN
  v_current_dow := EXTRACT(DOW FROM p_from_date)::INTEGER;
  v_next_date := p_from_date::DATE;
  
  -- If current time is past schedule time, start from tomorrow
  IF p_from_date::TIME > p_schedule_time THEN
    v_next_date := v_next_date + INTERVAL '1 day';
    v_current_dow := (v_current_dow + 1) % 7;
  END IF;
  
  CASE p_schedule_type
    WHEN 'daily' THEN
      -- Next occurrence is today or tomorrow
      v_result := v_next_date + p_schedule_time;
      
    WHEN 'weekdays' THEN
      -- Monday to Friday (1-5)
      WHILE v_current_dow NOT IN (1, 2, 3, 4, 5) LOOP
        v_next_date := v_next_date + INTERVAL '1 day';
        v_current_dow := (v_current_dow + 1) % 7;
      END LOOP;
      v_result := v_next_date + p_schedule_time;
      
    WHEN 'weekends' THEN
      -- Saturday and Sunday (0, 6)
      WHILE v_current_dow NOT IN (0, 6) LOOP
        v_next_date := v_next_date + INTERVAL '1 day';
        v_current_dow := (v_current_dow + 1) % 7;
      END LOOP;
      v_result := v_next_date + p_schedule_time;
      
    WHEN 'weekly', 'custom' THEN
      -- Find next matching day from schedule_days array
      IF p_schedule_days IS NULL OR array_length(p_schedule_days, 1) IS NULL THEN
        RETURN NULL;
      END IF;
      
      v_days_ahead := 0;
      WHILE v_days_ahead < 8 LOOP
        IF v_current_dow = ANY(p_schedule_days) THEN
          v_result := v_next_date + p_schedule_time;
          EXIT;
        END IF;
        v_next_date := v_next_date + INTERVAL '1 day';
        v_current_dow := (v_current_dow + 1) % 7;
        v_days_ahead := v_days_ahead + 1;
      END LOOP;
      
    ELSE
      RETURN NULL;
  END CASE;
  
  RETURN v_result;
END;
$$;

-- Function to generate rides from recurring templates
CREATE OR REPLACE FUNCTION generate_recurring_rides()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template RECORD;
  v_generated_count INTEGER := 0;
  v_ride_id UUID;
  v_next_schedule TIMESTAMPTZ;
BEGIN
  -- Find active templates that need to generate a ride
  FOR v_template IN
    SELECT * FROM recurring_ride_templates
    WHERE is_active = true
      AND (next_scheduled_at IS NULL OR next_scheduled_at <= NOW() + INTERVAL '24 hours')
  LOOP
    -- Calculate next schedule if not set
    IF v_template.next_scheduled_at IS NULL THEN
      v_next_schedule := calculate_next_schedule(
        v_template.schedule_type,
        v_template.schedule_time,
        v_template.schedule_days
      );
    ELSE
      v_next_schedule := v_template.next_scheduled_at;
    END IF;
    
    -- Skip if no valid schedule
    IF v_next_schedule IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Check if ride already exists for this schedule
    IF NOT EXISTS (
      SELECT 1 FROM ride_requests
      WHERE user_id = v_template.user_id
        AND scheduled_time = v_next_schedule
        AND status NOT IN ('cancelled', 'completed')
    ) THEN
      -- Create the scheduled ride
      INSERT INTO ride_requests (
        user_id,
        pickup_lat, pickup_lng, pickup_address,
        destination_lat, destination_lng, destination_address,
        ride_type, passenger_count, special_requests,
        scheduled_time, status, estimated_fare
      ) VALUES (
        v_template.user_id,
        v_template.pickup_lat, v_template.pickup_lng, v_template.pickup_address,
        v_template.destination_lat, v_template.destination_lng, v_template.destination_address,
        v_template.ride_type, v_template.passenger_count, v_template.special_requests,
        v_next_schedule, 'scheduled', 0 -- Fare will be calculated later
      )
      RETURNING id INTO v_ride_id;
      
      -- Create reminder for 15 minutes before
      INSERT INTO scheduled_ride_reminders (ride_id, user_id, reminder_type, scheduled_for)
      VALUES (v_ride_id, v_template.user_id, '15min', v_next_schedule - INTERVAL '15 minutes');
      
      v_generated_count := v_generated_count + 1;
    END IF;
    
    -- Update template with next schedule
    UPDATE recurring_ride_templates
    SET 
      last_generated_at = NOW(),
      next_scheduled_at = calculate_next_schedule(
        v_template.schedule_type,
        v_template.schedule_time,
        v_template.schedule_days,
        v_next_schedule + INTERVAL '1 minute'
      ),
      updated_at = NOW()
    WHERE id = v_template.id;
  END LOOP;
  
  RETURN v_generated_count;
END;
$$;

-- Function to send scheduled ride reminders
CREATE OR REPLACE FUNCTION send_scheduled_ride_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reminder RECORD;
  v_sent_count INTEGER := 0;
  v_ride RECORD;
BEGIN
  -- Find pending reminders that are due
  FOR v_reminder IN
    SELECT r.*, rr.pickup_address, rr.destination_address, rr.scheduled_time
    FROM scheduled_ride_reminders r
    JOIN ride_requests rr ON r.ride_id = rr.id
    WHERE r.status = 'pending'
      AND r.scheduled_for <= NOW()
      AND rr.status = 'scheduled'
  LOOP
    -- Send notification
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read
    ) VALUES (
      v_reminder.user_id,
      'ride_reminder',
      'เตือนการเดินทาง',
      'การเดินทางของคุณจะเริ่มในอีก 15 นาที จาก ' || v_reminder.pickup_address || ' ไป ' || v_reminder.destination_address,
      jsonb_build_object(
        'ride_id', v_reminder.ride_id,
        'scheduled_time', v_reminder.scheduled_time,
        'reminder_type', v_reminder.reminder_type
      ),
      false
    );
    
    -- Queue push notification
    INSERT INTO push_notification_queue (
      user_id,
      title,
      body,
      data,
      status
    ) VALUES (
      v_reminder.user_id,
      'เตือนการเดินทาง',
      'การเดินทางของคุณจะเริ่มในอีก 15 นาที',
      jsonb_build_object(
        'type', 'ride_reminder',
        'ride_id', v_reminder.ride_id,
        'action', 'open_ride'
      ),
      'pending'
    );
    
    -- Update reminder status
    UPDATE scheduled_ride_reminders
    SET status = 'sent', sent_at = NOW()
    WHERE id = v_reminder.id;
    
    v_sent_count := v_sent_count + 1;
  END LOOP;
  
  RETURN v_sent_count;
END;
$$;

-- Trigger to create reminder when scheduled ride is created
CREATE OR REPLACE FUNCTION create_ride_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only for scheduled rides
  IF NEW.scheduled_time IS NOT NULL AND NEW.status = 'scheduled' THEN
    -- Create 15-minute reminder if not exists
    INSERT INTO scheduled_ride_reminders (ride_id, user_id, reminder_type, scheduled_for)
    VALUES (NEW.id, NEW.user_id, '15min', NEW.scheduled_time - INTERVAL '15 minutes')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_ride_reminder ON ride_requests;
CREATE TRIGGER trigger_create_ride_reminder
AFTER INSERT ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION create_ride_reminder();

-- Trigger to cancel reminders when ride is cancelled
CREATE OR REPLACE FUNCTION cancel_ride_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE scheduled_ride_reminders
    SET status = 'cancelled'
    WHERE ride_id = NEW.id AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cancel_ride_reminders ON ride_requests;
CREATE TRIGGER trigger_cancel_ride_reminders
AFTER UPDATE ON ride_requests
FOR EACH ROW
EXECUTE FUNCTION cancel_ride_reminders();

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_next_schedule(VARCHAR, TIME, INTEGER[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_recurring_rides() TO authenticated;
GRANT EXECUTE ON FUNCTION send_scheduled_ride_reminders() TO authenticated;

-- Comments
COMMENT ON TABLE recurring_ride_templates IS 'Templates for recurring scheduled rides (daily, weekly, etc.)';
COMMENT ON TABLE scheduled_ride_reminders IS 'Reminders for scheduled rides (15min, 30min, etc.)';
COMMENT ON FUNCTION generate_recurring_rides() IS 'Generate rides from active recurring templates';
COMMENT ON FUNCTION send_scheduled_ride_reminders() IS 'Send push notifications for scheduled ride reminders';
