-- Migration: 154_provider_schedules.sql - Provider Schedule System

-- Schedule slots (recurring weekly schedule)
CREATE TABLE IF NOT EXISTS provider_schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  zone_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Schedule exceptions (days off, extra shifts, modified hours)
CREATE TABLE IF NOT EXISTS provider_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  exception_date DATE NOT NULL,
  exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('off', 'extra', 'modified')),
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, exception_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_slots_provider ON provider_schedule_slots(provider_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_day ON provider_schedule_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_provider ON provider_schedule_exceptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON provider_schedule_exceptions(exception_date);

-- Enable RLS
ALTER TABLE provider_schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "schedule_slots_all" ON provider_schedule_slots;
CREATE POLICY "schedule_slots_all" ON provider_schedule_slots 
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "schedule_exceptions_all" ON provider_schedule_exceptions;
CREATE POLICY "schedule_exceptions_all" ON provider_schedule_exceptions 
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Function to check if provider is available at specific time
CREATE OR REPLACE FUNCTION is_provider_available_at(
  p_provider_id UUID,
  p_datetime TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_time TIME;
  v_date DATE;
  v_exception RECORD;
  v_slot_exists BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_datetime);
  v_time := p_datetime::TIME;
  v_date := p_datetime::DATE;
  
  -- Check for exceptions
  SELECT * INTO v_exception FROM provider_schedule_exceptions
  WHERE provider_id = p_provider_id AND exception_date = v_date;
  
  IF FOUND THEN
    IF v_exception.exception_type = 'off' THEN
      RETURN FALSE;
    ELSIF v_exception.exception_type IN ('extra', 'modified') THEN
      RETURN v_time >= v_exception.start_time AND v_time <= v_exception.end_time;
    END IF;
  END IF;
  
  -- Check regular schedule
  SELECT EXISTS(
    SELECT 1 FROM provider_schedule_slots
    WHERE provider_id = p_provider_id
      AND day_of_week = v_day_of_week
      AND is_active = true
      AND v_time >= start_time
      AND v_time <= end_time
  ) INTO v_slot_exists;
  
  RETURN v_slot_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider's weekly hours
CREATE OR REPLACE FUNCTION get_provider_weekly_hours(p_provider_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_minutes INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
  ), 0)::INTEGER INTO v_total_minutes
  FROM provider_schedule_slots
  WHERE provider_id = p_provider_id AND is_active = true;
  
  RETURN ROUND(v_total_minutes / 60.0, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_schedule_slots TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_schedule_exceptions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_provider_available_at TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_provider_weekly_hours TO anon, authenticated;
