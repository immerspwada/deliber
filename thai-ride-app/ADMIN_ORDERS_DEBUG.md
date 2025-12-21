# Admin Orders Debug Guide

## ปัญหาที่พบ
หน้า `/admin/orders` แสดงว่างเปล่าเนื่องจาก RLS (Row Level Security) block การ query ข้อมูล

## สาเหตุ
1. **Demo Mode** (`admin@demo.com / admin1234`) ไม่มี Supabase session จริง
2. RLS policies ต้องการ `auth.uid()` ซึ่งไม่มีใน demo mode
3. RPC functions ที่เป็น `SECURITY DEFINER` ยังไม่ได้ grant ให้ `anon` role

## วิธีแก้ไข

### Option 1: Deploy Migration (แนะนำ)
```bash
cd thai-ride-app

# Deploy migration ใหม่ที่เพิ่ม public access
npx supabase db push

# หรือถ้าใช้ Supabase CLI
supabase db push
```

### Option 2: Run SQL Manually
ไปที่ Supabase Dashboard > SQL Editor และรัน:

```sql
-- Grant execute to anon role for admin RPC functions
GRANT EXECUTE ON FUNCTION get_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_all_orders_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO anon;
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_users_for_admin TO anon;
GRANT EXECUTE ON FUNCTION get_all_providers_for_admin TO anon;
GRANT EXECUTE ON FUNCTION count_providers_for_admin TO anon;
GRANT EXECUTE ON FUNCTION search_providers_for_admin TO anon;

-- Add public read policies for order tables
CREATE POLICY "public_read_ride_requests" ON ride_requests FOR SELECT USING (true);
CREATE POLICY "public_read_delivery_requests" ON delivery_requests FOR SELECT USING (true);
CREATE POLICY "public_read_shopping_requests" ON shopping_requests FOR SELECT USING (true);
CREATE POLICY "public_read_queue_bookings" ON queue_bookings FOR SELECT USING (true);
CREATE POLICY "public_read_moving_requests" ON moving_requests FOR SELECT USING (true);
CREATE POLICY "public_read_laundry_requests" ON laundry_requests FOR SELECT USING (true);
CREATE POLICY "public_read_users" ON users FOR SELECT USING (true);
CREATE POLICY "public_read_service_providers" ON service_providers FOR SELECT USING (true);
```

### Option 3: ใช้ Real Admin Account
1. สร้าง user ใน Supabase Auth
2. อัพเดท `users` table ให้มี `role = 'admin'`
3. Login ด้วย email/password จริง

## Debug Steps

### 1. เปิด Browser Console (F12)
ดู error messages จาก Supabase

### 2. ตรวจสอบ Network Tab
- ดู request ไปที่ Supabase
- ดู response status และ error message

### 3. ตรวจสอบ RLS Policies
```sql
-- ดู policies ทั้งหมดของ ride_requests
SELECT * FROM pg_policies WHERE tablename = 'ride_requests';
```

## Files ที่แก้ไข
- `src/views/AdminOrdersView.vue` - เพิ่ม RPC function call และ debug logging
- `supabase/migrations/130_admin_public_rpc_access.sql` - เพิ่ม public access

## การตรวจสอบว่าทำงานแล้ว
1. Login ที่ `/admin/login` ด้วย `admin@demo.com / admin1234`
2. ไปที่ `/admin/orders`
3. ควรเห็นรายการออเดอร์ (ถ้ามีข้อมูลใน database)
4. ถ้าไม่มีข้อมูล จะเห็น "ไม่พบออเดอร์" แทนที่จะเป็นหน้าว่าง
