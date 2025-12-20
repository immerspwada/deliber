# Admin Provider Testing Guide

## การทดสอบว่า customer@demo.com ปรากฏใน Admin Dashboard

### Pre-requisites
- ✅ customer@demo.com ได้สมัครเป็น provider แล้ว (ผ่านหน้า /become-provider)
- ✅ Migration 100 ถูก apply แล้ว
- ✅ Dev server กำลังรัน (`npm run dev`)

---

## Test Case 1: ตรวจสอบข้อมูลใน Database

### วิธีทดสอบ
```bash
# เข้า Supabase Studio
open http://localhost:54323

# หรือใช้ SQL Editor
```

### SQL Queries
```sql
-- 1. ตรวจสอบว่า customer@demo.com มี user record
SELECT id, email, first_name, last_name, role
FROM users
WHERE email = 'customer@demo.com';

-- 2. ตรวจสอบว่ามี provider record
SELECT sp.*, u.email
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE u.email = 'customer@demo.com';

-- 3. ทดสอบ RPC function
SELECT * FROM get_all_providers_for_admin(
  p_status := 'pending',
  p_provider_type := NULL,
  p_limit := 50,
  p_offset := 0
);
```

### Expected Results
- ✅ พบ user record ของ customer@demo.com
- ✅ พบ provider record ที่ link กับ user นี้
- ✅ status = 'pending'
- ✅ is_verified = false
- ✅ RPC function return ข้อมูล provider พร้อม user data

---

## Test Case 2: ทดสอบ Admin Dashboard UI

### Step 1: Login เป็น Admin
1. เปิด browser ไปที่ `http://localhost:5173/admin/login`
2. Login ด้วย:
   - Email: `admin@demo.com`
   - Password: `admin1234`
3. ควรเข้าสู่ Admin Dashboard

### Step 2: ไปที่หน้า Providers
1. คลิกเมนู "ผู้ให้บริการ" หรือไปที่ `/admin/providers`
2. ดูที่ Stats Cards ด้านบน
   - "รอตรวจสอบ" ควรมีจำนวน > 0

### Step 3: ตรวจสอบรายการ Providers
1. ดูในรายการ providers
2. ค้นหา customer@demo.com
3. ตรวจสอบว่า:
   - ✅ เห็นชื่อหรืออีเมล customer@demo.com
   - ✅ Status badge แสดง "รอตรวจสอบ" (สีเหลือง)
   - ✅ มีปุ่ม "ดูรายละเอียด", "อนุมัติ", "ปฏิเสธ"

### Step 4: ทดสอบ Filter
1. เลือก Status Filter = "รอตรวจสอบ"
2. ควรเห็น customer@demo.com ในรายการ
3. เลือก Type Filter ตามที่ customer สมัคร (เช่น "คนขับ")
4. ควรยังเห็น customer@demo.com

### Step 5: ดูรายละเอียด
1. คลิกปุ่ม "ดูรายละเอียด" (ไอคอนตา)
2. Modal ควรเปิดขึ้นมา
3. ตรวจสอบข้อมูล:
   - ✅ ชื่อ-นามสกุล หรืออีเมล
   - ✅ ประเภทผู้ให้บริการ
   - ✅ ข้อมูลยานพาหนะ (ถ้ามี)
   - ✅ เอกสาร (ถ้ามี)

---

## Test Case 3: ทดสอบ Console Logs

### วิธีทดสอบ
1. เปิด Browser DevTools (F12)
2. ไปที่ Console tab
3. Refresh หน้า `/admin/providers`

### Expected Logs
```
[AdminProvidersView] Loading providers with filters: { type: '', status: '' }
[AdminProvidersView] Supabase session: Active
[fetchProviders] Starting fetch with filter: { type: '', status: '' }
[fetchProviders] RPC Success: X providers
[fetchProviders] Transformed data: { count: X, total: X, firstItem: {...} }
[AdminProvidersView] Received providers: { count: X, total: X, providers: [...] }
```

