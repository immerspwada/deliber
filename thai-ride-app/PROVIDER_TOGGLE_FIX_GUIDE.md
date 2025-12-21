# Provider Toggle Online Fix Guide

## ปัญหาที่พบ
Provider ไม่สามารถกดเปิดรับงานได้ เนื่องจาก:
1. Function `set_provider_availability` ตรวจสอบ `is_verified = true` แต่ Provider ใหม่มี `status = 'pending'`
2. Column names ใน SQL functions ไม่ตรงกับ schema จริง (`u.name` vs `u.first_name`)

## วิธีแก้ไข

### Step 1: Run Migration SQL
รัน SQL script ใน Supabase SQL Editor:

```bash
# ไฟล์ที่ต้องรัน
thai-ride-app/scripts/run-provider-toggle-fix.sql
```

หรือรัน migrations แยก:
- `140_fix_provider_job_functions.sql`
- `141_fix_provider_toggle_online.sql`

### Step 2: Approve Provider (สำหรับ Testing)
รัน SQL เพื่ออนุมัติ Provider:

```sql
-- อนุมัติ Provider ทั้งหมดที่ pending
UPDATE service_providers
SET status = 'approved', is_verified = true, updated_at = NOW()
WHERE status = 'pending';
```

หรือใช้ไฟล์:
```bash
thai-ride-app/scripts/approve-provider-for-testing.sql
```

### Step 3: ทดสอบ
1. Login เป็น Provider
2. ไปที่ `/provider/dashboard`
3. กดปุ่ม "เปิดรับงาน"
4. ควรเปลี่ยนสถานะเป็น Online ได้

## การเปลี่ยนแปลงที่ทำ

### 1. SQL Functions (Migration 140 & 141)

#### `set_provider_availability` (Fixed)
- เปลี่ยนจากตรวจสอบ `is_verified` เป็นตรวจสอบ `status IN ('approved', 'active') OR is_verified`

#### `toggle_provider_online` (New)
- Function ใหม่ที่ใช้ `user_id` แทน `provider_id`
- ง่ายต่อการเรียกใช้จาก Frontend

#### `get_available_rides_for_provider` (Fixed)
- แก้ไข column names: `u.first_name`, `u.last_name`, `u.phone_number`

### 2. Frontend Composable (`useProviderDashboard.ts`)

#### `toggleOnline` function
- เพิ่ม fallback methods 3 ระดับ:
  1. `toggle_provider_online` (by user_id)
  2. `set_provider_availability` (by provider_id)
  3. Direct table update (last resort)
- เพิ่มการตรวจสอบ provider status ก่อน toggle

### 3. RLS Policies
- เพิ่ม policy ให้ Provider update `is_available` ของตัวเองได้
- เพิ่ม policy ให้ Provider อ่าน pending rides ได้

## Provider Status Flow

```
สมัครเป็น Provider
        ↓
    [pending] ← รอ Admin อนุมัติ
        ↓
   Admin ตรวจสอบ
        ↓
  ┌─────┴─────┐
  ↓           ↓
[approved] [rejected]
  ↓
[active] ← สามารถเปิดรับงานได้
  ↓
[suspended] ← Admin ระงับ
```

## Checklist

- [ ] รัน `run-provider-toggle-fix.sql` ใน Supabase
- [ ] อนุมัติ Provider ที่ต้องการทดสอบ
- [ ] ทดสอบ toggle online
- [ ] ทดสอบรับงานจริง

## Troubleshooting

### Error: "บัญชียังไม่ได้รับการอนุมัติ"
- ตรวจสอบ `status` ของ Provider ใน `service_providers` table
- ต้องเป็น `approved` หรือ `active`

### Error: "ไม่พบข้อมูลผู้ให้บริการ"
- ตรวจสอบว่า User มี record ใน `service_providers` table
- ถ้าไม่มี ต้องสมัครเป็น Provider ก่อน

### Toggle ไม่ทำงาน
1. ตรวจสอบ Console log ใน Browser
2. ตรวจสอบ Network tab ว่า RPC call สำเร็จหรือไม่
3. ตรวจสอบ RLS policies

## Files Changed

| File | Description |
|------|-------------|
| `src/composables/useProviderDashboard.ts` | เพิ่ม fallback methods สำหรับ toggle + แก้ไข ride acceptance |
| `supabase/migrations/140_fix_provider_job_functions.sql` | แก้ไข column names |
| `supabase/migrations/141_fix_provider_toggle_online.sql` | แก้ไข toggle function |
| `scripts/run-provider-toggle-fix.sql` | Combined script |
| `scripts/approve-provider-for-testing.sql` | Script อนุมัติ Provider |
| `scripts/fix-ride-acceptance.sql` | Script แก้ไข RLS policies สำหรับรับงาน |

---

## Fix: Ride Acceptance Error (accept_ride_atomic not found)

### ปัญหา
เมื่อ Provider กดรับงาน (เช่น RID-MJFGX88P) จะเกิด error:
```
Could not find the function public.accept_ride_atomic(p_provider_id, p_ride_id) in the schema cache
```

### สาเหตุ
Function `accept_ride_atomic` ยังไม่ได้ถูกสร้างใน Database

### วิธีแก้ไข

#### Option 1: ใช้ Direct Update (แนะนำ - ไม่ต้องรัน SQL)
Code ใน `useProviderDashboard.ts` ถูกแก้ไขให้ใช้ direct table update แทน RPC function สำหรับ rides แล้ว

#### Option 2: รัน SQL เพื่อสร้าง RLS Policies
```bash
# รันใน Supabase SQL Editor
thai-ride-app/scripts/fix-ride-acceptance.sql
```

### การเปลี่ยนแปลงใน Code

`acceptRequest` function ใน `useProviderDashboard.ts`:
- สำหรับ `type === 'ride'`: ใช้ direct table update แทน RPC
  1. ตรวจสอบว่า ride ยัง pending อยู่
  2. Update ride_requests: status='matched', provider_id=...
  3. Update service_providers: is_available=false
  4. Fetch ride details พร้อม customer info
- สำหรับ service types อื่น: ยังใช้ RPC functions เดิม

### ทดสอบ
1. Login เป็น Provider (ต้อง approved)
2. เปิดรับงาน (toggle online)
3. รอให้มี ride request ปรากฏ
4. กดรับงาน - ควรสำเร็จโดยไม่มี error

