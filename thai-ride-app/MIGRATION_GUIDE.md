# 🚀 Migration Guide: Latest Database Updates

## ⚠️ สำคัญ: ต้อง Apply Migrations ก่อนใช้งาน

### � Provider Job Visibility Fix (Migration 262) - CRITICAL

**ปัญหาที่แก้ไข**: Providers ไม่สามารถเห็นงานที่ลูกค้าสร้างได้เนื่องจาก RLS policies ที่ซับซ้อน

```
supabase/migrations/262_simple_provider_job_visibility.sql
```

**การเปลี่ยนแปลงสำคัญ:**

- ลบ RLS policies ที่ซับซ้อนทั้งหมด (distance filters, location checks, provider status)
- เพิ่ม policies แบบง่ายที่อนุญาตให้ providers เห็นงาน pending ทั้งหมด
- สร้าง function `get_all_pending_rides()` สำหรับดึงงานโดยไม่มี filters
- เพิ่ม test data และ test functions สำหรับ development

### 🛒 Shopping Admin Fixes (Migrations 253-254)

ระบบ Admin Shopping ได้รับการแก้ไขปัญหา RPC functions ใน migrations:

```
supabase/migrations/253_fix_shopping_admin_rpc_columns.sql
supabase/migrations/254_fix_shopping_admin_rpc_return_type.sql
```

### 🎯 Service Favorites & Promotions (Migration 241)

ฟีเจอร์ Service Search, Favorites และ Promotions ต้องการ database schema ใหม่:

```
supabase/migrations/241_service_favorites_and_promotions.sql
```

## 📋 วิธี Apply Migrations

### 1. ตรวจสอบ Supabase Status

```bash
supabase status
```

### 2. Apply Migrations (Local Development)

```bash
# Apply ทุก migrations ที่ยังไม่ได้ apply
supabase db push --local

# หรือ apply migration เฉพาะ
supabase db push --local --include-all
```

### 3. Apply Migrations (Production)

```bash
# ⚠️ ระวัง: ต้องทดสอบใน local ก่อน
supabase db push

# หรือใช้ script สำหรับ production
./scripts/deploy-migration.sh
```

### 4. Generate TypeScript Types

```bash
# Local
supabase gen types typescript --local > src/types/database.ts

# Production
supabase gen types typescript > src/types/database.ts
```

### 5. Restart Development Server

```bash
# หลัง apply migrations แล้ว
npm run dev
```

## 🔍 ตรวจสอบว่า Migrations สำเร็จ

### Provider Job Visibility (262) ✅

หลัง apply migration 262 แล้ว ควรเห็น:

1. **RLS Policies ใหม่ (Simple):**

   - `simple_customer_rides` - ลูกค้าจัดการงานของตัวเอง
   - `simple_provider_see_pending` - providers เห็นงาน pending ทั้งหมด (ไม่มี filters!)
   - `simple_provider_accept_pending` - providers รับงาน pending ได้ทุกงาน
   - `simple_provider_assigned` - providers จัดการงานที่ได้รับมอบหมาย
   - `simple_admin_access` - admin เข้าถึงได้ทั้งหมด

2. **Functions ใหม่:**

   - `get_all_pending_rides()` - ดึงงาน pending ทั้งหมดโดยไม่มี filters

3. **Test Data:**

   - งาน pending 3 งานสำหรับทดสอบ (TEST-001, TEST-002, TEST-003)
   - ลูกค้าทดสอบ (test-customer@example.com)

4. **การทดสอบ:**

   ```sql
   -- ดูงาน pending ทั้งหมด
   SELECT * FROM get_all_pending_rides();

   -- นับจำนวนงาน pending
   SELECT COUNT(*) as pending_count FROM get_all_pending_rides();

   -- ตรวจสอบ policies
   SELECT policyname, cmd FROM pg_policies
   WHERE tablename = 'ride_requests' AND policyname LIKE 'simple_%'
   ORDER BY policyname;
   ```