### ถ้าเจอ Error
```
❌ [fetchProviders] RPC failed, trying direct query...
❌ [fetchProviders] Supabase Error: ...
```
→ ดูที่ error message และแก้ไขตาม

---

## Test Case 4: ทดสอบการอนุมัติ Provider

### Step 1: อนุมัติ Provider
1. ที่หน้า `/admin/providers`
2. หา customer@demo.com
3. คลิกปุ่ม "อนุมัติทันที" (ไอคอน checkmark สีเขียว)
4. Confirm การอนุมัติ

### Expected Results
- ✅ Provider status เปลี่ยนเป็น "อนุมัติแล้ว"
- ✅ Status badge เปลี่ยนเป็นสีเขียว
- ✅ ย้ายจาก "รอตรวจสอบ" ไปที่ "อนุมัติแล้ว"
- ✅ customer@demo.com ได้รับ notification

### Step 2: ตรวจสอบใน Database
```sql
SELECT status, is_verified, documents
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE u.email = 'customer@demo.com';
```

Expected:
- status = 'approved'
- is_verified = true
- documents.id_card = 'verified'
- documents.license = 'verified'
- documents.vehicle = 'verified'

---

## Test Case 5: ทดสอบ Provider Dashboard

### Step 1: Logout จาก Admin
1. Logout จาก admin account

### Step 2: Login เป็น customer@demo.com
1. Login ด้วย customer@demo.com
2. ไปที่ `/provider` หรือ `/provider/dashboard`

### Expected Results
- ✅ เห็นหน้า Provider Dashboard
- ✅ สามารถเปิด/ปิดสถานะ Online ได้
- ✅ เห็นงานที่มี (ถ้ามี)

---

## Troubleshooting

### ปัญหา: ไม่เห็น customer@demo.com ใน Admin

#### Solution 1: ตรวจสอบ Database
```sql
-- มี provider record หรือไม่?
SELECT COUNT(*) FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE u.email = 'customer@demo.com';
```

ถ้า = 0 → customer ยังไม่ได้สมัคร ให้สมัครใหม่ที่ `/become-provider`

#### Solution 2: ตรวจสอบ RLS Policies
```sql
-- ตรวจสอบ policies
SELECT * FROM pg_policies 
WHERE tablename = 'service_providers';
```

ควรมี policy ที่อนุญาตให้ admin query ได้

#### Solution 3: ตรวจสอบ RPC Function
```sql
-- ทดสอบ function
SELECT * FROM get_all_providers_for_admin(NULL, NULL, 10, 0);
```

ถ้า error → function ไม่ถูกสร้าง ให้รัน migration 100 ใหม่

#### Solution 4: Clear Cache
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

# Restart dev server
npm run dev
```

---

## Success Criteria

### ✅ ทุก Test Case ผ่าน
- [x] Database มีข้อมูล provider ของ customer@demo.com
- [x] RPC function ทำงานได้
- [x] Admin เห็น provider ในรายการ
- [x] Filter ทำงานได้
- [x] ดูรายละเอียดได้
- [x] อนุมัติได้
- [x] Provider สามารถเข้า dashboard ได้

### ✅ Cross-Role Integration
- [x] Customer สมัครเป็น provider ได้
- [x] Admin เห็นและอนุมัติได้
- [x] Provider เข้าใช้งานได้หลังอนุมัติ
- [x] Notification ส่งถึงทุกฝ่าย

---

## Performance Benchmarks

### Query Performance
- RPC function: < 100ms
- Direct query with join: < 200ms
- Fallback query: < 300ms

### UI Performance
- Page load: < 1s
- Filter change: < 500ms
- Modal open: < 200ms

---

## Next Steps After Testing

### 1. ถ้าทุกอย่างทำงาน
- ✅ Deploy to staging
- ✅ Test with real data
- ✅ Monitor performance

### 2. ถ้ามีปัญหา
- 📝 Document the issue
- 🔍 Check logs and errors
- 🛠️ Apply fixes
- 🔄 Re-test

### 3. Improvements
- Add real-time updates
- Add bulk approval
- Add notification to admin when new provider registers
- Add provider verification workflow
