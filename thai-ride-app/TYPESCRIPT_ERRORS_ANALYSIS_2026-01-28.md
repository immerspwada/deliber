# TypeScript Errors Analysis & Fix Plan

**Date**: 2026-01-28  
**Status**: ✅ Analysis Complete  
**Priority**: 🔥 CRITICAL

---

## 📊 Summary

- **Total Errors**: ~15 TypeScript errors
- **Missing Tables**: 3 (provider_documents, providers, earnings)
- **Missing RPC Functions**: 0 (all exist in database)
- **Existing Tables**: 2 (ride_share_links, ride_share_link_views)
- **Type Issues**: Symbol type errors in PricingSettingsCard.vue

---

## ✅ RPC Functions Status

All RPC functions exist in production database:

| Function Name                         | Status    | Arguments                                                                |
| ------------------------------------- | --------- | ------------------------------------------------------------------------ |
| `get_admin_customers`                 | ✅ Exists | p_search, p_status, p_limit, p_offset                                    |
| `count_admin_customers`               | ✅ Exists | p_search, p_status                                                       |
| `admin_update_provider_commission`    | ✅ Exists | p_provider_id, p_commission_type, p_commission_value, p_commission_notes |
| `admin_update_provider_service_types` | ✅ Exists | p_provider_id, p_service_types                                           |
| `get_topup_request_audit_logs`        | ✅ Exists | p_topup_request_id, p_limit                                              |
| `cleanup_expired_share_links`         | ✅ Exists | (no arguments)                                                           |

---

## ❌ Missing Tables

These tables are referenced in code but don't exist in database:

### 1. `provider_documents`

- **Referenced in**: `src/admin/components/DocumentReviewModal.vue`
- **Impact**: Document review functionality broken
- **Solution**: Either create table or refactor to use existing tables

### 2. `providers` (old table)

- **Referenced in**:
  - `src/admin/components/ProviderDetailModal.vue`
  - `src/admin/components/ReportGenerator.vue`
- **Impact**: Old provider references
- **Solution**: Update to use `providers_v2` table

### 3. `earnings`

- **Referenced in**: `src/admin/components/ReportGenerator.vue`
- **Impact**: Earnings reports broken
- **Solution**: Either create table or use wallet transactions

---

## ✅ Existing Tables

These tables exist and are working:

| Table Name              | Status    | Used In                |
| ----------------------- | --------- | ---------------------- |
| `ride_share_links`      | ✅ Exists | ShareLinkAnalytics.vue |
| `ride_share_link_views` | ✅ Exists | ShareLinkAnalytics.vue |

---

## 🔧 Fix Strategy

### Phase 1: Update Database Types (DONE)

- ✅ Generated TypeScript types from production database
- ✅ Types written to `src/types/database.ts`

### Phase 2: Add Missing RPC Functions to Types

Need to manually add these RPC function types to `database.ts`:

```typescript
export type Functions = {
  get_admin_customers: {
    Args: {
      p_search?: string | null;
      p_status?: string | null;
      p_limit?: number;
      p_offset?: number;
    };
    Returns: Array<{
      id: string;
      email: string;
      phone: string;
      full_name: string;
      status: "active" | "suspended" | "banned";
      suspended_reason: string | null;
      created_at: string;
      total_rides: number;
      total_spent: number;
    }>;
  };
  count_admin_customers: {
    Args: {
      p_search?: string | null;
      p_status?: string | null;
    };
    Returns: number;
  };
  admin_update_provider_commission: {
    Args: {
      p_provider_id: string;
      p_commission_type: string;
      p_commission_value: number;
      p_commission_notes?: string | null;
    };
    Returns: void;
  };
  admin_update_provider_service_types: {
    Args: {
      p_provider_id: string;
      p_service_types: string[];
    };
    Returns: void;
  };
  get_topup_request_audit_logs: {
    Args: {
      p_topup_request_id: string;
      p_limit?: number;
    };
    Returns: Array<{
      id: string;
      topup_request_id: string;
      action: string;
      actor_id: string | null;
      actor_role: string | null;
      actor_name: string | null;
      actor_email: string | null;
      old_status: string | null;
      new_status: string | null;
      old_amount: number | null;
      new_amount: number | null;
      changes: Record<string, any> | null;
      metadata: Record<string, any> | null;
      notes: string | null;
      created_at: string;
    }>;
  };
  cleanup_expired_share_links: {
    Args: Record<string, never>;
    Returns: number;
  };
};
```

### Phase 3: Fix Component Type Errors

#### 1. DocumentReviewModal.vue

**Issue**: References non-existent `provider_documents` table

**Options**:

- A) Create `provider_documents` table in database
- B) Refactor to use existing document storage (storage.objects)
- C) Comment out/disable component until table is created

**Recommendation**: Option C (disable) - document review is not critical

#### 2. ProviderDetailModal.vue & ReportGenerator.vue

**Issue**: References old `providers` table instead of `providers_v2`

**Fix**: Update all references from `providers` to `providers_v2`

```typescript
// Before
.from('providers')

// After
.from('providers_v2')
```

#### 3. ReportGenerator.vue

**Issue**: References non-existent `earnings` table

**Options**:

- A) Create `earnings` table
- B) Use `provider_wallet_transactions` table
- C) Disable earnings report

**Recommendation**: Option B - use existing wallet transactions

#### 4. PricingSettingsCard.vue

**Issue**: Symbol type errors with object keys

**Fix**: Add proper type assertions for symbol keys

```typescript
// Before
const colors: Record<string, string> = { ... }
return colors[status]

// After
const colors: Record<string, string> = { ... }
return colors[status as keyof typeof colors] || '#6B7280'
```

---

## 📝 Implementation Steps

### Step 1: Add RPC Function Types

```bash
# Edit src/types/database.ts
# Add Functions interface with all RPC function signatures
```

### Step 2: Fix Provider Table References

```bash
# Update files to use providers_v2:
- src/admin/components/ProviderDetailModal.vue
- src/admin/components/ReportGenerator.vue
```

### Step 3: Fix Earnings References

```bash
# Update ReportGenerator.vue to use provider_wallet_transactions
```

### Step 4: Fix Symbol Type Errors

```bash
# Update PricingSettingsCard.vue with proper type assertions
```

### Step 5: Disable Broken Components

```bash
# Comment out or add error boundaries for:
- DocumentReviewModal.vue (until provider_documents table created)
```

### Step 6: Verify

```bash
npm run type-check
# Should show 0 errors
```

---

## 🎯 Expected Outcome

After fixes:

- ✅ All TypeScript errors resolved
- ✅ Type-safe RPC function calls
- ✅ Proper table references (providers_v2)
- ✅ Clean type-check output
- ⚠️ DocumentReviewModal disabled (needs table creation)

---

## 📊 Files to Modify

1. `src/types/database.ts` - Add RPC function types
2. `src/admin/components/ProviderDetailModal.vue` - Update to providers_v2
3. `src/admin/components/ReportGenerator.vue` - Update to providers_v2 and wallet transactions
4. `src/admin/components/PricingSettingsCard.vue` - Fix symbol type errors
5. `src/admin/components/DocumentReviewModal.vue` - Add error boundary or disable

---

**Next Action**: Implement fixes in order listed above
