# Admin RPC Functions Fix Guide

## ปัญหา
Admin Dashboard และ Verification Queue ไม่สามารถทำงานได้เนื่องจาก RPC functions หายไป (404 Not Found)

## สาเหตุ
- Migration 129 มี RPC functions แต่ไม่ได้ถูก deploy ไปยัง Supabase
- ฟังก์ชันที่หายไป: `get_admin_dashboard_stats`, `get_all_providers_for_admin`, และอื่นๆ

## วิธีแก้ไข (ทำตามลำดับ)

### ขั้นตอนที่ 1: สร้าง Admin RPC Functions ทั้งหมด

1. เปิด Supabase Dashboard
2. ไปที่ **SQL Editor**
3. คัดลอกและรันไฟล์: `scripts/fix-all-admin-rpc-functions.sql`

**ไฟล์นี้จะสร้าง:**
- ✅ `is_admin()` - ตรวจสอบว่าเป็น admin หรือไม่
- ✅ `get_admin_dashboard_stats()` - สถิติ dashboard
- ✅ `get_all_providers_for_admin()` - ดึงข้อมูล providers ทั้งหมด
- ✅ `count_providers_for_admin()` - นับจำนวน providers
- ✅ `get_all_orders_for_admin()` - ดึงข้อมูล orders ทั้งหมด
- ✅ `count_all_orders_for_admin()` - นับจำนวน orders
- ✅ `get_all_users_for_admin()` - ดึงข้อมูล users ทั้งหมด
- ✅ `count_users_for_admin()` - นับจำนวน users

**ผลลัพธ์ที่คาดหวัง:**
```
✓ All admin RPC functions created/updated successfully
✓ Functions: is_admin, get_admin_dashboard_stats, get_all_providers_for_admin, count_providers_for_admin
✓ Functions: get_all_orders_for_admin, count_all_orders_for_admin
✓ Functions: get_all_users_for_admin, count_users_for_admin
✓ All functions granted to authenticated users
```

### ขั้นตอนที่ 2: สร้าง Verification Queue System

1. ยังคงอยู่ใน **SQL Editor**
2. คัดลอกและรันไฟล์: `supabase/migrations/166_fix_verification_queue_complete.sql`

**ไฟล์นี้จะสร้าง:**
- ✅ ตาราง `provider_verification_queue`
- ✅ RLS policies สำหรับ admin
- ✅ `admin_get_verification_queue()` - ดึงคิวรอตรวจสอบ
- ✅ `admin_get_pending_providers()` - ดึง providers ที่รอตรวจสอบ (fallback)
- ✅ `admin_approve_provider_from_queue()` - อนุมัติ provider
- ✅ `admin_reject_provider_from_queue()` - ปฏิเสธ provider
- ✅ Auto-trigger เพิ่ม pending providers เข้าคิวอัตโนมัติ
- ✅ Backfill providers ที่มีอยู่แล้วเข้าคิว

**ผลลัพธ์ที่คาดหวัง:**
```
✓ Migration 166_fix_verification_queue_complete completed
✓ Verification queue table ready
✓ RPC functions created: admin_get_verification_queue, admin_get_pending_providers
✓ Helper functions created: admin_approve_provider_from_queue, admin_reject_provider_from_queue
✓ Auto-trigger enabled for new pending providers
NOTICE: Added X pending providers to verification queue
```

### ขั้นตอนที่ 3: สร้างข้อมูลทดสอบ (Optional)

ถ้าต้องการทดสอบ verification queue:

1. รันไฟล์: `scripts/create-test-pending-provider.sql`

**ไฟล์นี้จะสร้าง:**
- ✅ Test user account
- ✅ Test pending provider
- ✅ เพิ่มเข้า verification queue อัตโนมัติ

### ขั้นตอนที่ 4: ตรวจสอบว่าทำงานหรือไม่

#### 4.1 ตรวจสอบ RPC Functions

รัน SQL นี้เพื่อตรวจสอบว่าฟังก์ชันถูกสร้างแล้ว:

```sql
-- ตรวจสอบว่ามีฟังก์ชันอะไรบ้าง
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%admin%'
ORDER BY routine_name;
```

**ควรเห็น:**
- `admin_approve_provider_from_queue`
- `admin_get_pending_providers`
- `admin_get_verification_queue`
- `admin_reject_provider_from_queue`
- `count_all_orders_for_admin`
- `count_providers_for_admin`
- `count_users_for_admin`
- `get_admin_dashboard_stats`
- `get_all_orders_for_admin`
- `get_all_providers_for_admin`
- `get_all_users_for_admin`
- `is_admin`

#### 4.2 ทดสอบ Dashboard Stats

```sql
SELECT * FROM get_admin_dashboard_stats();
```

