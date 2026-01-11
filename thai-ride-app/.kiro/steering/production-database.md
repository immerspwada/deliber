---
inclusion: always
---

# 🗄️ Production Database Guidelines

## Migration Best Practices

### Migration File Naming

```bash
# Format: {sequence}_{description}.sql
# Examples:
237_add_user_preferences.sql
238_create_notifications_table.sql
239_add_index_rides_status.sql
```

### Migration Template

```sql
-- Migration: 237_add_user_preferences.sql
-- Description: เพิ่มตาราง user_preferences สำหรับเก็บการตั้งค่าผู้ใช้
-- Author: [name]
-- Date: 2026-01-11
-- Rollback: 237_add_user_preferences_rollback.sql

-- ============================================
-- PRE-MIGRATION CHECKS
-- ============================================
DO $$
BEGIN
  -- Check if table already exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    RAISE EXCEPTION 'Table user_preferences already exists';
  END IF;
END $$;

-- ============================================
-- MIGRATION
-- ============================================
BEGIN;

-- Create table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language VARCHAR(5) DEFAULT 'th',
  notifications_enabled BOOLEAN DEFAULT true,
  dark_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================
DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    RAISE EXCEPTION 'Migration failed: table not created';
  END IF;

  -- Verify RLS is enabled
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_preferences' AND rowsecurity = true) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled';
  END IF;

  RAISE NOTICE 'Migration 237 completed successfully';
END $$;
```

### Rollback Template

```sql
-- Rollback: 237_add_user_preferences_rollback.sql
-- Description: Rollback migration 237

BEGIN;

-- Drop policies first
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;

-- Drop trigger
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

-- Drop table
DROP TABLE IF EXISTS user_preferences;

COMMIT;
```

## Query Optimization

### Index Strategy

```sql
-- ✅ Production indexes ที่จำเป็น

-- Rides table - frequently queried
CREATE INDEX CONCURRENTLY idx_rides_status ON rides(status);
CREATE INDEX CONCURRENTLY idx_rides_customer_id ON rides(customer_id);
CREATE INDEX CONCURRENTLY idx_rides_provider_id ON rides(provider_id);
CREATE INDEX CONCURRENTLY idx_rides_created_at ON rides(created_at DESC);
CREATE INDEX CONCURRENTLY idx_rides_status_created ON rides(status, created_at DESC);

-- Location-based queries (PostGIS)
CREATE INDEX CONCURRENTLY idx_rides_pickup_location
ON rides USING GIST(pickup_location);

CREATE INDEX CONCURRENTLY idx_providers_current_location
ON providers USING GIST(current_location);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_rides_provider_status_date
ON rides(provider_id, status, created_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_active_providers
ON providers(id) WHERE status = 'active' AND is_online = true;
```

### Query Patterns

```typescript
// ✅ Optimized queries

// Use select() with specific columns
const { data } = await supabase
  .from("rides")
  .select("id, status, fare, created_at") // ไม่ใช้ *
  .eq("customer_id", userId)
  .order("created_at", { ascending: false })
  .limit(20);

// Use pagination
const { data, count } = await supabase
  .from("rides")
  .select("*", { count: "exact" })
  .range(offset, offset + limit - 1);

// Avoid N+1 with joins
const { data } = await supabase
  .from("rides")
  .select(
    `
    id, status, fare,
    customer:customers(id, name, phone),
    provider:providers(id, name, vehicle_type)
  `
  )
  .eq("id", rideId)
  .single();

// ❌ Avoid
const { data: rides } = await supabase.from("rides").select("*");
for (const ride of rides) {
  // N+1 query!
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", ride.customer_id);
}
```

## Connection Management

### Connection Pool Settings

```sql
-- Supabase connection limits
-- Free tier: 60 connections
-- Pro tier: 200 connections
-- Enterprise: Custom

-- Monitor connections
SELECT
  count(*) as total_connections,
  state,
  usename
FROM pg_stat_activity
GROUP BY state, usename;

-- Kill idle connections (admin only)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes';
```

