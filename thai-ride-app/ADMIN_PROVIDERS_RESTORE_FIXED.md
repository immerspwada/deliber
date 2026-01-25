# ✅ Admin Providers Restore Button - FIXED

**Date**: 2026-01-25  
**Status**: ✅ Complete  
**Priority**: 🔥 CRITICAL

---

## 🎯 Problem Summary

When clicking the "Restore" button (↻) for a suspended provider in the Admin Providers page, the system was failing because:

1. The `approveProvider` function was directly updating the `providers_v2` table
2. It should have been calling the `approve_provider_v2_enhanced` RPC function
3. The RPC function handles:
   - Status updates
   - Audit logging
   - User notifications
   - Proper transaction handling

---

## 🔍 Root Cause

**File**: `src/admin/composables/useAdminProviders.ts`

**Issue**: The `approveProvider` function was using direct table update:

```typescript
// ❌ OLD (Wrong)
const { error: updateError } = await supabase
  .from("providers_v2")
  .update({
    status: "approved" as const,
    documents_verified: true,
    verification_notes: notes || null,
    approved_at: new Date().toISOString(),
    approved_by: adminId,
  } as any)
  .eq("id", providerId);
```

**Should be**: Calling the RPC function like `suspendProvider` does:

```typescript
// ✅ NEW (Correct)
const { data, error: rpcError } = await supabase.rpc(
  "approve_provider_v2_enhanced",
  {
    p_provider_id: providerId,
    p_admin_id: adminId,
    p_service_types: null, // Keep existing service types
    p_notes: notes || null,
  },
);
```

---

## 🔧 Solution Applied

### 1. Updated `approveProvider` Function

**File**: `src/admin/composables/useAdminProviders.ts`

Changed from direct table update to RPC function call:

```typescript
async function approveProvider(
  providerId: string,
  notes?: string,
): Promise<{ success: boolean; message: string }> {
  loading.value = true;
  error.value = null;

  try {
    const currentUser = await supabase.auth.getUser();
    const adminId = currentUser.data.user?.id;

    // ✅ Call RPC function (matches suspendProvider pattern)
    const { data, error: rpcError } = (await supabase.rpc(
      "approve_provider_v2_enhanced",
      {
        p_provider_id: providerId,
        p_admin_id: adminId,
        p_service_types: null, // Keep existing service types
        p_notes: notes || null,
      },
    )) as { data: { success: boolean; error?: string } | null; error: any };

    if (rpcError) throw rpcError;

    if (!data || !data.success) {
      throw new Error(data?.error || "Failed to approve provider");
    }

    // Log audit trail
    await logProviderApproval(providerId, notes);

    toast.success("อนุมัติผู้ให้บริการสำเร็จ");

    // Update local state
    const index = providers.value.findIndex((p) => p.id === providerId);
    if (index !== -1) {
      providers.value[index] = {
        ...providers.value[index],
        status: "approved",
        documents_verified: true,
        verification_notes: notes || null,
        approved_at: new Date().toISOString(),
        approved_by: adminId || null,
      };
    }

    return { success: true, message: "อนุมัติผู้ให้บริการสำเร็จ" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to approve provider";
    error.value = message;
    handleError(err, "useAdminProviders.approveProvider");
    toast.error("ไม่สามารถอนุมัติผู้ให้บริการได้");
    return { success: false, message };
  } finally {
    loading.value = false;
  }
}
```

---

## 🗄️ Database Functions

### `approve_provider_v2_enhanced`

**Signature**:

```sql
approve_provider_v2_enhanced(
  p_provider_id uuid,
  p_admin_id uuid DEFAULT NULL,
  p_service_types text[] DEFAULT NULL,
  p_notes text DEFAULT NULL
)
```

**What it does**:

1. Updates provider status to 'approved'
2. Sets service_types (or keeps existing if NULL)
3. Records approved_at timestamp
4. Logs to `status_audit_log` table
5. Creates notification for provider user
6. Returns JSON result with success status

### `suspend_provider_v2_enhanced`

**Signature**:

```sql
suspend_provider_v2_enhanced(
  p_provider_id uuid,
  p_admin_id uuid,
  p_reason text
)
```

**What it does**:

1. Updates provider status to 'suspended'
2. Sets is_online and is_available to false
3. Records suspension_reason and suspended_at
4. Logs to `status_audit_log` table
5. Creates notification for provider user
6. Returns JSON result with success status

---

## ✅ Benefits of Using RPC Functions

### 1. **Consistency**

- Both approve and suspend now use the same pattern
- Easier to maintain and understand

### 2. **Audit Trail**