**ควรได้ผลลัพธ์:**
```
total_users | total_providers | online_providers | total_rides | ...
------------|-----------------|------------------|-------------|----
     X      |        Y        |        Z         |      W      | ...
```

#### 4.3 ทดสอบ Verification Queue

```sql
SELECT * FROM admin_get_verification_queue('pending');
```

**ควรได้ผลลัพธ์:**
- ถ้ามี pending providers จะแสดงรายการ
- ถ้าไม่มี จะเป็น empty result (ไม่ใช่ error)

### ขั้นตอนที่ 5: ทดสอบใน Admin Dashboard

1. เปิด browser ไปที่ `http://localhost:5173/admin/login`
2. Login ด้วย: `admin@demo.com` / `admin1234`
3. ตรวจสอบหน้าต่างๆ:
   - ✅ Dashboard - ควรแสดงสถิติ
   - ✅ Customers - ควรแสดงรายการลูกค้า
   - ✅ Providers - ควรแสดงรายการ providers
   - ✅ Orders - ควรแสดงรายการ orders
   - ✅ Verification Queue - ควรแสดงรายการรอตรวจสอบ (หรือ empty state)

4. เปิด Browser Console (F12) ดูว่ามี error หรือไม่
   - ❌ ไม่ควรมี 404 errors
   - ❌ ไม่ควรมี RPC function not found errors

### ขั้นตอนที่ 6: ทดสอบ Verification Queue

1. ไปที่ `/admin/verification-queue`
2. ควรเห็น:
   - ถ้ามี pending providers: แสดงรายการพร้อมปุ่ม "อนุมัติ" และ "ปฏิเสธ"
   - ถ้าไม่มี: แสดง empty state "ไม่มีรายการรอตรวจสอบ"
3. ทดสอบอนุมัติ/ปฏิเสธ provider (ถ้ามี)

## การตรวจสอบปัญหา (Troubleshooting)

### ปัญหา: ยังคงเห็น 404 error

**วิธีแก้:**
1. ตรวจสอบว่ารัน SQL scripts แล้วจริงๆ
2. ตรวจสอบว่าไม่มี error ใน SQL Editor
3. Refresh browser (Ctrl+Shift+R)
4. ลอง logout และ login ใหม่

### ปัญหา: Empty state แต่มี pending providers

**วิธีแก้:**
1. ตรวจสอบว่า providers มี status = 'pending' จริง:
```sql
SELECT id, provider_uid, status, created_at
FROM service_providers
WHERE status = 'pending';
```

2. ตรวจสอบว่าถูกเพิ่มเข้า queue แล้ว:
```sql
SELECT * FROM provider_verification_queue
WHERE status IN ('pending', 'in_review');
```

3. ถ้าไม่มีใน queue ให้เพิ่มด้วยมือ:
```sql
SELECT admin_add_to_verification_queue(id)
FROM service_providers
WHERE status = 'pending';
```

### ปัญหา: Permission denied

**วิธีแก้:**
1. ตรวจสอบว่า user เป็น admin:
```sql
SELECT id, email, role
FROM users
WHERE email = 'admin@demo.com';
```

2. ถ้า role ไม่ใช่ 'admin' ให้แก้ไข:
```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@demo.com';
```

### ปัญหา: Functions ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบว่าฟังก์ชันมีอยู่จริง:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_admin_dashboard_stats';
```

2. ถ้าไม่มี ให้รัน `fix-all-admin-rpc-functions.sql` อีกครั้ง

3. ตรวจสอบ permissions:
```sql
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_admin_dashboard_stats';
```

## สรุป

หลังจากทำตามขั้นตอนทั้งหมด:

✅ Admin Dashboard ควรทำงานได้ปกติ
✅ Verification Queue ควรแสดงรายการหรือ empty state
✅ ไม่มี 404 errors ใน console
✅ สามารถอนุมัติ/ปฏิเสธ providers ได้

## ไฟล์ที่เกี่ยวข้อง

- `scripts/fix-all-admin-rpc-functions.sql` - สร้าง admin RPC functions ทั้งหมด
- `supabase/migrations/166_fix_verification_queue_complete.sql` - สร้าง verification queue system
- `scripts/create-test-pending-provider.sql` - สร้างข้อมูลทดสอบ
- `scripts/check-and-run-migration-166.sql` - ตรวจสอบว่า migration 166 รันแล้วหรือยัง

## หมายเหตุ

- ต้องรัน scripts ใน Supabase SQL Editor เท่านั้น (ไม่ใช่ local terminal)
- ต้องรันตามลำดับ: fix-all-admin-rpc-functions.sql → 166_fix_verification_queue_complete.sql
- ถ้ามี error ให้อ่าน error message และแก้ไขตามที่แนะนำ
- สามารถรัน scripts ซ้ำได้ (idempotent) ไม่ทำให้เกิดปัญหา