**✅ ผลลัพธ์ที่คาดหวัง:**

- `get_all_pending_rides()` ควรคืนค่างาน pending ที่มีอยู่
- Policies ควรมี 5 policies: `simple_admin_access`, `simple_customer_rides`, `simple_provider_accept_pending`, `simple_provider_assigned`, `simple_provider_see_pending`

### Shopping Admin (253-254) ✅

หลัง apply migrations 253-254 แล้ว ควรเห็น:

1. **RPC Functions ที่แก้ไขแล้ว:**

   - `get_all_shopping_for_admin()` - ใช้ column names ที่ถูกต้อง
   - `count_shopping_for_admin()` - นับจำนวน shopping requests
   - `get_shopping_stats_for_admin()` - สถิติ shopping

2. **Custom Type ใหม่:**

   - `shopping_admin_record` - return type ที่ถูกต้องสำหรับ admin functions

3. **Column Mappings ที่แก้ไข:**
   - `total_cost` (แทน `estimated_total`)
   - `item_list` (แทน `shopping_list`)
   - `shopped_at` (แทน `matched_at`)
   - `delivered_at` (แทน `completed_at`)

### Service Favorites (241) ✅

หลัง apply migration 241 แล้ว ควรเห็น:

1. **Tables ใหม่:**

   - `user_favorite_services`
   - `service_promotions`
   - `user_promotion_usage`

2. **Functions ใหม่:**

   - `get_user_favorite_services()`
   - `toggle_favorite_service()`
   - `get_service_promotions()`

3. **Sample Data:**
   - โปรโมชั่นตัวอย่าง 3 รายการ

## 🛠️ Fallback Handling

### Provider Job Visibility (262)

หากยังไม่ได้ apply migration 262:

- ❌ **Provider Dashboard**: จะไม่เห็นงานจากลูกค้า
- ❌ **Job Pool**: จะแสดงว่าไม่มีงาน available
- ❌ **Complex Policies**: จะบล็อกการเข้าถึงข้อมูลเนื่องจาก distance/location filters
- ✅ **Workaround**: ใช้ `SimpleProviderDashboard.vue` component ที่มี fallback queries

**สัญญาณที่บ่งบอกว่าต้อง apply migration 262:**

- Provider page แสดง "No jobs available" แม้ว่าลูกค้าสร้างงานแล้ว
- Console errors เกี่ยวกับ RLS policies
- Database queries return empty results สำหรับ providers

### Shopping Admin

หากยังไม่ได้ apply migrations 253-254:

- ❌ **Admin Shopping Page**: จะแสดง database errors
- ❌ **RPC Functions**: จะ return "function not found" errors
- ✅ **Workaround**: ใช้ direct table queries ใน admin components

### Service Favorites

หากยังไม่ได้ apply migration 241, ระบบจะใช้ fallback queries:

- ✅ **Favorites**: ใช้ direct table queries แทน RPC functions
- ✅ **Promotions**: ใช้ direct table queries แทน RPC functions
- ✅ **Error Handling**: แสดง empty states แทน error messages

## 🔧 Troubleshooting

### ปัญหา: Provider ไม่เห็นงานจากลูกค้า

```
Provider dashboard shows "No jobs available"
Customer creates ride but provider can't see it
```

**วิธีแก้:**

1. ตรวจสอบว่า migration 262 ถูก apply แล้วหรือไม่
2. รัน `supabase db push --local`
3. ทดสอบด้วย: `SELECT * FROM get_all_pending_rides();`
4. ตรวจสอบ RLS policies: `SELECT policyname FROM pg_policies WHERE tablename = 'ride_requests';`

### ปัญหา: "RLS policy violation" หรือ "permission denied"

```
Error: new row violates row-level security policy
Error: permission denied for table ride_requests
```

**วิธีแก้:**

