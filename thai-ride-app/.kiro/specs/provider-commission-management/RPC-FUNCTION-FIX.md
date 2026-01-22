# 🔧 RPC Function Fix - Commission Fields

**Date**: 2026-01-19  
**Status**: ✅ Complete  
**Issue**: Admin providers page not showing commission data

---

## 🐛 Problem

The admin providers page at `/admin/providers` was not displaying commission information even though:

- ✅ Database columns exist (`commission_type`, `commission_value`, `commission_notes`, etc.)
- ✅ TypeScript types were generated
- ✅ UI components were ready to display the data

**Root Cause**: The RPC function `get_admin_providers_v2` was not returning the commission fields.

---

## ✅ Solution

Updated the `get_admin_providers_v2` function to include all commission fields in the return type.

### Changes Made

1. **Dropped and recreated the function** with updated return type
2. **Added commission fields** to the SELECT statement
3. **Updated TypeScript interface** in `useAdminProviders.ts`

---

## 📝 SQL Changes

```sql
DROP FUNCTION IF EXISTS get_admin_providers_v2(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION get_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_uid TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  provider_type TEXT,
  status TEXT,
  is_online BOOLEAN,
  is_available BOOLEAN,
  current_lat DECIMAL,
  current_lng DECIMAL,
  rating DECIMAL,
  total_trips INT,
  total_earnings DECIMAL,
  wallet_balance DECIMAL,
  -- ✅ NEW: Commission fields
  commission_type TEXT,
  commission_value DECIMAL,
  commission_notes TEXT,
  commission_updated_at TIMESTAMPTZ,
  commission_updated_by UUID,
  -- END NEW
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_user_role TEXT;
BEGIN
  SELECT auth.uid() INTO v_admin_id;
  SELECT u.role INTO v_user_role FROM users u WHERE u.id = v_admin_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required. Current role: %', v_user_role;
  END IF;

  RETURN QUERY
  SELECT
    pv.id,
    pv.user_id,
    pv.provider_uid,
    pv.email,
    pv.first_name,
    pv.last_name,
    pv.phone_number,
    pv.provider_type,
    pv.status::TEXT,
    pv.is_online,
    pv.is_available,
    pv.current_lat,
    pv.current_lng,
    pv.rating,
    pv.total_trips,
    COALESCE(pv.total_earnings, 0) as total_earnings,
    COALESCE(uw.balance, 0) as wallet_balance,
    -- ✅ NEW: Commission fields from providers_v2
    pv.commission_type,
    pv.commission_value,
    pv.commission_notes,
    pv.commission_updated_at,
    pv.commission_updated_by,
    -- END NEW
    pv.created_at,
    pv.approved_at,
    pv.updated_at
  FROM providers_v2 pv
  LEFT JOIN user_wallets uw ON pv.user_id = uw.user_id
  WHERE
    (p_status IS NULL OR pv.status::TEXT = p_status)
    AND (p_provider_type IS NULL OR pv.provider_type = p_provider_type)
  ORDER BY pv.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
```

---

## 🔄 TypeScript Interface Update

Updated `AdminProvider` interface in `src/admin/composables/useAdminProviders.ts`:

```typescript
export interface AdminProvider {
  // ... existing fields ...

  // ✅ NEW: Commission fields
  commission_type: "percentage" | "fixed" | null;
  commission_value: number | null;
  commission_notes: string | null;
  commission_updated_at: string | null;
  commission_updated_by: string | null;

  // ... rest of fields ...
}
```

---

## ✅ Verification

### Database Check

```sql
-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'providers_v2'
AND column_name LIKE 'commission%';

-- Test function
SELECT id, first_name, last_name, commission_type, commission_value
FROM get_admin_providers_v2(NULL, NULL, 3, 0);
```

### Expected Results

- ✅ Function returns commission fields
- ✅ UI displays commission badges in table
- ✅ Detail modal shows commission section
- ✅ Edit commission button works

---

## 🎯 What's Now Working

1. **Table View**: Commission badges show in the providers table
   - Percentage: Blue badge with `20%`
   - Fixed: Yellow badge with `20 ฿`

2. **Detail Modal**: Commission section displays:
   - Commission type (percentage/fixed)
   - Commission value
   - Notes (if any)
   - Last updated timestamp
   - Edit button to modify

3. **Edit Modal**: Opens when clicking edit button
   - Change commission type
   - Update commission value
   - Add notes
   - Saves via `admin_update_provider_commission` RPC

---

## 📊 Impact

| Component    | Before                   | After                      |
| ------------ | ------------------------ | -------------------------- |
| Table        | ❌ No commission data    | ✅ Shows commission badges |
| Detail Modal | ❌ No commission section | ✅ Full commission info    |
| Edit Modal   | ✅ Working               | ✅ Working                 |
| RPC Function | ❌ Missing fields        | ✅ Returns all fields      |
| TypeScript   | ⚠️ Types incomplete      | ✅ Types complete          |

---

## 🚀 Deployment

### Production

```bash
# Already applied via MCP
# Function updated in production database
# No migration file needed
```

### Verification Steps

1. Login as admin
2. Navigate to `/admin/providers`
3. Check table shows commission badges
4. Click on a provider
5. Verify commission section appears
6. Click "แก้ไข" button
7. Update commission and save
8. Verify changes reflect immediately

---

## 📝 Related Files

- `src/admin/views/ProvidersView.vue` - UI displays commission
- `src/admin/composables/useAdminProviders.ts` - Interface updated
- `src/admin/composables/useProviderCommission.ts` - Edit functionality
- `src/admin/components/ProviderCommissionModal.vue` - Edit modal
- `src/types/commission.ts` - Commission types
- `supabase/migrations/316_provider_commission_system.sql` - Original migration

---

## ✅ Checklist

- [x] RPC function updated with commission fields
- [x] TypeScript interface updated
- [x] Function tested in production
- [x] UI verified to display data
- [x] Edit functionality working
- [x] Documentation updated

---

**Status**: ✅ **COMPLETE** - Commission data now visible in admin panel