### Client-side Connection Handling

```typescript
// ✅ Singleton Supabase client
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    );
  }
  return supabaseInstance;
}

// ✅ Cleanup realtime subscriptions
onUnmounted(() => {
  supabase.removeAllChannels();
});
```

## Data Integrity

### Constraints

```sql
-- ✅ Production constraints

-- Check constraints
ALTER TABLE wallets
ADD CONSTRAINT chk_balance_non_negative
CHECK (balance >= 0);

ALTER TABLE rides
ADD CONSTRAINT chk_fare_positive
CHECK (fare > 0);

ALTER TABLE withdrawals
ADD CONSTRAINT chk_amount_positive
CHECK (amount > 0);

-- Foreign key constraints with proper actions
ALTER TABLE rides
ADD CONSTRAINT fk_rides_customer
FOREIGN KEY (customer_id) REFERENCES customers(id)
ON DELETE RESTRICT;  -- ห้ามลบ customer ที่มี rides

ALTER TABLE wallet_transactions
ADD CONSTRAINT fk_wallet_transactions_wallet
FOREIGN KEY (wallet_id) REFERENCES wallets(id)
ON DELETE RESTRICT;
```

### Transaction Patterns

```sql
-- ✅ ACID transactions for financial operations
CREATE OR REPLACE FUNCTION process_ride_payment(
  p_ride_id UUID,
  p_customer_id UUID,
  p_provider_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_balance NUMERIC;
BEGIN
  -- Lock wallets to prevent race conditions
  SELECT balance INTO v_customer_balance
  FROM wallets
  WHERE user_id = p_customer_id
  FOR UPDATE;

  -- Validate balance
  IF v_customer_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from customer
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_customer_id;

  -- Add to provider (with platform fee deduction)
  UPDATE wallets
  SET balance = balance + (p_amount * 0.85),  -- 15% platform fee
      updated_at = NOW()
  WHERE user_id = p_provider_id;

  -- Record transactions
  INSERT INTO wallet_transactions (wallet_id, type, amount, reference_id)
  SELECT id, 'payment', -p_amount, p_ride_id
  FROM wallets WHERE user_id = p_customer_id;

  INSERT INTO wallet_transactions (wallet_id, type, amount, reference_id)
  SELECT id, 'earning', p_amount * 0.85, p_ride_id
  FROM wallets WHERE user_id = p_provider_id;

  -- Update ride status
  UPDATE rides
  SET status = 'paid',
      paid_at = NOW()
  WHERE id = p_ride_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    INSERT INTO error_logs (error_message, context)
    VALUES (SQLERRM, jsonb_build_object('ride_id', p_ride_id));

    RAISE;
END;
$$;
```

## Backup & Recovery

### Backup Strategy

```bash
# Daily automated backups (Supabase Pro)
# - Point-in-time recovery up to 7 days
# - Daily snapshots retained for 7 days

# Manual backup before major changes
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Backup specific tables
pg_dump -t rides -t wallets -t transactions > critical_tables_backup.sql
```

### Recovery Procedures

```bash
# Restore from backup
psql $DATABASE_URL < backup_20260111.sql

# Point-in-time recovery (Supabase Dashboard)
# 1. Go to Database > Backups
# 2. Select point in time
# 3. Restore to new project or replace

# Verify data integrity after restore
SELECT COUNT(*) FROM rides;
SELECT SUM(balance) FROM wallets;
SELECT COUNT(*) FROM wallet_transactions;
```

## Performance Monitoring

### Slow Query Detection

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- > 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find missing indexes
SELECT
  schemaname,
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
AND seq_tup_read > 10000
ORDER BY seq_tup_read DESC;
```

### Table Statistics

```sql
-- Table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as data_size,
  pg_size_pretty(pg_indexes_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Row counts
SELECT
  schemaname,
  relname,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```
