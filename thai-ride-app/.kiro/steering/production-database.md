---
inclusion: fileMatch
fileMatchPattern: "**/*.sql"
---

# 🗄️ Database Standards

## Migration Template

```sql
-- Migration: XXX_description.sql
-- Author: [name]
-- Date: YYYY-MM-DD
-- Rollback: XXX_description_rollback.sql

BEGIN;

-- Create table
CREATE TABLE table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_table_user ON table_name(user_id);

-- RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_data" ON table_name
  FOR ALL USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_table_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

## Index Strategy

```sql
-- ✅ Essential indexes
CREATE INDEX CONCURRENTLY idx_rides_status ON rides(status);
CREATE INDEX CONCURRENTLY idx_rides_customer ON rides(customer_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_rides_provider ON rides(provider_id, status);

-- ✅ Location queries (PostGIS)
CREATE INDEX CONCURRENTLY idx_rides_pickup ON rides USING GIST(pickup_location);
CREATE INDEX CONCURRENTLY idx_providers_location ON providers USING GIST(current_location);

-- ✅ Partial index for active records
CREATE INDEX CONCURRENTLY idx_active_providers
  ON providers(id) WHERE status = 'active' AND is_online = true;
```

## Transaction Pattern

```sql
-- ✅ ACID for financial operations
CREATE OR REPLACE FUNCTION process_payment(
  p_ride_id UUID,
  p_amount NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_provider_id UUID;
BEGIN
  -- Get ride info
  SELECT customer_id, provider_id INTO v_customer_id, v_provider_id
  FROM rides WHERE id = p_ride_id FOR UPDATE;

  -- Lock and validate customer wallet
  PERFORM 1 FROM wallets
  WHERE user_id = v_customer_id AND balance >= p_amount
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from customer
  UPDATE wallets SET balance = balance - p_amount
  WHERE user_id = v_customer_id;

  -- Add to provider (minus 15% fee)
  UPDATE wallets SET balance = balance + (p_amount * 0.85)
  WHERE user_id = v_provider_id;

  -- Record transactions
  INSERT INTO wallet_transactions (wallet_id, type, amount, reference_id)
  SELECT id, 'payment', -p_amount, p_ride_id FROM wallets WHERE user_id = v_customer_id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, reference_id)
  SELECT id, 'earning', p_amount * 0.85, p_ride_id FROM wallets WHERE user_id = v_provider_id;

  RETURN TRUE;
END;
$$;
```

## Query Optimization

```typescript
// ✅ Select specific columns
const { data } = await supabase
  .from("rides")
  .select("id, status, fare") // NOT '*'
  .eq("customer_id", userId)
  .order("created_at", { ascending: false })
  .limit(20);

// ✅ Use joins (avoid N+1)
const { data } = await supabase
  .from("rides")
  .select(
    `
    id, status, fare,
    customer:profiles!customer_id(name, phone),
    provider:providers!provider_id(name, vehicle)
  `
  )
  .eq("id", rideId)
  .single();
```

## Performance Monitoring

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find missing indexes
SELECT relname, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND seq_tup_read > 10000
ORDER BY seq_tup_read DESC;
```