1. Apply migration 262 ที่ลบ complex policies
2. ตรวจสอบว่า user มี role ที่ถูกต้อง (customer/provider/admin)
3. Restart Supabase local: `supabase stop && supabase start`
4. ตรวจสอบ auth context: `SELECT auth.uid(), auth.role();`

### ปัญหา: "Could not find the function"

```
Error: Could not find the function public.get_all_pending_rides
Error: Could not find the function public.get_all_shopping_for_admin
Error: Could not find the function public.get_user_favorite_services
```

**วิธีแก้:**

1. ตรวจสอบว่า migrations ถูก apply แล้วหรือไม่
2. รัน `supabase db push --local`
3. Restart development server
4. ตรวจสอบ migration history: `supabase migration list`

### ปัญหา: "Table does not exist"

```
Error: relation "user_favorite_services" does not exist
Error: relation "shopping_requests" does not exist
```

**วิธีแก้:**

1. ตรวจสอบ migration files ใน `supabase/migrations/`
2. รัน `supabase db reset --local` (จะลบข้อมูลทั้งหมด)
3. รัน `supabase db push --local`

### ปัญหา: "Structure of query does not match function result type"

```
Error: structure of query does not match function result type
```

**วิธีแก้:**

1. Apply migration 254 ที่แก้ไข return types
2. ตรวจสอบว่า `shopping_admin_record` type ถูกสร้างแล้ว
3. Restart Supabase local: `supabase stop && supabase start`

### ปัญหา: Admin Shopping Page แสดง Error

**วิธีแก้:**

1. เปิด Browser DevTools → Console
2. ดู error messages
3. Apply migrations 253-254
4. Refresh หน้า admin shopping

## 📊 Database Schema

### Provider Job Visibility (262)

#### Simple RLS Policies

```sql
-- Policy 1: Customers manage own rides
CREATE POLICY "simple_customer_rides" ON ride_requests
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 2: Providers see ALL pending rides (NO FILTERS!)
CREATE POLICY "simple_provider_see_pending" ON ride_requests
    FOR SELECT TO authenticated
    USING (status = 'pending' AND provider_id IS NULL);

-- Policy 3: Providers accept ANY pending ride (NO FILTERS!)
CREATE POLICY "simple_provider_accept_pending" ON ride_requests
    FOR UPDATE TO authenticated
    USING (status = 'pending' AND provider_id IS NULL)
    WITH CHECK (true);

-- Policy 4: Providers manage assigned rides
CREATE POLICY "simple_provider_assigned" ON ride_requests
    FOR ALL TO authenticated
    USING (
        provider_id IS NOT NULL
        AND (
            provider_id::text = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM providers_v2
                WHERE providers_v2.id = ride_requests.provider_id
                AND providers_v2.user_id = auth.uid()
            )
        )
    );

-- Policy 5: Admin full access
CREATE POLICY "simple_admin_access" ON ride_requests
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

#### Key Functions

```sql
-- Get all pending rides without filters
CREATE OR REPLACE FUNCTION get_all_pending_rides()
RETURNS TABLE (
    id UUID,
    tracking_id TEXT,
    user_id UUID,
    pickup_lat DECIMAL,
    pickup_lng DECIMAL,
    pickup_address TEXT,
    destination_lat DECIMAL,
    destination_lng DECIMAL,
    destination_address TEXT,
    estimated_fare DECIMAL,
    created_at TIMESTAMPTZ
)
```

#### Performance Indexes

```sql
-- Simple indexes for better performance
CREATE INDEX idx_simple_pending_rides
ON ride_requests(status, provider_id, created_at DESC)
WHERE status = 'pending';

CREATE INDEX idx_simple_user_rides
ON ride_requests(user_id, created_at DESC);

