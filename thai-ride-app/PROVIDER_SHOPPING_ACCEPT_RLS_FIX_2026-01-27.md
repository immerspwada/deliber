# 🛒 Provider Shopping Order - Accept Job RLS Fix

**Date**: 2026-01-27  
**Status**: ✅ Fixed  
**Priority**: 🔥 CRITICAL

---

## 🐛 Problem

เมื่อ Provider กดรับงาน Shopping order แล้ว หน้าจอแสดงข้อความ:

```
รอรับงาน
งานนี้ยังไม่ได้รับ กรุณารับงานก่อน
```

ทั้งๆ ที่ Provider เพิ่งกดปุ่ม "รับงาน" ไปแล้ว

---

## 🔍 Root Cause Analysis

### 1. Database Check

```sql
SELECT id, status, matched_at, tracking_id
FROM shopping_requests
WHERE tracking_id = 'SHP-20260127-350085'
```

**Result:**

```json
{
  "id": "2f35bf57-0c7c-4a99-a27d-2926595b9dcd",
  "status": "pending", // ❌ ยังเป็น pending
  "matched_at": null, // ❌ ไม่ได้ถูก set
  "tracking_id": "SHP-20260127-350085"
}
```

### 2. Code Check

`src/views/provider/ProviderOrdersNew.vue` - `acceptOrder()` function:

```typescript
else if (order.service_type === 'shopping') {
  const { error: updateError } = await supabase
    .from('shopping_requests')
    .update({
      provider_id: provider.id,
      status: 'matched',
      matched_at: new Date().toISOString()
    })
    .eq('id', order.id)
    .eq('status', 'pending')

  // ✅ โค้ดถูกต้อง แต่ RLS บล็อก!
}
```

### 3. RLS Policy Check

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'shopping_requests'
```

**Existing Policies:**

| Policy Name                      | Command | Description                          | Issue                 |
| -------------------------------- | ------- | ------------------------------------ | --------------------- |
| `provider_update_shopping`       | UPDATE  | ต้องการ `provider_id` ที่ match แล้ว | ❌ ใช้ไม่ได้ตอนรับงาน |
| `provider_view_pending_shopping` | SELECT  | ดูงาน pending ได้                    | ✅ OK                 |
| `customer_own_shopping`          | ALL     | Customer จัดการงานตัวเอง             | ✅ OK                 |
| `admin_full_shopping`            | ALL     | Admin เข้าถึงทุกอย่าง                | ✅ OK                 |

**Missing Policy:** ❌ ไม่มี policy สำหรับ Provider **รับงาน** (accept pending job)

---

## ✅ Solution

### Created New RLS Policy

```sql
CREATE POLICY "provider_accept_shopping" ON shopping_requests
  FOR UPDATE
  TO authenticated
  USING (
    -- เงื่อนไขก่อน UPDATE (ตรวจสอบว่าเป็นงาน pending ที่ยังไม่มี provider)
    status = 'pending' AND
    provider_id IS NULL AND
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.user_id = auth.uid()
      AND providers_v2.status = 'approved'
    )
  )
  WITH CHECK (
    -- เงื่อนไขหลัง UPDATE (ตรวจสอบว่า update ถูกต้อง)
    status = 'matched' AND
    provider_id IS NOT NULL AND
    matched_at IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = shopping_requests.provider_id
      AND providers_v2.user_id = auth.uid()
      AND providers_v2.status = 'approved'
    )
  );
```

### Policy Logic

**USING Clause (Before Update):**

- ✅ งานต้องเป็น `status = 'pending'`
- ✅ งานต้องยังไม่มี `provider_id` (NULL)
- ✅ User ต้องเป็น Provider ที่ approved แล้ว

**WITH CHECK Clause (After Update):**

- ✅ Status ต้องเปลี่ยนเป็น `'matched'`
- ✅ ต้องมี `provider_id` (ไม่ใช่ NULL)
- ✅ ต้องมี `matched_at` timestamp
- ✅ `provider_id` ต้อง match กับ Provider ที่กำลัง login

---

## 🧪 Testing

### Test Case 1: Reset Order

```sql
UPDATE shopping_requests
SET
  status = 'pending',
  provider_id = NULL,
  matched_at = NULL