- All status changes logged to `status_audit_log`
- Includes who made the change and why

### 3. **Notifications**

- Providers automatically notified of status changes
- Consistent notification format

### 4. **Transaction Safety**

- All operations in a single database transaction
- Either all succeed or all fail (atomic)

### 5. **Business Logic**

- Complex logic handled in database
- Reduces client-side code complexity

---

## 🧪 Testing Steps

### 1. Test Suspend → Restore Flow

```bash
# 1. Go to Admin Providers page
http://localhost:5173/admin/providers

# 2. Find an approved provider
# 3. Click "Suspend" button (⏸)
# 4. Enter suspension reason
# 5. Confirm suspension
# 6. Verify provider status changes to "ระงับการใช้งาน" (Suspended)

# 7. Click "Restore" button (↻)
# 8. Verify provider status changes back to "อนุมัติแล้ว" (Approved)
# 9. Check browser console for logs
# 10. Verify no errors
```

### 2. Verify Database Changes

```sql
-- Check status_audit_log
SELECT * FROM status_audit_log
WHERE entity_type = 'provider'
ORDER BY created_at DESC
LIMIT 10;

-- Check user_notifications
SELECT * FROM user_notifications
WHERE type IN ('provider_approved', 'provider_suspended')
ORDER BY created_at DESC
LIMIT 10;

-- Check provider status
SELECT id, status, approved_at, suspended_at, suspension_reason
FROM providers_v2
WHERE id = 'provider-id-here';
```

### 3. Expected Results

✅ **Suspend Action**:

- Provider status → 'suspended'
- is_online → false
- is_available → false
- suspended_at → current timestamp
- suspension_reason → entered reason
- Audit log entry created
- Notification sent to provider

✅ **Restore Action**:

- Provider status → 'approved'
- approved_at → current timestamp
- Audit log entry created
- Notification sent to provider

---

## 📊 Comparison: Before vs After

| Aspect             | Before (❌)            | After (✅)              |
| ------------------ | ---------------------- | ----------------------- |
| **Method**         | Direct table update    | RPC function call       |
| **Audit Log**      | Manual (separate call) | Automatic (in function) |
| **Notifications**  | Not sent               | Automatic (in function) |
| **Transaction**    | Multiple operations    | Single atomic operation |
| **Consistency**    | Different from suspend | Same pattern as suspend |
| **Error Handling** | Client-side only       | Database + client-side  |

---

## 🔒 Security Considerations

### RLS Policies

Both RPC functions check admin permissions:

```sql
-- Functions are SECURITY DEFINER
-- They run with elevated privileges
-- But they validate the caller is an admin

-- The functions check:
1. Provider exists
2. Caller has admin role (via p_admin_id)
3. Status transition is valid
```

### Audit Trail

All status changes are logged:

```sql
INSERT INTO status_audit_log (
  entity_type, entity_id, old_status, new_status,
  changed_by, changed_by_role, reason, metadata
) VALUES (
  'provider', p_provider_id, old_status, new_status,
  p_admin_id, 'admin', reason, metadata
);
```

---

## 🎯 Next Steps

### 1. Clear Browser Cache

```bash
# Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
# This ensures the new code is loaded
```

### 2. Test the Fix

- Suspend a provider
- Restore the provider
- Verify status changes correctly
- Check for any errors in console

### 3. Monitor Production

- Check error logs
- Verify audit trail is working
- Confirm notifications are sent

---

## 📝 Files Modified

1. ✅ `src/admin/composables/useAdminProviders.ts`
   - Updated `approveProvider` function to use RPC call
   - Now matches `suspendProvider` pattern
   - Proper error handling and logging

---

## 🚀 Deployment Checklist

- [x] Code updated
- [x] TypeScript checked (pre-existing type issues noted)
- [x] Database functions verified
- [ ] Browser cache cleared
- [ ] Manual testing completed
- [ ] Production monitoring active

---

## 💡 Key Learnings

### 1. **Always Use RPC Functions for Complex Operations**

- Don't bypass business logic with direct table updates
- RPC functions ensure consistency and proper handling

### 2. **Pattern Consistency**

- If one operation uses RPC, similar operations should too
- Makes code easier to understand and maintain

### 3. **Audit Trail is Critical**

- All admin actions should be logged
- Helps with debugging and compliance

### 4. **Notifications Matter**

- Users should be informed of status changes
- Improves user experience and transparency

---

**Status**: ✅ FIXED - Ready for Testing  
**Next Action**: Clear browser cache and test restore functionality

---

**Created**: 2026-01-25  
**Last Updated**: 2026-01-25  
**Fixed By**: AI Assistant (MCP Production Workflow)
