-- Migration: 156_operational_metrics.sql - Operational Metrics & Payment Reconciliation

CREATE TABLE IF NOT EXISTS operational_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_unit VARCHAR(30),
  category VARCHAR(30) NOT NULL,
  period VARCHAR(20) NOT NULL DEFAULT 'daily',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date DATE NOT NULL UNIQUE,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  matched_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  discrepancy_count INTEGER NOT NULL DEFAULT 0,
  discrepancy_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payment_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES payment_reconciliations(id) ON DELETE CASCADE,
  transaction_id UUID,
  expected_amount DECIMAL(10,2) NOT NULL,
  actual_amount DECIMAL(10,2) NOT NULL,
  difference DECIMAL(10,2) NOT NULL,
  discrepancy_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rating_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL,
  reporter_id UUID,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_category ON operational_metrics(category);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON operational_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_reconciliations_date ON payment_reconciliations(reconciliation_date);

ALTER TABLE operational_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metrics_all" ON operational_metrics FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reconciliations_all" ON payment_reconciliations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "discrepancies_all" ON payment_discrepancies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "rating_reports_all" ON rating_reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON operational_metrics TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_reconciliations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_discrepancies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rating_reports TO anon, authenticated;
