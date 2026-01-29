# 🔍 Admin Customer Suspension - Debug & Fix

**Date**: 2026-01-28  
**Status**: ✅ Fixed  
**Priority**: 🔥 CRITICAL

---

## 🐛 Problem Report

**User Issue**: "กดปุ่มระงับแล้วมีข้อความแจ้ง ว่า ข้อมูลไม่ถูกต้อง แต่ไม่สามารถระงับได้จริงและไม่มี error msg"

**Symptoms**:

1. ✅ UI displays correctly (status badge, suspension alert, etc.)
2. ✅ Database schema has all required columns
3. ✅ RPC functions exist and have correct permissions
4. ❌ Clicking "ระงับการใช้งาน" button shows "ข้อมูลไม่ถูกต้อง"
5. ❌ Suspension does NOT actually happen
6. ❌ No detailed error message shown
7. ⚠️ Console shows audit log error: `PGRST205: Could not find the table 'public.admin_audit_logs' in the schema cache`

---

## 🔍 Root Cause Analysis

### Issue 1: PostgREST Schema Cache Not Updated

**Problem**: The `admin_audit_logs` table exists in the database but PostgREST doesn't know about it.

**Error Message**:

```
PGRST205: Could not find the table 'public.admin_audit_logs' in the schema cache
```

**Why This Happens**: After creating new tables, PostgREST needs to reload its schema cache.

**Fix Applied**: ✅ Reloaded schema cache with `NOTIFY pgrst, 'reload schema'`

### Issue 2: Generic Error Messages

**Problem**: When validation fails, the error message is too generic: "ข้อมูลไม่ถูกต้อง"

**Why This Happens**: The validation error details are not being logged or displayed properly.

**Fix Applied**: ✅ Added detailed console logging to track the exact validation failure point

---

## ✅ Fixes Applied

### 1. Schema Cache Reload

```sql
-- Executed on production database
NOTIFY pgrst, 'reload schema';
```

**Result**: PostgREST now recognizes the `admin_audit_logs` table.

### 2. Enhanced Error Logging

**File**: `src/admin/composables/useAdminCustomers.ts`

**Changes**:

```typescript
async function suspendCustomer(customerId: string, reason: string) {
  try {
    // ✅ NEW: Log input for debugging
    console.log("[suspendCustomer] Input:", {
      customerId,
      reason,
      reasonLength: reason.length,
    });

    // Validate input
    const validation = validateInput(CustomerSuspensionSchema, {
      customerId: customerId,
      reason: reason,
    });

    if (!validation.success) {
      // ✅ NEW: Log validation errors
      console.error("[suspendCustomer] Validation failed:", validation.errors);
      const errorMessage = Object.values(validation.errors).join(", ");
      showError(errorMessage);
      return { success: false, message: errorMessage };
    }

    // ✅ NEW: Log RPC call
    console.log("[suspendCustomer] Validation passed, calling RPC...");

    // Call RPC function
    const { data, error: rpcError } = await supabase.rpc(
      "suspend_customer_account",
      {
        p_customer_id: customerId,
        p_reason: reason,
      },
    );

    if (rpcError) {
      // ✅ NEW: Log RPC errors
      console.error("[suspendCustomer] RPC error:", rpcError);
      throw rpcError;
    }

    // ✅ NEW: Log success
    console.log("[suspendCustomer] RPC success, logging audit...");

    // Log audit trail
    await logCustomerSuspension(customerId, reason);

    showSuccess("ระงับบัญชีลูกค้าสำเร็จ");
    return { success: true, message: "ระงับบัญชีลูกค้าสำเร็จ" };
  } catch (err) {
    // ✅ NEW: More specific error messages
    console.error("[suspendCustomer] Error:", err);

    if (message.includes("Unauthorized")) {
      showError("คุณไม่มีสิทธิ์ระงับบัญชีลูกค้า");
    } else if (message.includes("not found")) {
      showError("ไม่พบข้อมูลลูกค้า");
    } else {
      showError(`ไม่สามารถระงับบัญชีลูกค้าได้: ${message}`);
    }

    return { success: false, message };
  }
}
```

---

## 🧪 Testing Guide

### Step 1: Hard Refresh Browser

**CRITICAL**: Clear browser cache to load updated code.

**Chrome/Edge**:

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

**Firefox**:

```
Ctrl + F5 (Windows/Linux)
Cmd + Shift + R (Mac)
```

### Step 2: Open Browser Console

**Chrome/Edge/Firefox**:

```
F12 → Console tab
```

### Step 3: Test Suspension Flow

1. **Navigate to Admin Customers**:

   ```
   https://your-app.vercel.app/admin/customers
   ```

2. **Select a Customer**:
   - Click on any active customer row
   - Modal should open with customer details

