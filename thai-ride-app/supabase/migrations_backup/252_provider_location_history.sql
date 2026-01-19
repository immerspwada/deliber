-- Provider Location History Table
-- Stores historical location data for providers

CREATE TABLE IF NOT EXISTS provider_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  accuracy NUMERIC(6, 2),
  speed NUMERIC(6, 2),
  heading NUMERIC(5, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_provider_location_history_provider_id ON provider_location_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_location_history_recorded_at ON provider_location_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_location_history_provider_time ON provider_location_history(provider_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE provider_location_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can view all location history" ON provider_location_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Provider can view own location history" ON provider_location_history
  FOR SELECT USING (
    provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
  );

CREATE POLICY "Provider can insert own location" ON provider_location_history
  FOR INSERT WITH CHECK (
    provider_id IN (SELECT id FROM providers_v2 WHERE user_id = auth.uid())
  );

-- Function to get provider location history
CREATE OR REPLACE FUNCTION get_provider_location_history(
  p_provider_id UUID,
  p_hours INT DEFAULT 24,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  latitude NUMERIC,
  longitude NUMERIC,
  accuracy NUMERIC,
  speed NUMERIC,
  heading NUMERIC,
  recorded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    plh.id,
    plh.latitude,
    plh.longitude,
    plh.accuracy,
    plh.speed,
    plh.heading,
    plh.recorded_at
  FROM provider_location_history plh
  WHERE plh.provider_id = p_provider_id
    AND plh.recorded_at >= NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY plh.recorded_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT ON provider_location_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_location_history(UUID, INT, INT) TO authenticated;