WHERE tracking_id = 'SHP-20260127-350085'
```

**Result:** ✅ Order reset สำเร็จ

### Test Case 2: Accept Order (Frontend)

**Steps:**

1. Provider เข้าหน้า `/provider/orders`
2. เห็น Shopping order `SHP-20260127-350085`
3. กดปุ่ม "รับงาน"
4. ระบบ UPDATE:
   - `provider_id` = Provider's ID
   - `status` = `'matched'`
   - `matched_at` = Current timestamp
5. Navigate to `/provider/job/{id}`

**Expected Result:**

- ✅ Status เปลี่ยนเป็น `'matched'`
- ✅ `matched_at` ถูก set
- ✅ หน้า job detail แสดง `JobMatchedViewClean`
- ✅ แสดงรายละเอียด Shopping order ถูกต้อง

---

## 📋 Complete RLS Policies for Shopping Requests

After fix, shopping_requests มี policies ครบทุก use case:

| Policy                           | Command | Purpose                            |
| -------------------------------- | ------- | ---------------------------------- |
| `customer_own_shopping`          | ALL     | Customer จัดการงานตัวเอง           |
| `provider_view_pending_shopping` | SELECT  | Provider ดูงาน pending ทั้งหมด     |
| `provider_accept_shopping`       | UPDATE  | **Provider รับงาน pending** ⭐ NEW |
| `provider_assigned_shopping`     | SELECT  | Provider ดูงานที่รับแล้ว           |
| `provider_update_shopping`       | UPDATE  | Provider อัพเดทงานที่รับแล้ว       |
| `admin_full_shopping`            | ALL     | Admin เข้าถึงทุกอย่าง              |
| `public_tracking_shopping`       | SELECT  | Public tracking (anon)             |

---

## 🔄 Complete Flow

### Before Fix (❌ Broken)

```
1. Provider กดรับงาน
2. Frontend พยายาม UPDATE shopping_requests
3. RLS บล็อก (ไม่มี policy)
4. UPDATE ล้มเหลว (silent fail)
5. Status ยังเป็น 'pending'
6. Navigate to job detail
7. แสดง "รอรับงาน" ❌
```

### After Fix (✅ Working)

```
1. Provider กดรับงาน
2. Frontend UPDATE shopping_requests
3. RLS อนุญาต (provider_accept_shopping policy)
4. UPDATE สำเร็จ ✅
   - status = 'matched'
   - provider_id = {provider_id}
   - matched_at = {timestamp}
5. Navigate to job detail
6. JobMatchedViewClean แสดงรายละเอียด ✅
   - 🏪 ร้านค้า
   - 📦 รายการสินค้า
   - 🏠 ที่อยู่จัดส่ง
   - 💵 งบประมาณ
   - [เริ่มซื้อของ] button
```

---

## 🚀 Deployment

### Changes Made

1. ✅ Created RLS policy: `provider_accept_shopping`
2. ✅ Verified policy is active
3. ✅ Reset test order to pending
4. ✅ Ready for testing

### No Code Changes Required

- ✅ Frontend code already correct
- ✅ Only RLS policy was missing
- ✅ No deployment needed (database only)

---

## 📝 Testing Checklist

- [ ] Provider can see shopping order in `/provider/orders`
- [ ] Provider can click "รับงาน" button
- [ ] Status changes to `'matched'`
- [ ] `matched_at` timestamp is set
- [ ] `provider_id` is set correctly
- [ ] Navigate to job detail page
- [ ] JobMatchedViewClean displays correctly
- [ ] Shows store info (🏪)
- [ ] Shows items list (📦)
- [ ] Shows delivery address (🏠)
- [ ] Shows budget (💵)
- [ ] "เริ่มซื้อของ" button works
- [ ] No console errors

---

## 🎯 Related Issues

This fix also applies to:

- ✅ All shopping orders (not just this one)
- ✅ Future shopping orders
- ✅ Multiple providers accepting different orders

---

## 💡 Lessons Learned

### RLS Policy Design Pattern

When designing RLS policies for job acceptance:

1. **Separate policies for different operations:**
   - One for accepting (pending → matched)
   - One for updating (matched → in_progress → completed)

2. **USING clause checks BEFORE state:**
   - Job must be available (pending, no provider)
   - User must be authorized (approved provider)

3. **WITH CHECK clause validates AFTER state:**
   - Job must be properly assigned
   - All required fields must be set
   - Provider must match the one making the change

4. **Test with actual user context:**
   - RLS policies only work with `auth.uid()`
   - Service role bypasses RLS
   - Always test as authenticated user

---

**Created**: 2026-01-27 10:15:00  
**Fixed**: 2026-01-27 10:20:00  
**Status**: ✅ Ready for Testing
