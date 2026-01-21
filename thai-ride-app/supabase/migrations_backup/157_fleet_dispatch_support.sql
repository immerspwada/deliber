-- Migration: 157_fleet_dispatch_support.sql - Fleet, Dispatch & Support Systems

-- Fleets
CREATE TABLE IF NOT EXISTS fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  description TEXT,
  manager_id UUID,
  vehicle_count INTEGER NOT NULL DEFAULT 0,
  active_count INTEGER NOT NULL DEFAULT 0,
  zone_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  vehicle_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fleet_id, provider_id)
);

-- Dispatch Configuration
CREATE TABLE IF NOT EXISTS dispatch_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  max_search_radius_km DECIMAL(5,2) NOT NULL DEFAULT 5,
  max_wait_time_seconds INTEGER NOT NULL DEFAULT 300,
  priority_factors JSONB NOT NULL DEFAULT '{"distance_weight": 0.4, "rating_weight": 0.3, "acceptance_rate_weight": 0.3}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dispatch_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  distance_km DECIMAL(10,2),
  eta_minutes INTEGER,
  score DECIMAL(5,2),
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service Quality Metrics
CREATE TABLE IF NOT EXISTS service_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  metric_type VARCHAR(30) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  period VARCHAR(20) NOT NULL DEFAULT 'weekly',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ticket Messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  sender_id UUID,
  message TEXT NOT NULL,
  attachments TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fleet_vehicles_fleet ON fleet_vehicles(fleet_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_results_ride ON dispatch_results(ride_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_provider ON service_quality_metrics(provider_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- Enable RLS
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "fleets_all" ON fleets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fleet_vehicles_all" ON fleet_vehicles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dispatch_configs_all" ON dispatch_configs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dispatch_results_all" ON dispatch_results FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "quality_metrics_all" ON service_quality_metrics FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ticket_messages_all" ON ticket_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed default dispatch config
INSERT INTO dispatch_configs (name, max_search_radius_km, max_wait_time_seconds, is_active) VALUES
  ('Default Config', 5, 300, true)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON fleets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fleet_vehicles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dispatch_configs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dispatch_results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_quality_metrics TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_messages TO anon, authenticated;