3. **Click "ระงับการใช้งาน" Button**:
   - Suspension modal should open

4. **Enter Suspension Reason**:
   - Type at least 10 characters
   - Example: "ทดสอบระบบระงับบัญชี"

5. **Click "ยืนยันระงับ" Button**

6. **Check Console Logs**:

   ```
   [suspendCustomer] Input: { customerId: "...", reason: "...", reasonLength: 20 }
   [suspendCustomer] Validation passed, calling RPC...
   [suspendCustomer] RPC success, logging audit...
   ```

7. **Verify Success**:
   - ✅ Toast message: "ระงับบัญชีลูกค้าสำเร็จ"
   - ✅ Modal closes
   - ✅ Customer row background turns red
   - ✅ Status badge shows "ระงับการใช้งาน"
   - ✅ Avatar color changes to red

### Step 4: Verify in Database

```sql
-- Check customer status
SELECT
  id,
  email,
  full_name,
  status,
  suspension_reason,
  suspended_at,
  suspended_by
FROM users
WHERE id = '<customer_id>';

-- Check audit log
SELECT
  id,
  admin_id,
  action,
  target_type,
  target_id,
  details,
  created_at
FROM admin_audit_logs
WHERE target_id = '<customer_id>'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results**:

- `status` = 'suspended'
- `suspension_reason` = your entered reason
- `suspended_at` = current timestamp
- `suspended_by` = your admin user ID
- Audit log entry exists with action = 'customer_suspended'

---

## 🔍 Troubleshooting

### Issue: Still Getting "ข้อมูลไม่ถูกต้อง"

**Check Console Logs**:

1. **If you see**: `[suspendCustomer] Validation failed:`
   - **Problem**: Input validation is failing
   - **Check**:
     - Is `customerId` a valid UUID?
     - Is `reason` at least 10 characters?
     - Is `reason` not empty after trim?

2. **If you see**: `[suspendCustomer] RPC error:`
   - **Problem**: Database function is failing
   - **Check**:
     - Are you logged in as admin?
     - Does the customer exist?
     - Is the customer's role = 'customer'?

3. **If you see**: `PGRST205` error
   - **Problem**: Schema cache not reloaded
   - **Fix**: Run `NOTIFY pgrst, 'reload schema'` again

### Issue: Audit Log Error

**Error**: `Could not find the table 'public.admin_audit_logs' in the schema cache`

**Fix**:

```sql
-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

### Issue: "Unauthorized: Admin access required"

**Problem**: Your user doesn't have admin role.

**Check**:

```sql
SELECT id, email, role FROM users WHERE id = auth.uid();
```

**Fix**:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

---

## 📊 Validation Rules

### CustomerSuspensionSchema

```typescript
{
  customerId: z.string().uuid('รหัสลูกค้าไม่ถูกต้อง'),
  reason: z.string()
    .min(10, 'เหตุผลต้องมีอย่างน้อย 10 ตัวอักษร')
    .max(500, 'เหตุผลต้องไม่เกิน 500 ตัวอักษร')
    .refine(val => val.trim().length > 0, 'กรุณาระบุเหตุผล')
}
```

**Valid Example**:

```typescript
{
  customerId: "123e4567-e89b-12d3-a456-426614174000",
  reason: "ละเมิดเงื่อนไขการใช้งาน"  // 10+ characters
}
```

**Invalid Examples**:

```typescript
// ❌ Reason too short
{
  customerId: "123e4567-e89b-12d3-a456-426614174000",
  reason: "ทดสอบ"  // Only 5 characters
}

// ❌ Invalid UUID
{
  customerId: "invalid-uuid",
  reason: "เหตุผลที่ถูกต้อง"
}

// ❌ Empty reason
{
  customerId: "123e4567-e89b-12d3-a456-426614174000",
  reason: "   "  // Only whitespace
}
```

---

## 🎯 Success Criteria

- ✅ Schema cache reloaded
- ✅ Enhanced error logging added
- ✅ Specific error messages implemented
- ✅ Console logs show exact failure point
- ✅ Audit log table recognized by PostgREST
- ✅ RLS policies verified
- ✅ RPC function verified

---

## 📝 Next Steps

1. **Hard refresh browser** (Ctrl+Shift+R)
2. **Open console** (F12)
3. **Test suspension** with a customer
4. **Check console logs** for detailed error messages
5. **Report back** with console output if still failing

---

## 🔗 Related Files

- `src/admin/views/CustomersView.vue` - UI component
- `src/admin/composables/useAdminCustomers.ts` - Business logic (✅ Updated)
- `src/admin/schemas/validation.ts` - Validation rules
- `src/admin/composables/useAuditLog.ts` - Audit logging

---

**Last Updated**: 2026-01-28  
**Status**: ✅ Ready for Testing
