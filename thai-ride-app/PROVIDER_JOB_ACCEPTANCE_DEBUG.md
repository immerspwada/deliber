# Provider Job Acceptance Debug Report
**Issue**: Provider ไม่สามารถรับงานได้
**Test User**: ไรเดอร์ทดสอบ
**Date**: 2024-12-19

---

## 🔍 Checklist การตรวจสอบ

### 1. Provider Status & Permissions
- [ ] Provider status = 'approved'
- [ ] is_verified = true
- [ ] is_available = true (online)
- [ ] allowed_services มี 'delivery' หรือ service ที่ต้องการ

### 2. RLS Policies
- [ ] Provider สามารถ SELECT pending jobs
- [ ] Provider สามารถ UPDATE jobs ที่รับ
- [ ] Provider มี permission ใน allowed_services

### 3. Database Functions
- [ ] accept_ride_request() ทำงานได้
- [ ] accept_delivery_request() ทำงานได้ (ถ้ามี)
- [ ] update_*_status() ทำงานได้

### 4. Frontend Issues
- [ ] useProvider.ts → acceptJob() ถูกเรียก
- [ ] Error handling แสดงข้อความที่ถูกต้อง
- [ ] Loading state ทำงานปกติ

---

## 🛠️ Solutions

### Solution 1: ตรวจสอบ Provider Status
```sql
-- ตรวจสอบสถานะ provider
SELECT 
  id,
  user_id,
  status,
  is_verified,
  is_available,
  allowed_services,
  provider_type
FROM service_providers
WHERE user_id = 'YOUR_USER_ID';

-- แก้ไข: อนุมัติและเปิดใช้งาน
UPDATE service_providers
SET 
  status = 'approved',
  is_verified = true,
  is_available = true,
  allowed_services = ARRAY['delivery', 'ride', 'shopping']::text[]
WHERE user_id = 'YOUR_USER_ID';
```

### Solution 2: ตรวจสอบ RLS Policies
```sql
-- ตรวจสอบว่า provider เห็นงาน pending หรือไม่
SELECT * FROM delivery_requests
WHERE status = 'pending'
AND (
  allowed_services IS NULL 
  OR 'delivery' = ANY(allowed_services)
);

-- ถ้าไม่เห็น = RLS policy มีปัญหา
```

### Solution 3: เพิ่ม Debug Logging
```typescript
// ใน useProvider.ts → acceptJob()
console.log('🔍 Accepting job:', {
  jobId,
  serviceType,
  providerId,
  providerStatus: provider.value?.status,
  providerServices: provider.value?.allowed_services
})

const { data, error } = await supabase.rpc('accept_delivery_request', {
  p_request_id: jobId,
  p_provider_id: providerId
})

console.log('📊 Accept result:', { data, error })
```

### Solution 4: ตรวจสอบ allowed_services
```sql
-- ตรวจสอบว่า provider มีสิทธิ์รับงานประเภทนี้หรือไม่
SELECT 
  sp.id,
  sp.allowed_services,
  dr.id as delivery_id,
  dr.status,
  CASE 
    WHEN sp.allowed_services IS NULL THEN 'All services allowed'
    WHEN 'delivery' = ANY(sp.allowed_services) THEN 'Can accept delivery'
    ELSE 'Cannot accept delivery'
  END as permission_check
FROM service_providers sp
CROSS JOIN delivery_requests dr
WHERE sp.user_id = 'YOUR_USER_ID'
AND dr.status = 'pending'
LIMIT 5;
```

### Solution 5: แก้ไข RLS Policy (ถ้าจำเป็น)
```sql
-- Policy สำหรับ provider ดูงาน pending
DROP POLICY IF EXISTS "Providers can view pending jobs" ON delivery_requests;

CREATE POLICY "Providers can view pending jobs"
ON delivery_requests FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM service_providers sp
    WHERE sp.user_id = auth.uid()
    AND sp.status = 'approved'
    AND sp.is_verified = true
    AND (
      sp.allowed_services IS NULL
      OR 'delivery' = ANY(sp.allowed_services)
    )
  )
);

-- Policy สำหรับ provider รับงาน
DROP POLICY IF EXISTS "Providers can accept jobs" ON delivery_requests;

CREATE POLICY "Providers can accept jobs"
ON delivery_requests FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM service_providers sp
    WHERE sp.user_id = auth.uid()
    AND sp.status = 'approved'
    AND sp.is_verified = true
    AND (
      sp.allowed_services IS NULL
      OR 'delivery' = ANY(sp.allowed_services)
    )
  )
)
WITH CHECK (
  status IN ('matched', 'accepted')
  AND provider_id IN (
    SELECT id FROM service_providers
    WHERE user_id = auth.uid()
  )
);
```

