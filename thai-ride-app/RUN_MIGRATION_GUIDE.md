# วิธี Run Migration บน Supabase Dashboard

## ขั้นตอนการ Run Migration 129

### 1. เปิด Supabase Dashboard
- ไปที่: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
- Login ด้วย account ที่มีสิทธิ์

### 2. ไปที่ SQL Editor
- คลิก "SQL Editor" ในเมนูด้านซ้าย
- คลิก "New query"

### 3. Copy SQL จากไฟล์
- เปิดไฟล์: `supabase/migrations/129_admin_full_access_policies.sql`
- Copy ทั้งหมด
- Paste ลงใน SQL Editor

### 4. Run Query
- คลิกปุ่ม "Run" หรือกด Ctrl+Enter
- รอจนเสร็จ

### 5. ตรวจสอบผลลัพธ์
- ควรเห็นข้อความ:
  - ✓ Admin full access policies created
  - ✓ Admin RPC functions created
  - ✓ Permissions granted

---

## Functions ที่จะถูกสร้าง

| Function | รายละเอียด |
|----------|------------|
| `is_admin()` | ตรวจสอบว่า user เป็น admin หรือไม่ |
| `get_all_orders_for_admin()` | ดึง orders ทุกประเภท |
| `count_all_orders_for_admin()` | นับ orders |
| `get_admin_dashboard_stats()` | ดึง dashboard stats |
| `get_all_users_for_admin()` | ดึง users ทั้งหมด |
| `count_users_for_admin()` | นับ users |
| `get_all_providers_for_admin()` | ดึง providers พร้อม user info |
| `count_providers_for_admin()` | นับ providers |
| `search_providers_for_admin()` | ค้นหา providers |

---

## RLS Policies ที่จะถูกสร้าง

Admin จะมีสิทธิ์เข้าถึงตารางเหล่านี้:
- ride_requests
- delivery_requests
- shopping_requests
- queue_bookings
- moving_requests
- laundry_requests
- users
- service_providers
- payments
- wallet_transactions
- user_wallets
- support_tickets
- promo_codes
- user_notifications
- ride_ratings
- delivery_ratings
- shopping_ratings
- refunds
- scheduled_rides
- user_subscriptions
- insurance_claims
- companies

---

## หลังจาก Run Migration แล้ว

1. **ทดสอบ Admin Login**
   - ไปที่: http://localhost:5173/admin/login
   - Login ด้วย: `admin@demo.com` / `admin1234`

2. **ตรวจสอบ Dashboard**
   - ควรเห็นข้อมูลจริงจาก database
   - ไม่ควรเห็น mock data

3. **ตรวจสอบ Providers**
   - ไปที่: Admin > Providers
   - ควรเห็นรายการ providers จริง

4. **ตรวจสอบ Orders**
   - ไปที่: Admin > Orders
   - ควรเห็นรายการ orders จริง

---

## Troubleshooting

### ถ้า RPC function ไม่ทำงาน
- ตรวจสอบว่า user มี role = 'admin' ใน users table
- ตรวจสอบ Console ใน Browser DevTools

### ถ้าเห็น empty data
- อาจยังไม่มีข้อมูลจริงใน database
- ลองสร้าง test data ผ่าน app

### ถ้า Login ไม่ได้
- ตรวจสอบว่ามี user `admin@demo.com` ใน Supabase Auth
- ตรวจสอบว่า user มี role = 'admin' ใน users table
