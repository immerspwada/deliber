# Cross-Role Integration Fix Guide

## ปัญหาที่พบ
Customer สร้าง Ride แล้ว Admin ไม่เห็นออเดอร์ในระบบ

## สาเหตุ
1. **Demo Mode Users** - ผู้ใช้ demo มี UUID ที่ไม่มีอยู่ในฐานข้อมูลจริง
2. **Foreign Key Constraint** - `ride_requests.user_id` ต้องอ้างอิงไปยัง `users.id` ที่มีอยู่จริง
3. **RPC Function** - `get_all_orders_for_admin()` ทำ JOIN กับ `users` table ทำให้ไม่เห็นข้อมูล

## วิธีแก้ไข

### ขั้นตอนที่ 1: Seed Demo Users ในฐานข้อมูล

เปิด Supabase SQL Editor แล้วรันคำสั่งนี้:

```sql
-- ดูไฟล์: scripts/seed-demo-users.sql
```

หรือรัน migration:
```bash
npx supabase db push --local
```

### ขั้นตอนที่ 2: ตรวจสอบว่า Demo Users ถูกสร้างแล้ว

```sql
SELECT id, email, name, role FROM users 
WHERE email IN ('customer@demo.com', 'admin@demo.com', 'driver1@demo.com');
```

### ขั้นตอนที่ 3: ทดสอบ Cross-Role Integration

1. **Customer Side** (`/customer/ride`)
   - Login ด้วย `customer@demo.com` / `demo1234`
   - สร้าง Ride Request
   - ดู Console log: `[createRideRequest] ✓ Success!`

2. **Admin Side** (`/admin/orders`)
   - Login ด้วย `admin@demo.com` / `admin1234`
   - ดูรายการออเดอร์
   - ต้องเห็น Ride ที่ Customer สร้าง

3. **Provider Side** (`/provider/dashboard`)
   - Login ด้วย `driver1@demo.com` / `demo1234`
   - ดูงานที่รอรับ
   - ต้องเห็น Ride ที่ Customer สร้าง

## Demo Users ที่สร้าง

| Email | Password | Role | UUID |
|-------|----------|------|------|
| customer@demo.com | demo1234 | customer | 22222222-2222-2222-2222-222222222222 |
| admin@demo.com | admin1234 | admin | 11111111-1111-1111-1111-111111111111 |
| driver1@demo.com | demo1234 | driver | d1111111-1111-1111-1111-111111111111 |
| rider@demo.com | demo1234 | rider | 44444444-4444-4444-4444-444444444444 |

## Demo Providers ที่สร้าง

| Provider UID | Type | User Email | Status |
|--------------|------|------------|--------|
| PRV-DRV00001 | driver | driver1@demo.com | approved |
| PRV-RDR00001 | rider | rider@demo.com | approved |

## Files ที่เกี่ยวข้อง

- `supabase/migrations/133_seed_demo_users_for_cross_role.sql` - Migration สร้าง demo users
- `scripts/seed-demo-users.sql` - SQL script สำหรับรันใน SQL Editor
- `src/stores/ride.ts` - Ride store (เพิ่ม debug logging)
- `src/views/AdminOrdersView.vue` - Admin orders view

## Debugging

### Console Logs ที่ควรเห็น

**Customer สร้าง Ride:**
```
[createRideRequest] Starting... {userId: "22222222-...", pickup: "...", ...}
[createRideRequest] Insert payload: {...}
[createRideRequest] ✓ Success! Ride created: {id: "...", tracking_id: "RID-...", status: "pending"}
```

**Admin ดู Orders:**
```
[fetchAllOrders] Starting fetch...
[fetchAllOrders] RPC result: {data: 1, error: null}
[fetchAllOrders] RPC Success: 1 orders
```

### ถ้ายังไม่ทำงาน

1. ตรวจสอบว่า migration ถูก apply แล้ว
2. ตรวจสอบ RLS policies ใน Supabase Dashboard
3. ดู Console errors ใน Browser DevTools
4. ตรวจสอบ Network tab ว่า API calls สำเร็จหรือไม่