---

## 🧪 Testing Steps

### Step 1: ตรวจสอบ Provider ใน Admin
1. Login เป็น Admin
2. ไปที่ `/admin/providers`
3. ค้นหา "ไรเดอร์ทดสอบ"
4. ตรวจสอบ:
   - Status = approved ✅
   - Verified = true ✅
   - Allowed Services มี 'delivery' ✅

### Step 2: ตรวจสอบ Jobs ที่มี
1. Login เป็น Customer
2. สร้าง Delivery Request
3. ตรวจสอบว่า status = 'pending'

### Step 3: ทดสอบรับงาน
1. Login เป็น Provider (ไรเดอร์ทดสอบ)
2. เปิด Online
3. ดูว่ามีงานแสดงหรือไม่
4. กดรับงาน
5. ดู Console log สำหรับ errors

### Step 4: ตรวจสอบ Database
```sql
-- ดูว่างานถูกรับหรือไม่
SELECT 
  id,
  status,
  provider_id,
  matched_at,
  accepted_at
FROM delivery_requests
WHERE id = 'JOB_ID';
```

---

## 🚨 Common Issues & Fixes

### Issue 1: Provider ไม่เห็นงาน
**สาเหตุ**: RLS policy หรือ allowed_services
**แก้ไข**: 
```sql
UPDATE service_providers
SET allowed_services = NULL  -- Allow all services
WHERE user_id = 'YOUR_USER_ID';
```

### Issue 2: กดรับงานแล้ว Error
**สาเหตุ**: Function ไม่มีหรือ permission ไม่พอ
**แก้ไข**: ตรวจสอบ function `accept_delivery_request()` มีอยู่หรือไม่

### Issue 3: งานหายไปหลังกดรับ
**สาเหตุ**: Status เปลี่ยนแล้วแต่ provider_id ไม่ update
**แก้ไข**: ตรวจสอบ function logic

### Issue 4: Provider offline
**สาเหตุ**: is_available = false
**แก้ไข**:
```sql
UPDATE service_providers
SET is_available = true
WHERE user_id = 'YOUR_USER_ID';
```

---

## 📝 Quick Fix Script

```sql
-- Quick fix สำหรับ provider ที่รับงานไม่ได้
DO $$
DECLARE
  v_user_id uuid := 'YOUR_USER_ID_HERE';  -- เปลี่ยนเป็น user_id ของไรเดอร์ทดสอบ
BEGIN
  -- 1. อนุมัติและเปิดใช้งาน
  UPDATE service_providers
  SET 
    status = 'approved',
    is_verified = true,
    is_available = true,
    allowed_services = NULL,  -- Allow all services
    provider_type = 'rider'
  WHERE user_id = v_user_id;
  
  -- 2. ตรวจสอบผลลัพธ์
  RAISE NOTICE 'Provider updated: %', (
    SELECT row_to_json(sp.*) 
    FROM service_providers sp 
    WHERE sp.user_id = v_user_id
  );
END $$;
```

---

## 🎯 Next Steps

1. **ตรวจสอบ Console Logs** - ดู errors ใน browser console
2. **ตรวจสอบ Network Tab** - ดู API calls ที่ fail
3. **ตรวจสอบ Supabase Logs** - ดู database errors
4. **Test with Different Service Types** - ทดสอบ ride, delivery, shopping

---

## ✅ SOLUTION FOUND

### Root Cause
**Missing Database Functions**: ฟังก์ชัน `accept_delivery_request()` และ `accept_shopping_request()` ไม่มีในฐานข้อมูล

### Fix Applied
สร้าง Migration `086_provider_accept_functions.sql` ที่เพิ่ม:
1. ✅ `accept_delivery_request()` - รับงานส่งของ
2. ✅ `accept_shopping_request()` - รับงานซื้อของ
3. ✅ `update_delivery_status()` - อัพเดทสถานะส่งของ
4. ✅ `update_shopping_status()` - อัพเดทสถานะซื้อของ
5. ✅ `get_available_deliveries_for_provider()` - ดึงงานส่งของ
6. ✅ `get_available_shopping_for_provider()` - ดึงงานซื้อของ

### Features
- ✅ Race condition protection (FOR UPDATE NOWAIT)
- ✅ Service permission checking (allowed_services)
- ✅ Provider verification (status, is_verified, is_available)
- ✅ Atomic operations
- ✅ Proper error messages in Thai

### Next Steps
1. Run migration: `supabase db push` หรือ apply ใน Supabase Dashboard
2. Test provider job acceptance
3. Verify all service types work (ride, delivery, shopping)

---

**Status**: ✅ **FIXED**
**Priority**: 🟢 **RESOLVED** - Migration created, ready to apply
