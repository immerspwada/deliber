# ✅ Admin Customer Suspension Feature - Complete

**Date**: 2026-01-28  
**Status**: ✅ Production Ready  
**Priority**: 🔥 CRITICAL

---

## 🎯 Overview

ระบบระงับและยกเลิกการระงับบัญชีลูกค้าสำหรับ Admin พร้อมใช้งานแล้ว 100%

---

## 📊 Database Schema

### 1. ✅ Users Table - Suspension Columns

| Column              | Type        | Default  | Description                            |
| ------------------- | ----------- | -------- | -------------------------------------- |
| `status`            | TEXT        | 'active' | สถานะบัญชี (active, suspended, banned) |
| `suspension_reason` | TEXT        | NULL     | เหตุผลในการระงับ                       |
| `suspended_at`      | TIMESTAMPTZ | NULL     | เวลาที่ระงับ                           |
| `suspended_by`      | UUID        | NULL     | Admin ที่ระงับ (FK to users.id)        |

**CHECK Constraint:**

```sql
CHECK (status IN ('active', 'suspended', 'banned'))
```

### 2. ✅ Admin Audit Logs Table

```sql
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**

- `idx_admin_audit_logs_admin_id` - Query by admin
- `idx_admin_audit_logs_resource` - Query by resource
- `idx_admin_audit_logs_created_at` - Query by date

**RLS Policies:**

- `admin_view_audit_logs` - Admin can view all logs
- `admin_insert_audit_logs` - Admin can insert logs

---

## 🔧 RPC Functions

### 1. ✅ suspend_customer_account

```sql
CREATE OR REPLACE FUNCTION public.suspend_customer_account(
  p_customer_id UUID,
  p_reason TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
```

**Security:**

- ✅ Checks admin role (admin or super_admin)
- ✅ SECURITY DEFINER with search_path protection
- ✅ Only updates customers (role = 'customer')

**Actions:**

1. Verify admin role
2. Update user status to 'suspended'
3. Set suspension_reason
4. Set suspended_at to NOW()
5. Set suspended_by to auth.uid()
6. Update updated_at

### 2. ✅ unsuspend_customer_account

```sql
CREATE OR REPLACE FUNCTION public.unsuspend_customer_account(
  p_customer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
```

**Security:**

- ✅ Checks admin role (admin or super_admin)
- ✅ SECURITY DEFINER with search_path protection
- ✅ Only updates customers (role = 'customer')

**Actions:**

1. Verify admin role
2. Update user status to 'active'
3. Clear suspension_reason (NULL)
4. Clear suspended_at (NULL)
5. Clear suspended_by (NULL)
6. Update updated_at

---

## 🔒 RLS Policies

### Users Table

| Policy               | Command | Description                |
| -------------------- | ------- | -------------------------- |
| `users_admin_select` | SELECT  | Admin can view all users   |
| `users_admin_update` | UPDATE  | Admin can update all users |
| `users_select_own`   | SELECT  | Users can view own data    |
| `users_update_own`   | UPDATE  | Users can update own data  |

**Helper Function:**

```sql
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$;
```

---

## 🎨 UI Features

### CustomersView.vue

**Suspension Button:**

```vue
<button
  v-if="customer.status !== 'suspended'"
  class="btn btn-danger"
  @click="showSuspendModal(customer)"
>
  <svg>...</svg>
  ระงับการใช้งาน
</button>
```

**Unsuspension Button:**

```vue
<button
  v-if="customer.status === 'suspended'"
  class="btn btn-success"
  @click="unsuspendCustomer(customer.id)"
>
  <svg>...</svg>
  ยกเลิกการระงับ
</button>
```

**Visual Indicators:**

1. ✅ Status Badge - แสดง "ระงับการใช้งาน" สีแดง
2. ✅ Row Background - พื้นหลังสีแดงอ่อนสำหรับบัญชีที่ถูกระงับ
3. ✅ Avatar Color - สีแดงสำหรับบัญชีที่ถูกระงับ
4. ✅ Suspension Alert - กล่องแจ้งเตือนพร้อมเหตุผล

**Suspension Modal:**

```vue
<Modal v-model="showSuspensionModal">
  <h3>ระงับการใช้งานบัญชี</h3>
  <textarea 
    v-model="suspensionReason"
    placeholder="กรุณาระบุเหตุผล (อย่างน้อย 10 ตัวอักษร)"
    minlength="10"
    maxlength="500"
  />
  <button @click="confirmSuspension">ยืนยัน</button>
</Modal>
```

---

## 📝 Validation Rules

### Suspension (Zod Schema)

```typescript
export const CustomerSuspensionSchema = z.object({
  customerId: z.string().uuid("รหัสลูกค้าไม่ถูกต้อง"),
  reason: z
    .string()
    .min(10, "เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร")
    .max(500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร")
    .refine((val) => val.trim().length > 0, "กรุณาระบุเหตุผล"),
});
```

### Unsuspension (Zod Schema)

```typescript
export const CustomerUnsuspensionSchema = z.object({
  customerId: z.string().uuid("รหัสลูกค้าไม่ถูกต้อง"),
});
```

---

## 🔍 Audit Logging

### Suspension Log

```typescript
await logCustomerSuspension(customerId, reason);
```

**Logged Data:**

```json
{
  "admin_id": "05ea4b43-ccef-40dc-a998-810d19e8024f",
  "action": "suspend_customer",
  "resource_type": "customer",
  "resource_id": "customer-uuid",
  "details": {
    "reason": "ละเมิดเงื่อนไขการใช้งาน",
    "previous_status": "active"
  },
  "created_at": "2026-01-28T11:04:11.000Z"
}
```

### Unsuspension Log

```typescript
await logCustomerUnsuspension(customerId);
```

**Logged Data:**

```json
{
  "admin_id": "05ea4b43-ccef-40dc-a998-810d19e8024f",
  "action": "unsuspend_customer",
  "resource_type": "customer",
  "resource_id": "customer-uuid",
  "details": {
    "previous_status": "suspended",
    "suspension_reason": "ละเมิดเงื่อนไขการใช้งาน"
  },
  "created_at": "2026-01-28T11:05:30.000Z"
}
```

---

## 🧪 Testing Guide

### 1. ระงับบัญชีลูกค้า

**Steps:**

1. เข้าสู่ระบบด้วย admin account
2. ไปที่ **Admin > Customers**
3. เลือกลูกค้าที่ต้องการระงับ
4. กดปุ่ม **"ระงับการใช้งาน"** (สีแดง)
5. กรอกเหตุผล **อย่างน้อย 10 ตัวอักษร**
6. กดยืนยัน

**Expected Results:**

- ✅ Status เปลี่ยนเป็น "ระงับการใช้งาน" (สีแดง)
- ✅ แถวเปลี่ยนเป็นพื้นหลังสีแดงอ่อน
- ✅ Avatar เปลี่ยนเป็นสีแดง
- ✅ แสดงกล่องแจ้งเตือนพร้อมเหตุผล
- ✅ ปุ่มเปลี่ยนเป็น "ยกเลิกการระงับ" (สีเขียว)
- ✅ Toast แสดง "ระงับบัญชีสำเร็จ"

### 2. ยกเลิกการระงับ

**Steps:**

1. เลือกลูกค้าที่ถูกระงับ (สีแดง)
2. กดปุ่ม **"ยกเลิกการระงับ"** (สีเขียว)
3. ยืนยันการยกเลิก

**Expected Results:**

- ✅ Status เปลี่ยนเป็น "ใช้งานอยู่" (สีเขียว)
- ✅ แถวกลับเป็นพื้นหลังปกติ
- ✅ Avatar กลับเป็นสีปกติ
- ✅ กล่องแจ้งเตือนหายไป
- ✅ ปุ่มเปลี่ยนเป็น "ระงับการใช้งาน" (สีแดง)
- ✅ Toast แสดง "ยกเลิกการระงับบัญชีสำเร็จ"

### 3. Validation Tests

**Test Case 1: เหตุผลสั้นเกินไป**

- Input: "test" (4 ตัวอักษร)
- Expected: ❌ "เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร"

**Test Case 2: เหตุผลว่างเปล่า**

- Input: " " (spaces only)
- Expected: ❌ "กรุณาระบุเหตุผล"

**Test Case 3: เหตุผลยาวเกินไป**

- Input: 501 ตัวอักษร
- Expected: ❌ "เหตุผลต้องไม่เกิน 500 ตัวอักษร"

**Test Case 4: เหตุผลถูกต้อง**

- Input: "ละเมิดเงื่อนไขการใช้งาน" (10+ ตัวอักษร)
- Expected: ✅ ระงับสำเร็จ

---

## 🔐 Security Verification

### ✅ Checklist

- [x] RLS enabled on `users` table
- [x] RLS enabled on `admin_audit_logs` table
- [x] Admin role check in RPC functions
- [x] SECURITY DEFINER with search_path protection
- [x] Input validation with Zod
- [x] Audit logging for all actions
- [x] Only admin/super_admin can suspend
- [x] Only customers can be suspended (not admin/provider)
- [x] Permissions granted to authenticated role

### Database Verification

```sql
-- 1. Check users table has suspension columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');

-- 2. Check RPC functions exist
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('suspend_customer_account', 'unsuspend_customer_account');

-- 3. Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('users', 'admin_audit_logs');

-- 4. Check audit logs table
SELECT table_name FROM information_schema.tables
WHERE table_name = 'admin_audit_logs';
```

---

## 📊 Summary

| Component        | Status      | Notes                      |
| ---------------- | ----------- | -------------------------- |
| Database Schema  | ✅ Complete | 4 suspension columns added |
| Audit Logs Table | ✅ Complete | With indexes and RLS       |
| RPC Functions    | ✅ Complete | suspend + unsuspend        |
| RLS Policies     | ✅ Complete | Admin access verified      |
| UI Components    | ✅ Complete | Buttons, modal, indicators |
| Validation       | ✅ Complete | Zod schemas                |
| Audit Logging    | ✅ Complete | All actions logged         |
| Security         | ✅ Complete | All checks passed          |

---

## 🚀 Deployment Status

- ✅ Database schema updated
- ✅ RPC functions created
- ✅ RLS policies configured
- ✅ Audit logging implemented
- ✅ UI components ready
- ✅ Validation implemented
- ✅ PostgREST schema cache reloaded

**System is PRODUCTION READY** ✅

---

## 📝 Next Steps (Optional Enhancements)

1. **Email Notification** - แจ้งลูกค้าเมื่อบัญชีถูกระงับ
2. **Suspension History** - ประวัติการระงับทั้งหมด
3. **Auto-Unsuspend** - ยกเลิกการระงับอัตโนมัติหลังระยะเวลาที่กำหนด
4. **Suspension Reasons Dropdown** - เหตุผลที่เลือกได้จาก dropdown
5. **Bulk Suspension** - ระงับหลายบัญชีพร้อมกัน

---

**Last Updated**: 2026-01-28  
**Verified By**: Engineering Team  
**Status**: ✅ Production Ready