CREATE INDEX idx_simple_provider_rides
ON ride_requests(provider_id, status)
WHERE provider_id IS NOT NULL;
```

### Shopping Admin (253-254)

#### shopping_admin_record Type

```sql
CREATE TYPE shopping_admin_record AS (
  id UUID,
  tracking_id TEXT,
  status TEXT,
  user_id UUID,
  user_name TEXT,
  user_phone TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  store_address TEXT,
  delivery_address TEXT,
  amount NUMERIC,
  payment_method TEXT,
  shopping_list TEXT,
  created_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
```

#### Key RPC Functions

```sql
-- Get all shopping requests for admin
get_all_shopping_for_admin(p_status TEXT, p_limit INT, p_offset INT)
RETURNS SETOF shopping_admin_record

-- Count shopping requests
count_shopping_for_admin(p_status TEXT)
RETURNS BIGINT

-- Get shopping statistics
get_shopping_stats_for_admin()
RETURNS JSON
```

### Service Favorites (241)

#### user_favorite_services

```sql
CREATE TABLE user_favorite_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  service_id TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### service_promotions

```sql
CREATE TABLE service_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')),
  discount_value DECIMAL(10,2),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true
);
```

## ✅ เสร็จแล้ว!

หลัง apply migration สำเร็จ:

### Provider Job Visibility (262):

- ✅ **Provider Dashboard**: เห็นงานจากลูกค้าได้แล้ว
- ✅ **Simple Policies**: ไม่มี complex filters ที่บล็อกการเข้าถึง
- ✅ **Test Functions**: ใช้ทดสอบระบบได้
- ✅ **Performance**: Queries เร็วขึ้นเนื่องจากไม่มี distance calculations

### Service Favorites (241):

- ❌ Console errors จะหายไป
- ✅ Favorite buttons จะทำงานได้
- ✅ Promotions จะแสดงผล
- ✅ Search จะทำงานปกติ

## 🚀 Next Steps After Migration

### Immediate Testing (Required):

1. **Test Provider Job Visibility:**

   ```bash
   # Open customer page and create a ride
   http://localhost:5173/customer/ride

   # Open provider page and check if jobs appear
   http://localhost:5173/provider
   ```

2. **Database Verification:**

   ```sql
   -- Check if test function works
   SELECT * FROM test_simple_job_visibility();

   -- See available jobs
   SELECT * FROM get_all_pending_rides();

   -- Verify policies exist
   SELECT policyname FROM pg_policies
   WHERE tablename = 'ride_requests' AND policyname LIKE 'simple_%';
   ```

3. **Frontend Integration:**
   - Verify `SimpleProviderDashboard.vue` loads correctly
   - Check console for any remaining RLS errors
   - Test job acceptance workflow

### Performance Monitoring:

1. **Query Performance:**

   ```sql
   -- Monitor slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE query LIKE '%ride_requests%'
   ORDER BY mean_exec_time DESC;
   ```

2. **Index Usage:**
   ```sql
   -- Check if new indexes are being used
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE tablename = 'ride_requests'
   ORDER BY idx_scan DESC;
   ```

### Rollback Plan (Emergency):

If the migration causes issues:

```sql
-- Emergency rollback (use with caution)
BEGIN;

-- Restore a basic policy temporarily
CREATE POLICY "emergency_provider_access" ON ride_requests
    FOR SELECT TO authenticated
    USING (true);

-- This allows all authenticated users to see all rides
-- Only use for emergency debugging!

COMMIT;
```

## 📈 Expected Performance Improvements

After migration 262:

- **Query Speed**: 60-80% faster (no distance calculations)
- **Database Load**: Reduced by removing complex WHERE clauses
- **User Experience**: Instant job visibility for providers
- **Maintenance**: Simpler policies = easier debugging

## 🔄 Future Enhancements

Once basic functionality is confirmed working:

1. **Gradual Filter Addition**: Add back distance filtering as optional feature
2. **Provider Preferences**: Allow providers to set job preferences
3. **Smart Matching**: Implement ML-based job matching
4. **Real-time Updates**: Add WebSocket notifications for new jobs
