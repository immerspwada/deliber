# Admin RPC Functions Documentation

## Overview

This document describes the RPC (Remote Procedure Call) functions available for the Admin Panel. All functions use `SECURITY DEFINER` to bypass RLS policies and include admin role verification for security.

## Table of Contents

1. [get_admin_customers()](#get_admin_customers)
2. [count_admin_customers()](#count_admin_customers)
3. [get_admin_providers_v2()](#get_admin_providers_v2)
4. [count_admin_providers_v2()](#count_admin_providers_v2)
5. [get_topup_requests_admin()](#get_topup_requests_admin)
6. [count_topup_requests_admin()](#count_topup_requests_admin)
7. [approve_topup_request()](#approve_topup_request)
8. [reject_topup_request()](#reject_topup_request)

---

## get_admin_customers()

Retrieves a paginated list of customers with search and filter capabilities, including wallet balance and order statistics.

### Function Signature

```sql
get_admin_customers(
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (...)
```

### Parameters

| Parameter       | Type | Required | Default | Description                                                              |
| --------------- | ---- | -------- | ------- | ------------------------------------------------------------------------ |
| `p_search_term` | TEXT | No       | NULL    | Search term to filter by name, email, or phone number (case-insensitive) |
| `p_status`      | TEXT | No       | NULL    | Filter by customer status ('active', 'suspended', 'banned')              |
| `p_limit`       | INT  | No       | 20      | Maximum number of records to return                                      |
| `p_offset`      | INT  | No       | 0       | Number of records to skip (for pagination)                               |

### Return Columns

| Column              | Type        | Description                                                        |
| ------------------- | ----------- | ------------------------------------------------------------------ |
| `id`                | UUID        | Customer's unique identifier                                       |
| `email`             | TEXT        | Customer's email address                                           |
| `full_name`         | TEXT        | Customer's full name (first + last) or email if name not available |
| `phone_number`      | TEXT        | Customer's phone number                                            |
| `status`            | TEXT        | Account status ('active', 'suspended', 'banned')                   |
| `wallet_balance`    | NUMERIC     | Current wallet balance                                             |
| `total_orders`      | BIGINT      | Total number of completed orders                                   |
| `total_spent`       | NUMERIC     | Total amount spent on completed orders                             |
| `average_rating`    | NUMERIC     | Average rating given by customer (0-5)                             |
| `created_at`        | TIMESTAMPTZ | Account creation timestamp                                         |
| `last_order_at`     | TIMESTAMPTZ | Timestamp of most recent order (NULL if no orders)                 |
| `suspension_reason` | TEXT        | Reason for suspension (NULL if not suspended)                      |
| `suspended_at`      | TIMESTAMPTZ | Suspension timestamp (NULL if not suspended)                       |
| `suspended_by`      | UUID        | Admin who suspended the account (NULL if not suspended)            |

### Security

- **SECURITY DEFINER**: Bypasses RLS policies
- **Admin Role Check**: Verifies caller has admin role in profiles table
- **Error**: Raises exception if caller is not admin

### Performance

- Uses SELECT wrapper pattern for `auth.uid()` caching
- Leverages indexes on users, profiles, and ride_requests tables
- LATERAL join for efficient order statistics aggregation
- Expected execution time: < 500ms

### Usage Examples

#### TypeScript/JavaScript (Supabase Client)

```typescript
// Get all active customers
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: null,
  p_status: "active",
  p_limit: 20,
  p_offset: 0,
});

// Search for customers by email
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: "john@example.com",
  p_status: null,
  p_limit: 20,
  p_offset: 0,
});

// Get suspended customers
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: null,
  p_status: "suspended",
  p_limit: 20,
  p_offset: 0,
});

// Pagination - page 2
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: null,
  p_status: null,
  p_limit: 20,
  p_offset: 20,
});
```

#### Vue Composable Example

```typescript
// composables/useAdminCustomers.ts
import { ref } from "vue";
import { supabase } from "@/lib/supabase";

export function useAdminCustomers() {
  const customers = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const totalCount = ref(0);

  async function fetchCustomers(options = {}) {
    loading.value = true;
    error.value = null;

    try {
      // Get count for pagination
      const { data: count } = await supabase.rpc("count_admin_customers", {
        p_search_term: options.searchTerm || null,
        p_status: options.status || null,
      });
      totalCount.value = count || 0;

      // Get customers
      const { data, error: rpcError } = await supabase.rpc(
        "get_admin_customers",
        {
          p_search_term: options.searchTerm || null,
          p_status: options.status || null,
          p_limit: options.limit || 20,
          p_offset: options.offset || 0,
        },
      );

      if (rpcError) throw rpcError;
      customers.value = data || [];
    } catch (e) {
      error.value = e.message;
      console.error("Error fetching customers:", e);
    } finally {
      loading.value = false;
    }
  }

  return {
    customers,
    loading,
    error,
    totalCount,
    fetchCustomers,
  };
}
```

### Search Behavior

The search term is matched against:

- Email address (ILIKE)
- First name (ILIKE)
- Last name (ILIKE)
- Phone number (ILIKE)

Search is case-insensitive and uses partial matching (contains).

### Error Handling

```typescript
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: null,
  p_status: null,
  p_limit: 20,
  p_offset: 0,
});

if (error) {
  if (error.message.includes("Access denied")) {
    // User is not admin
    console.error("Admin privileges required");
  } else {
    // Other database error
    console.error("Database error:", error.message);
  }
}
```

---

## count_admin_customers()

Returns the total count of customers matching the given filters. Used for pagination.

### Function Signature

```sql
count_admin_customers(
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS BIGINT
```

### Parameters

| Parameter       | Type | Required | Default | Description                                           |
| --------------- | ---- | -------- | ------- | ----------------------------------------------------- |
| `p_search_term` | TEXT | No       | NULL    | Search term to filter by name, email, or phone number |
| `p_status`      | TEXT | No       | NULL    | Filter by customer status                             |

### Returns

Returns a single BIGINT value representing the total count of customers matching the filters.

### Usage Example

```typescript
const { data: count, error } = await supabase.rpc("count_admin_customers", {
  p_search_term: "john",
  p_status: "active",
});

console.log(`Total customers: ${count}`);

// Calculate total pages
const pageSize = 20;
const totalPages = Math.ceil(count / pageSize);
```

---

## get_admin_providers_v2()

Retrieves a paginated list of providers with status and verification information.

### Function Signature

```sql
get_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (...)
```

### Parameters

| Parameter         | Type | Required | Default | Description                                                                |
| ----------------- | ---- | -------- | ------- | -------------------------------------------------------------------------- |
| `p_status`        | TEXT | No       | NULL    | Filter by provider status ('pending', 'approved', 'rejected', 'suspended') |
| `p_provider_type` | TEXT | No       | NULL    | Filter by provider type ('ride', 'delivery', 'shopping', 'all')            |
| `p_limit`         | INT  | No       | 20      | Maximum number of records to return                                        |
| `p_offset`        | INT  | No       | 0       | Number of records to skip                                                  |

### Return Columns

| Column               | Type             | Description                            |
| -------------------- | ---------------- | -------------------------------------- |
| `id`                 | UUID             | Provider's unique identifier           |
| `user_id`            | UUID             | Associated user account ID             |
| `provider_uid`       | TEXT             | Provider's unique identifier string    |
| `email`              | TEXT             | Provider's email address               |
| `first_name`         | TEXT             | Provider's first name                  |
| `last_name`          | TEXT             | Provider's last name                   |
| `phone_number`       | TEXT             | Provider's phone number                |
| `provider_type`      | TEXT             | Type of service provider offers        |
| `status`             | TEXT             | Provider status                        |
| `is_online`          | BOOLEAN          | Whether provider is currently online   |
| `is_available`       | BOOLEAN          | Whether provider is available for jobs |
| `current_lat`        | DOUBLE PRECISION | Current latitude                       |
| `current_lng`        | DOUBLE PRECISION | Current longitude                      |
| `rating`             | NUMERIC          | Provider's average rating              |
| `total_trips`        | INT              | Total completed trips                  |
| `total_earnings`     | NUMERIC          | Total earnings                         |
| `wallet_balance`     | NUMERIC          | Current wallet balance                 |
| `documents_verified` | BOOLEAN          | Whether documents are verified         |
| `verification_notes` | TEXT             | Admin notes on verification            |
| `created_at`         | TIMESTAMPTZ      | Account creation timestamp             |
| `approved_at`        | TIMESTAMPTZ      | Approval timestamp                     |
| `approved_by`        | UUID             | Admin who approved                     |
| `last_active_at`     | TIMESTAMPTZ      | Last activity timestamp                |

### Usage Example

```typescript
// Get pending providers for verification queue
const { data, error } = await supabase.rpc("get_admin_providers_v2", {
  p_status: "pending",
  p_provider_type: null,
  p_limit: 20,
  p_offset: 0,
});

// Get online ride providers
const { data, error } = await supabase.rpc("get_admin_providers_v2", {
  p_status: "approved",
  p_provider_type: "ride",
  p_limit: 20,
  p_offset: 0,
});
```

---

## count_admin_providers_v2()

Returns the total count of providers matching the given filters.

### Function Signature

```sql
count_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS BIGINT
```

### Parameters

| Parameter         | Type | Required | Default | Description               |
| ----------------- | ---- | -------- | ------- | ------------------------- |
| `p_status`        | TEXT | No       | NULL    | Filter by provider status |
| `p_provider_type` | TEXT | No       | NULL    | Filter by provider type   |

### Usage Example

```typescript
const { data: count, error } = await supabase.rpc("count_admin_providers_v2", {
  p_status: "pending",
  p_provider_type: null,
});

console.log(`Pending verifications: ${count}`);
```

---

## Performance Considerations

### Indexes

The migration creates the following indexes for optimal performance:

- `idx_users_email_search` - Full-text search on email
- `idx_users_name_search` - Full-text search on names
- `idx_users_phone_search` - Phone number lookups
- `idx_users_status` - Status filtering
- `idx_profiles_role` - Role filtering
- `idx_providers_v2_status` - Provider status filtering
- `idx_providers_v2_type` - Provider type filtering
- `idx_ride_requests_user_completed` - Order statistics

### Query Optimization

- Uses LATERAL joins for efficient aggregation
- SELECT wrapper pattern for auth.uid() caching
- CONCURRENTLY index creation to avoid blocking
- Partial indexes for frequently queried subsets

### Expected Performance

- Query execution: < 500ms
- With proper indexes: < 100ms for most queries
- Pagination overhead: minimal with offset/limit

---

## Security Best Practices

### Admin Role Verification

All functions verify admin role before executing:

```sql
IF NOT EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = (SELECT auth.uid())
  AND profiles.role = 'admin'
) THEN
  RAISE EXCEPTION 'Access denied. Admin privileges required.';
END IF;
```

### SECURITY DEFINER

Functions use `SECURITY DEFINER` to bypass RLS policies, allowing admins to access all data regardless of RLS rules.

### Audit Logging

Consider adding audit logging for sensitive operations:

```typescript
// Log admin actions
await supabase.from("audit_logs").insert({
  admin_id: user.id,
  action: "view_customers",
  resource_type: "customers",
  filters: { status: "suspended" },
  timestamp: new Date().toISOString(),
});
```

---

## Troubleshooting

### Common Errors

**"Access denied. Admin privileges required."**

- Cause: User does not have admin role
- Solution: Verify user has `role = 'admin'` in profiles table

**"function get_admin_customers does not exist"**

- Cause: Migration not applied
- Solution: Run `npx supabase db push --local`

**Slow query performance**

- Cause: Missing indexes
- Solution: Verify indexes created with `\di` in psql

### Debugging

```typescript
// Enable detailed error logging
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: null,
  p_status: null,
  p_limit: 20,
  p_offset: 0,
});

if (error) {
  console.error("RPC Error:", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}
```

---

## Migration Information

**Migration File**: `297_admin_priority1_rpc_functions.sql`

**Created**: 2026-01-16

**Requirements**: 2.2, 2.3

**Dependencies**:

- users table
- profiles table
- providers_v2 table
- ride_requests table
- wallets table

**Rollback**: Drop functions and indexes if needed

```sql
DROP FUNCTION IF EXISTS get_admin_customers CASCADE;
DROP FUNCTION IF EXISTS count_admin_customers CASCADE;
DROP FUNCTION IF EXISTS get_admin_providers_v2 CASCADE;
DROP FUNCTION IF EXISTS count_admin_providers_v2 CASCADE;
```

---

## get_topup_requests_admin()

Retrieves a paginated list of customer topup requests with customer details and wallet balance information.

### Function Signature

```sql
get_topup_requests_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (...)
```

### Parameters

| Parameter  | Type | Required | Default | Description                                                       |
| ---------- | ---- | -------- | ------- | ----------------------------------------------------------------- |
| `p_status` | TEXT | No       | NULL    | Filter by status ('pending', 'approved', 'rejected', 'cancelled') |
| `p_limit`  | INT  | No       | 20      | Maximum number of records to return                               |
| `p_offset` | INT  | No       | 0       | Number of records to skip (for pagination)                        |

### Return Columns

| Column              | Type        | Description                                      |
| ------------------- | ----------- | ------------------------------------------------ |
| `id`                | UUID        | Topup request unique identifier                  |
| `user_id`           | UUID        | Customer's user ID                               |
| `user_name`         | TEXT        | Customer's full name or email                    |
| `user_email`        | TEXT        | Customer's email address                         |
| `user_phone`        | TEXT        | Customer's phone number                          |
| `amount`            | NUMERIC     | Topup amount requested                           |
| `payment_method`    | TEXT        | Payment method used                              |
| `payment_reference` | TEXT        | Payment reference/transaction ID                 |
| `payment_proof_url` | TEXT        | URL to payment proof image                       |
| `status`            | TEXT        | Request status                                   |
| `requested_at`      | TIMESTAMPTZ | When the request was created                     |
| `processed_at`      | TIMESTAMPTZ | When the request was processed (NULL if pending) |
| `processed_by`      | UUID        | Admin who processed the request                  |
| `rejection_reason`  | TEXT        | Reason for rejection (NULL if not rejected)      |
| `wallet_balance`    | NUMERIC     | Customer's current wallet balance                |

### Security

- **SECURITY DEFINER**: Bypasses RLS policies
- **Admin Role Check**: Verifies caller has admin role in users table
- **Error**: Raises exception if caller is not admin

### Performance

- Uses INNER JOIN with users table for customer details
- LEFT JOIN with wallets table for balance
- Prioritizes pending requests in sorting
- Expected execution time: < 300ms

### Usage Examples

#### TypeScript/JavaScript (Supabase Client)

```typescript
// Get all pending topup requests
const { data, error } = await supabase.rpc("get_topup_requests_admin", {
  p_status: "pending",
  p_limit: 20,
  p_offset: 0,
});

// Get all topup requests (any status)
const { data, error } = await supabase.rpc("get_topup_requests_admin", {
  p_status: null,
  p_limit: 50,
  p_offset: 0,
});

// Get approved requests
const { data, error } = await supabase.rpc("get_topup_requests_admin", {
  p_status: "approved",
  p_limit: 20,
  p_offset: 0,
});
```

#### Vue Composable Example

```typescript
// composables/useAdminTopupRequests.ts
import { ref } from "vue";
import { supabase } from "@/lib/supabase";

export function useAdminTopupRequests() {
  const requests = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const totalCount = ref(0);

  async function fetchRequests(options = {}) {
    loading.value = true;
    error.value = null;

    try {
      // Get count
      const { data: count } = await supabase.rpc("count_topup_requests_admin", {
        p_status: options.status || null,
      });
      totalCount.value = count || 0;

      // Get requests
      const { data, error: rpcError } = await supabase.rpc(
        "get_topup_requests_admin",
        {
          p_status: options.status || null,
          p_limit: options.limit || 20,
          p_offset: options.offset || 0,
        },
      );

      if (rpcError) throw rpcError;
      requests.value = data || [];
    } catch (e) {
      error.value = e.message;
      console.error("Error fetching topup requests:", e);
    } finally {
      loading.value = false;
    }
  }

  return {
    requests,
    loading,
    error,
    totalCount,
    fetchRequests,
  };
}
```

### Payment Methods

Supported payment methods:

- `bank_transfer` - Bank transfer
- `promptpay` - PromptPay
- `mobile_banking` - Mobile banking
- `cash` - Cash deposit
- `other` - Other payment methods

### Status Values

- `pending` - Awaiting admin approval
- `approved` - Approved and wallet credited
- `rejected` - Rejected by admin
- `cancelled` - Cancelled by customer

---

## count_topup_requests_admin()

Returns the total count of topup requests matching the given status filter.

### Function Signature

```sql
count_topup_requests_admin(
  p_status TEXT DEFAULT NULL
)
RETURNS INT
```

### Parameters

| Parameter  | Type | Required | Default | Description      |
| ---------- | ---- | -------- | ------- | ---------------- |
| `p_status` | TEXT | No       | NULL    | Filter by status |

### Returns

Returns a single INT value representing the total count of topup requests.

### Usage Example

```typescript
const { data: count, error } = await supabase.rpc(
  "count_topup_requests_admin",
  {
    p_status: "pending",
  },
);

console.log(`Pending topup requests: ${count}`);
```

---

## approve_topup_request()

Approves a topup request and credits the customer's wallet with the requested amount.

### Function Signature

```sql
approve_topup_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL(12,2)
)
```

### Parameters

| Parameter      | Type | Required | Default | Description                 |
| -------------- | ---- | -------- | ------- | --------------------------- |
| `p_request_id` | UUID | Yes      | -       | Topup request ID to approve |
| `p_admin_id`   | UUID | Yes      | -       | Admin user ID (auth.uid())  |
| `p_admin_note` | TEXT | No       | NULL    | Optional admin note         |

### Return Columns

| Column        | Type          | Description                     |
| ------------- | ------------- | ------------------------------- |
| `success`     | BOOLEAN       | Whether the operation succeeded |
| `message`     | TEXT          | Success or error message (Thai) |
| `new_balance` | DECIMAL(12,2) | Customer's new wallet balance   |

### Security

- **SECURITY DEFINER**: Bypasses RLS policies
- **Admin Role Check**: Verifies caller has admin role
- **Transaction Safety**: Uses row-level locking (FOR UPDATE)
- **Atomic Operation**: All changes in single transaction

### Behavior

1. Verifies admin role
2. Locks the topup request row
3. Validates request status is 'pending'
4. Updates request status to 'approved'
5. Creates or updates customer wallet
6. Credits wallet with topup amount
7. Creates wallet transaction record
8. Returns success with new balance

### Usage Examples

#### TypeScript/JavaScript

```typescript
// Approve a topup request
const { data, error } = await supabase.rpc("approve_topup_request", {
  p_request_id: "123e4567-e89b-12d3-a456-426614174000",
  p_admin_id: adminUser.id,
  p_admin_note: "ตรวจสอบแล้ว สลิปถูกต้อง",
});

if (error) {
  console.error("Error:", error.message);
} else if (data[0].success) {
  console.log("Success:", data[0].message);
  console.log("New balance:", data[0].new_balance);
} else {
  console.log("Failed:", data[0].message);
}
```

#### Vue Component Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const processing = ref(false);

async function approveRequest(requestId: string, note: string = "") {
  processing.value = true;

  try {
    const { data, error } = await supabase.rpc("approve_topup_request", {
      p_request_id: requestId,
      p_admin_id: authStore.user.id,
      p_admin_note: note,
    });

    if (error) throw error;

    if (data[0].success) {
      toast.success(data[0].message);
      // Refresh list
      await fetchRequests();
    } else {
      toast.error(data[0].message);
    }
  } catch (e) {
    toast.error("เกิดข้อผิดพลาด: " + e.message);
  } finally {
    processing.value = false;
  }
}
</script>
```

### Error Messages (Thai)

- `"ไม่พบคำขอเติมเงิน"` - Request not found
- `"คำขอนี้ถูกดำเนินการแล้ว"` - Request already processed
- `"อนุมัติคำขอเติมเงินสำเร็จ"` - Success message

---

## reject_topup_request()

Rejects a topup request with a reason.

### Function Signature

```sql
reject_topup_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
```

### Parameters

| Parameter      | Type | Required | Default | Description                 |
| -------------- | ---- | -------- | ------- | --------------------------- |
| `p_request_id` | UUID | Yes      | -       | Topup request ID to reject  |
| `p_admin_id`   | UUID | Yes      | -       | Admin user ID (auth.uid())  |
| `p_admin_note` | TEXT | Yes      | -       | Rejection reason (required) |

### Return Columns

| Column    | Type    | Description                     |
| --------- | ------- | ------------------------------- |
| `success` | BOOLEAN | Whether the operation succeeded |
| `message` | TEXT    | Success or error message (Thai) |

### Security

- **SECURITY DEFINER**: Bypasses RLS policies
- **Admin Role Check**: Verifies caller has admin role
- **Transaction Safety**: Uses row-level locking (FOR UPDATE)

### Behavior

1. Verifies admin role
2. Locks the topup request row
3. Validates request status is 'pending'
4. Updates request status to 'rejected'
5. Records rejection reason
6. Returns success message

### Usage Examples

#### TypeScript/JavaScript

```typescript
// Reject a topup request
const { data, error } = await supabase.rpc("reject_topup_request", {
  p_request_id: "123e4567-e89b-12d3-a456-426614174000",
  p_admin_id: adminUser.id,
  p_admin_note: "สลิปไม่ชัดเจน กรุณาอัพโหลดใหม่",
});

if (error) {
  console.error("Error:", error.message);
} else if (data[0].success) {
  console.log("Success:", data[0].message);
} else {
  console.log("Failed:", data[0].message);
}
```

#### Vue Component Example

```vue
<script setup lang="ts">
import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const processing = ref(false);
const rejectionReason = ref("");

async function rejectRequest(requestId: string) {
  if (!rejectionReason.value.trim()) {
    toast.error("กรุณาระบุเหตุผลในการปฏิเสธ");
    return;
  }

  processing.value = true;

  try {
    const { data, error } = await supabase.rpc("reject_topup_request", {
      p_request_id: requestId,
      p_admin_id: authStore.user.id,
      p_admin_note: rejectionReason.value,
    });

    if (error) throw error;

    if (data[0].success) {
      toast.success(data[0].message);
      rejectionReason.value = "";
      // Refresh list
      await fetchRequests();
    } else {
      toast.error(data[0].message);
    }
  } catch (e) {
    toast.error("เกิดข้อผิดพลาด: " + e.message);
  } finally {
    processing.value = false;
  }
}
</script>
```

### Error Messages (Thai)

- `"ไม่พบคำขอเติมเงิน"` - Request not found
- `"คำขอนี้ถูกดำเนินการแล้ว"` - Request already processed
- `"ปฏิเสธคำขอเติมเงินสำเร็จ"` - Success message

---

## get_admin_revenue_stats()

Calculates comprehensive revenue statistics with date ranges and service type filtering, including revenue breakdown by service type, daily breakdown, and payment method analysis.

### Function Signature

```sql
get_admin_revenue_stats(
  p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMPTZ DEFAULT NOW(),
  p_service_type TEXT DEFAULT NULL
)
RETURNS JSON
```

### Parameters

| Parameter        | Type        | Required | Default         | Description                                                             |
| ---------------- | ----------- | -------- | --------------- | ----------------------------------------------------------------------- |
| `p_date_from`    | TIMESTAMPTZ | No       | NOW() - 30 days | Start date for revenue calculation                                      |
| `p_date_to`      | TIMESTAMPTZ | No       | NOW()           | End date for revenue calculation                                        |
| `p_service_type` | TEXT        | No       | NULL            | Filter by service type ('ride', 'delivery', 'shopping') or NULL for all |

### Return Structure (JSON)

```typescript
{
  total_revenue: number; // Total revenue across all services
  ride_revenue: number; // Revenue from ride services
  delivery_revenue: number; // Revenue from delivery services
  shopping_revenue: number; // Revenue from shopping services
  platform_fee: number; // Platform fee (15% of total)
  provider_earnings: number; // Provider earnings (85% of total)
  daily_breakdown: Array<{
    // Daily revenue breakdown
    date: string; // Date (YYYY-MM-DD)
    revenue: number; // Total revenue for the day
    orders: number; // Number of orders
    ride_revenue: number; // Ride revenue for the day
    delivery_revenue: number; // Delivery revenue for the day
    shopping_revenue: number; // Shopping revenue for the day
  }>;
  payment_method_breakdown: {
    // Revenue by payment method
    cash: number;
    wallet: number;
    card: number;
    promptpay: number;
    mobile_banking: number;
    other: number;
  }
  date_from: string; // Query start date
  date_to: string; // Query end date
  service_type_filter: string | null; // Applied service type filter
}
```

### Security

- **SECURITY DEFINER**: Bypasses RLS policies
- **Admin Role Check**: Verifies caller has admin role in profiles table
- **Error**: Raises exception if caller is not admin

### Performance

- Uses aggregation queries with proper indexes
- Leverages partial indexes on completed/delivered orders
- Expected execution time: < 1000ms for 30-day range
- Optimized with UNION ALL for combining service types

### Usage Examples

#### TypeScript/JavaScript (Supabase Client)

```typescript
// Get last 30 days revenue (default)
const { data, error } = await supabase.rpc("get_admin_revenue_stats", {});

// Get revenue for specific date range
const { data, error } = await supabase.rpc("get_admin_revenue_stats", {
  p_date_from: "2024-01-01T00:00:00Z",
  p_date_to: "2024-01-31T23:59:59Z",
  p_service_type: null,
});

// Get ride revenue only
const { data, error } = await supabase.rpc("get_admin_revenue_stats", {
  p_date_from: "2024-01-01T00:00:00Z",
  p_date_to: "2024-01-31T23:59:59Z",
  p_service_type: "ride",
});

// Get this month's revenue
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const { data, error } = await supabase.rpc("get_admin_revenue_stats", {
  p_date_from: startOfMonth.toISOString(),
  p_date_to: new Date().toISOString(),
  p_service_type: null,
});
```

#### Vue Composable Example

```typescript
// composables/useAdminRevenue.ts
import { ref } from "vue";
import { supabase } from "@/lib/supabase";

export function useAdminRevenue() {
  const revenueStats = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function fetchRevenueStats(dateFrom, dateTo, serviceType = null) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_admin_revenue_stats",
        {
          p_date_from: dateFrom,
          p_date_to: dateTo,
          p_service_type: serviceType,
        },
      );

      if (rpcError) throw rpcError;
      revenueStats.value = data;
    } catch (e) {
      error.value = e.message;
      console.error("Error fetching revenue stats:", e);
    } finally {
      loading.value = false;
    }
  }

  return {
    revenueStats,
    loading,
    error,
    fetchRevenueStats,
  };
}
```

#### Chart Integration Example

```vue
<template>
  <div class="revenue-dashboard">
    <div class="stats-grid">
      <StatCard
        title="Total Revenue"
        :value="formatCurrency(revenueStats?.total_revenue)"
        icon="💰"
      />
      <StatCard
        title="Platform Fee"
        :value="formatCurrency(revenueStats?.platform_fee)"
        icon="🏦"
      />
      <StatCard
        title="Provider Earnings"
        :value="formatCurrency(revenueStats?.provider_earnings)"
        icon="👥"
      />
    </div>

    <LineChart
      title="Daily Revenue"
      :data="dailyChartData"
      :labels="dailyLabels"
    />

    <PieChart
      title="Revenue by Service"
      :data="serviceBreakdownData"
      :labels="['Ride', 'Delivery', 'Shopping']"
    />

    <PieChart
      title="Payment Methods"
      :data="paymentMethodData"
      :labels="paymentMethodLabels"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useAdminRevenue } from "@/composables/useAdminRevenue";

const { revenueStats, fetchRevenueStats } = useAdminRevenue();

// Fetch last 30 days on mount
onMounted(() => {
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = new Date();
  fetchRevenueStats(dateFrom.toISOString(), dateTo.toISOString());
});

// Chart data computed properties
const dailyChartData = computed(() => {
  return revenueStats.value?.daily_breakdown?.map((day) => day.revenue) || [];
});

const dailyLabels = computed(() => {
  return revenueStats.value?.daily_breakdown?.map((day) => day.date) || [];
});

const serviceBreakdownData = computed(() => {
  if (!revenueStats.value) return [];
  return [
    revenueStats.value.ride_revenue,
    revenueStats.value.delivery_revenue,
    revenueStats.value.shopping_revenue,
  ];
});

const paymentMethodData = computed(() => {
  if (!revenueStats.value?.payment_method_breakdown) return [];
  const breakdown = revenueStats.value.payment_method_breakdown;
  return [
    breakdown.cash,
    breakdown.wallet,
    breakdown.card,
    breakdown.promptpay,
    breakdown.mobile_banking,
    breakdown.other,
  ];
});

const paymentMethodLabels = [
  "Cash",
  "Wallet",
  "Card",
  "PromptPay",
  "Mobile Banking",
  "Other",
];

function formatCurrency(value) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(value || 0);
}
</script>
```

### Revenue Calculation Logic

#### Ride Revenue

- Source: `ride_requests` table
- Status: `completed` only
- Amount: `COALESCE(final_fare, actual_fare, estimated_fare)`
- Date field: `completed_at`

#### Delivery Revenue

- Source: `delivery_requests` table
- Status: `delivered` only
- Amount: `COALESCE(final_fee, estimated_fee)`
- Date field: `delivered_at`

#### Shopping Revenue

- Source: `shopping_requests` table
- Status: `completed` only
- Amount: `COALESCE(total_cost, service_fee)`
- Date field: `completed_at`

#### Platform Fee & Provider Earnings

- Platform Fee: 15% of total revenue
- Provider Earnings: 85% of total revenue
- Formula: `platform_fee = total_revenue * 0.15`
- Formula: `provider_earnings = total_revenue * 0.85`

### Service Type Filtering

When `p_service_type` is specified:

- Only revenue from that service type is calculated
- Other service revenues will be 0
- Total revenue equals the filtered service revenue
- Daily breakdown only includes filtered service data

### Error Handling

```typescript
const { data, error } = await supabase.rpc("get_admin_revenue_stats", {
  p_date_from: dateFrom,
  p_date_to: dateTo,
  p_service_type: null,
});

if (error) {
  if (error.message.includes("Access denied")) {
    // User is not admin
    console.error("Admin privileges required");
  } else {
    // Other database error
    console.error("Database error:", error.message);
  }
} else {
  console.log("Total Revenue:", data.total_revenue);
  console.log("Platform Fee:", data.platform_fee);
  console.log("Provider Earnings:", data.provider_earnings);
}
```

---

## get_admin_payment_stats()

Calculates comprehensive payment statistics and trends including transaction counts, amounts by payment method, daily trends, and service breakdown.

### Function Signature

```sql
get_admin_payment_stats(
  p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON
```

### Parameters

| Parameter     | Type        | Required | Default         | Description               |
| ------------- | ----------- | -------- | --------------- | ------------------------- |
| `p_date_from` | TIMESTAMPTZ | No       | NOW() - 30 days | Start date for statistics |
| `p_date_to`   | TIMESTAMPTZ | No       | NOW()           | End date for statistics   |

### Return Structure (JSON)

```typescript
{
  total_transactions: number; // Total number of transactions
  total_amount: number; // Total transaction amount
  average_transaction: number; // Average transaction amount
  payment_methods: Array<{
    // Payment method breakdown
    payment_method: string; // Payment method name
    transaction_count: number; // Number of transactions
    total_amount: number; // Total amount for this method
    average_amount: number; // Average amount per transaction
    percentage: number; // Percentage of total revenue
  }>;
  daily_trends: Array<{
    // Daily transaction trends
    date: string; // Date (YYYY-MM-DD)
    transaction_count: number; // Number of transactions
    total_amount: number; // Total amount for the day
    average_amount: number; // Average transaction amount
  }>;
  service_breakdown: {
    // Breakdown by service type
    ride: {
      count: number; // Number of ride transactions
      amount: number; // Total ride revenue
      average: number; // Average ride fare
    }
    delivery: {
      count: number; // Number of delivery transactions
      amount: number; // Total delivery revenue
      average: number; // Average delivery fee
    }
    shopping: {
      count: number; // Number of shopping transactions
      amount: number; // Total shopping revenue
      average: number; // Average shopping cost
    }
  }
  date_from: string; // Query start date
  date_to: string; // Query end date
}
```

### Security

- **SECURITY DEFINER**: Bypasses RLS policies
- **Admin Role Check**: Verifies caller has admin role in profiles table
- **Error**: Raises exception if caller is not admin

### Performance

- Uses aggregation queries with GROUP BY
- Leverages indexes on payment_method and completion dates
- Expected execution time: < 1000ms for 30-day range
- Optimized with UNION ALL for combining service types

### Usage Examples

#### TypeScript/JavaScript (Supabase Client)

```typescript
// Get last 30 days payment stats (default)
const { data, error } = await supabase.rpc("get_admin_payment_stats", {});

// Get payment stats for specific date range
const { data, error } = await supabase.rpc("get_admin_payment_stats", {
  p_date_from: "2024-01-01T00:00:00Z",
  p_date_to: "2024-01-31T23:59:59Z",
});

// Get this week's payment stats
const startOfWeek = new Date();
startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
startOfWeek.setHours(0, 0, 0, 0);

const { data, error } = await supabase.rpc("get_admin_payment_stats", {
  p_date_from: startOfWeek.toISOString(),
  p_date_to: new Date().toISOString(),
});
```

#### Vue Composable Example

```typescript
// composables/useAdminPayments.ts
import { ref } from "vue";
import { supabase } from "@/lib/supabase";

export function useAdminPayments() {
  const paymentStats = ref(null);
  const loading = ref(false);
  const error = ref(null);

  async function fetchPaymentStats(dateFrom, dateTo) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_admin_payment_stats",
        {
          p_date_from: dateFrom,
          p_date_to: dateTo,
        },
      );

      if (rpcError) throw rpcError;
      paymentStats.value = data;
    } catch (e) {
      error.value = e.message;
      console.error("Error fetching payment stats:", e);
    } finally {
      loading.value = false;
    }
  }

  return {
    paymentStats,
    loading,
    error,
    fetchPaymentStats,
  };
}
```

#### Analytics Dashboard Example

```vue
<template>
  <div class="payment-analytics">
    <div class="stats-grid">
      <StatCard
        title="Total Transactions"
        :value="paymentStats?.total_transactions"
        icon="📊"
      />
      <StatCard
        title="Total Amount"
        :value="formatCurrency(paymentStats?.total_amount)"
        icon="💵"
      />
      <StatCard
        title="Average Transaction"
        :value="formatCurrency(paymentStats?.average_transaction)"
        icon="📈"
      />
    </div>

    <div class="charts-grid">
      <BarChart
        title="Payment Methods"
        :data="paymentMethodChartData"
        :labels="paymentMethodLabels"
      />

      <LineChart
        title="Daily Transaction Trends"
        :data="dailyTrendData"
        :labels="dailyTrendLabels"
      />

      <PieChart
        title="Service Type Distribution"
        :data="serviceDistributionData"
        :labels="['Ride', 'Delivery', 'Shopping']"
      />
    </div>

    <div class="payment-methods-table">
      <h3>Payment Method Details</h3>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Transactions</th>
            <th>Total Amount</th>
            <th>Average</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="method in paymentStats?.payment_methods"
            :key="method.payment_method"
          >
            <td>{{ method.payment_method }}</td>
            <td>{{ method.transaction_count }}</td>
            <td>{{ formatCurrency(method.total_amount) }}</td>
            <td>{{ formatCurrency(method.average_amount) }}</td>
            <td>{{ method.percentage }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useAdminPayments } from "@/composables/useAdminPayments";

const { paymentStats, fetchPaymentStats } = useAdminPayments();

onMounted(() => {
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = new Date();
  fetchPaymentStats(dateFrom.toISOString(), dateTo.toISOString());
});

const paymentMethodChartData = computed(() => {
  return paymentStats.value?.payment_methods?.map((m) => m.total_amount) || [];
});

const paymentMethodLabels = computed(() => {
  return (
    paymentStats.value?.payment_methods?.map((m) => m.payment_method) || []
  );
});

const dailyTrendData = computed(() => {
  return paymentStats.value?.daily_trends?.map((d) => d.total_amount) || [];
});

const dailyTrendLabels = computed(() => {
  return paymentStats.value?.daily_trends?.map((d) => d.date) || [];
});

const serviceDistributionData = computed(() => {
  if (!paymentStats.value?.service_breakdown) return [];
  const breakdown = paymentStats.value.service_breakdown;
  return [
    breakdown.ride.amount,
    breakdown.delivery.amount,
    breakdown.shopping.amount,
  ];
});

function formatCurrency(value) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(value || 0);
}
</script>
```

### Payment Method Categories

The function categorizes payment methods as follows:

- **cash**: Cash payments
- **wallet**: Wallet/digital wallet payments
- **card**: Credit card, debit card, or generic card payments
- **promptpay**: PromptPay payments
- **mobile_banking**: Mobile banking payments
- **other**: Any other payment methods or NULL values

### Service Breakdown Calculation

Each service type includes:

- **count**: Number of completed transactions
- **amount**: Total revenue from that service
- **average**: Average transaction amount (amount / count)

### Daily Trends

Daily trends are aggregated by date and include:

- Transaction count for the day
- Total amount for the day
- Average transaction amount for the day

Sorted chronologically from oldest to newest.

### Error Handling

```typescript
const { data, error } = await supabase.rpc("get_admin_payment_stats", {
  p_date_from: dateFrom,
  p_date_to: dateTo,
});

if (error) {
  if (error.message.includes("Access denied")) {
    console.error("Admin privileges required");
  } else {
    console.error("Database error:", error.message);
  }
} else {
  console.log("Total Transactions:", data.total_transactions);
  console.log("Total Amount:", data.total_amount);
  console.log("Payment Methods:", data.payment_methods);
}
```

---

## Performance Indexes (Priority 3)

The Priority 3 migration creates the following indexes for optimal analytics performance:

### Ride Requests Indexes

```sql
CREATE INDEX CONCURRENTLY idx_ride_requests_completed_at
  ON ride_requests(completed_at) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY idx_ride_requests_payment_method
  ON ride_requests(payment_method) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY idx_ride_requests_status_completed
  ON ride_requests(status, completed_at) WHERE status = 'completed';
```

### Delivery Requests Indexes

```sql
CREATE INDEX CONCURRENTLY idx_delivery_requests_delivered_at
  ON delivery_requests(delivered_at) WHERE status = 'delivered';
CREATE INDEX CONCURRENTLY idx_delivery_requests_payment_method
  ON delivery_requests(payment_method) WHERE status = 'delivered';
CREATE INDEX CONCURRENTLY idx_delivery_requests_status_delivered
  ON delivery_requests(status, delivered_at) WHERE status = 'delivered';
```

### Shopping Requests Indexes

```sql
CREATE INDEX CONCURRENTLY idx_shopping_requests_completed_at
  ON shopping_requests(completed_at) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY idx_shopping_requests_payment_method
  ON shopping_requests(payment_method) WHERE status = 'completed';
CREATE INDEX CONCURRENTLY idx_shopping_requests_status_completed
  ON shopping_requests(status, completed_at) WHERE status = 'completed';
```

These partial indexes significantly improve query performance by:

- Indexing only completed/delivered orders (reducing index size)
- Supporting date range queries on completion dates
- Supporting payment method aggregations
- Enabling efficient filtering by status and date

---

## Migration Information (Priority 3)

**Migration File**: `299_admin_priority3_rpc_functions.sql`

**Created**: 2026-01-16

**Requirements**: 4.1, 4.2

**Dependencies**:

- ride_requests table
- delivery_requests table
- shopping_requests table
- profiles table (for admin role check)

**Functions Created**:

1. `get_admin_revenue_stats(TIMESTAMPTZ, TIMESTAMPTZ, TEXT)` - Revenue statistics
2. `get_admin_payment_stats(TIMESTAMPTZ, TIMESTAMPTZ)` - Payment analytics

**Rollback**:

```sql
DROP FUNCTION IF EXISTS get_admin_revenue_stats CASCADE;
DROP FUNCTION IF EXISTS get_admin_payment_stats CASCADE;
```

---

## Migration 316 & 317: Topup Request System

### Migration 316: Topup Requests System

**Migration File**: `316_topup_requests_system.sql`

**Created**: 2026-01-22

**Purpose**: Customer topup request management system with payment proof

**Tables Created**:

- `topup_requests` - Customer topup requests with payment proof and status tracking

**Functions Created**:

1. `get_topup_requests_admin(TEXT, INT, INT)` - Get customer topup requests
2. `count_topup_requests_admin(TEXT)` - Count topup requests for pagination
3. `approve_topup_request(UUID, UUID, TEXT)` - Approve topup and credit wallet
4. `reject_topup_request(UUID, UUID, TEXT)` - Reject topup request

**Key Features**:

- Payment proof upload support
- Multiple payment methods (bank_transfer, promptpay, mobile_banking, cash, other)
- Admin approval workflow
- Automatic wallet crediting on approval
- Wallet transaction logging
- RLS policies for customer and admin access

### Migration 317: Function Conflict Resolution

**Migration File**: `317_fix_topup_function_conflict.sql`

**Created**: 2026-01-22

**Issue**: PGRST203 - Multiple functions with similar signatures causing conflict

**Purpose**: Resolve function overloading conflicts by removing old topup functions from migrations 187 and 198

**Functions Dropped**:

- `admin_get_topup_requests(VARCHAR, INTEGER, INTEGER)` - Old function with different signature
- `admin_get_topup_requests_enhanced(...)` - Multiple overloaded versions
- `admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE)` - Old stats function
- `admin_approve_topup_request(UUID, TEXT)` - Old approval function (2 params)
- `admin_approve_topup_request(UUID, TEXT, UUID)` - Old approval function (3 params)
- `admin_reject_topup_request(UUID, TEXT)` - Old rejection function (2 params)
- `admin_reject_topup_request(UUID, TEXT, UUID)` - Old rejection function (3 params)

### Migration 318: Comprehensive Topup Function Cleanup

**Migration File**: `318_verify_and_fix_topup_conflicts.sql`

**Created**: 2026-01-22

**Issue**: PGRST203 - Function overloading conflicts still exist in production after migration 317

**Purpose**: Comprehensive cleanup of ALL old topup function variations and verification of new standardized functions

**What This Migration Does**:

1. **Lists Existing Functions** - Checks all topup-related functions before cleanup
2. **Drops ALL Old Variations** - Removes every possible old function signature including:
   - All `admin_get_topup_requests` variations (VARCHAR, character varying, TEXT, text)
   - All `admin_get_topup_requests_enhanced` variations (multiple signatures)
   - All `admin_get_topup_stats` variations
   - All `admin_approve_topup_request` variations (2 and 3 params)
   - All `admin_reject_topup_request` variations (2 and 3 params)
   - All `admin_count_topup_requests` variations
   - Generic `get_topup_requests` and `count_topup_requests` functions
3. **Verifies New Functions** - Confirms migration 316 functions exist with correct signatures
4. **Checks for Conflicts** - Detects any remaining function conflicts and raises exception if found
5. **Lists Final State** - Shows all remaining topup functions after cleanup

**Functions Dropped** (Comprehensive List):

```sql
-- Old admin_get_topup_requests variations
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(character varying, integer, integer);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(text, integer, integer);

-- Old admin_get_topup_requests_enhanced variations
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(character varying, integer, text);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(text, integer, text);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, INTEGER, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(character varying, integer, integer, text, text, text);

-- Old admin_get_topup_stats variations
DROP FUNCTION IF EXISTS public.admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS public.admin_get_topup_stats(timestamptz, timestamptz);

-- Old admin_approve_topup_request variations
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(uuid, text);
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(uuid, text, uuid);

-- Old admin_reject_topup_request variations
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(uuid, text);
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(uuid, text, uuid);

-- Old admin_count_topup_requests variations
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(VARCHAR);
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(character varying);
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(TEXT);
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(text);

-- Generic functions that might conflict
DROP FUNCTION IF EXISTS public.get_topup_requests(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_topup_requests(text, integer, integer);
DROP FUNCTION IF EXISTS public.count_topup_requests(TEXT);
DROP FUNCTION IF EXISTS public.count_topup_requests(text);
```

**Functions Verified** (from migration 316):

- `get_topup_requests_admin(TEXT, INT, INT)` - New standardized function
- `count_topup_requests_admin(TEXT)` - New count function
- `approve_topup_request(UUID, UUID, TEXT)` - New approval function
- `reject_topup_request(UUID, UUID, TEXT)` - New rejection function

**Why These Migrations Were Needed**:

PostgreSQL's function overloading can cause conflicts when multiple functions have similar signatures. The old topup functions from earlier migrations had inconsistent naming and parameter patterns:

- Mixed naming conventions (`admin_get_topup_requests` vs `get_topup_requests_admin`)
- Inconsistent parameter types (VARCHAR vs TEXT vs character varying, different parameter orders)
- Multiple overloaded versions causing ambiguity
- Case-sensitive type aliases (UUID vs uuid, TEXT vs text)

**Migration 317** attempted to clean up conflicts but some variations remained in production.

**Migration 318** provides comprehensive cleanup by:

1. Listing all existing topup functions for visibility
2. Dropping ALL possible variations (uppercase, lowercase, type aliases)
3. Verifying new standardized functions exist with correct signatures
4. Checking for any remaining conflicts and raising exception if found
5. Listing final function state for verification

**Migration Order**:

1. Apply migration 316 first (creates new standardized functions)
2. Apply migration 317 second (removes most old conflicting functions)
3. Apply migration 318 third (comprehensive cleanup of ALL remaining variations)

**Troubleshooting PGRST203 Errors**:

If you encounter `PGRST203` errors about function overloading:

1. Check existing functions: `SELECT proname, pronargs, pg_get_function_arguments(oid) FROM pg_proc WHERE proname LIKE '%topup%';`
2. Look for duplicate function names with same argument count
3. Drop old variations manually if needed
4. Apply migration 318 to ensure comprehensive cleanup
5. Verify only new functions remain: `get_topup_requests_admin`, `count_topup_requests_admin`, `approve_topup_request`, `reject_topup_request`

**Rollback** (if needed):

```sql
-- Migrations 317 and 318 only drop functions, no rollback needed
-- If you need to restore old functions, revert to migration 316 only
-- To verify current state:
SELECT proname, pronargs, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname LIKE '%topup%'
ORDER BY proname, pronargs;
```

**Best Practices Established**:

- Use consistent naming patterns for admin functions (`*_admin` suffix)
- Avoid function overloading when possible
- Use TEXT instead of VARCHAR for consistency
- Document parameter order and types clearly
- Verify new functions before dropping old ones

---

## admin_get_customer_withdrawals()

Retrieves a paginated list of customer withdrawal requests with user details and wallet balance information.

### Function Signature

```sql
admin_get_customer_withdrawals(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (...)
```

### Parameters

| Parameter  | Type | Required | Default | Description                                                       |
| ---------- | ---- | -------- | ------- | ----------------------------------------------------------------- |
| `p_status` | TEXT | No       | NULL    | Filter by status ('pending', 'approved', 'rejected', 'cancelled') |
| `p_limit`  | INT  | No       | 20      | Maximum number of records to return                               |
| `p_offset` | INT  | No       | 0       | Number of records to skip (for pagination)                        |

### Return Columns

| Column                | Type        | Description                                      |
| --------------------- | ----------- | ------------------------------------------------ |
| `id`                  | UUID        | Withdrawal request unique identifier             |
| `user_id`             | UUID        | Customer's user ID                               |
| `user_name`           | TEXT        | Customer's full name or email                    |
| `user_email`          | TEXT        | Customer's email address                         |
| `user_phone`          | TEXT        | Customer's phone number                          |
| `withdrawal_uid`      | TEXT        | Withdrawal unique identifier string              |
| `amount`              | NUMERIC     | Withdrawal amount requested                      |
| `bank_name`           | TEXT        | Bank name                                        |
| `bank_account_number` | TEXT        | Bank account number                              |
| `bank_account_name`   | TEXT        | Bank account holder name                         |
| `status`              | TEXT        | Request status                                   |
| `reason`              | TEXT        | Reason for rejection (NULL if not rejected)      |
| `admin_notes`         | TEXT        | Admin notes on the request                       |
| `processed_by`        | UUID        | Admin who processed the request                  |
| `processed_at`        | TIMESTAMPTZ | When the request was processed (NULL if pending) |
| `completed_at`        | TIMESTAMPTZ | When the request was completed (NULL if pending) |
| `created_at`          | TIMESTAMPTZ | When the request was created                     |
| `wallet_balance`      | NUMERIC     | Customer's current wallet balance                |

### Security

- **SECURITY DEFINER**: Bypasses RLS policies
- **Admin Role Check**: Verifies caller has admin role in users table
- **Error**: Raises exception if caller is not admin

### Performance

- Uses INNER JOIN with users table for customer details
- Prioritizes pending requests in sorting
- Expected execution time: < 300ms

### Usage Examples

#### TypeScript/JavaScript (Supabase Client)

```typescript
// Get all pending withdrawal requests
const { data, error } = await supabase.rpc("admin_get_customer_withdrawals", {
  p_status: "pending",
  p_limit: 20,
  p_offset: 0,
});

// Get all withdrawal requests (any status)
const { data, error } = await supabase.rpc("admin_get_customer_withdrawals", {
  p_status: null,
  p_limit: 50,
  p_offset: 0,
});

// Get completed requests
const { data, error } = await supabase.rpc("admin_get_customer_withdrawals", {
  p_status: "completed",
  p_limit: 20,
  p_offset: 0,
});
```

#### Vue Component Example

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

const withdrawals = ref([]);
const loading = ref(false);

async function loadWithdrawals() {
  loading.value = true;
  try {
    const { data, error } = await supabase.rpc(
      "admin_get_customer_withdrawals",
      {
        p_status: null,
        p_limit: 100,
        p_offset: 0,
      },
    );
    if (error) throw error;
    withdrawals.value = data || [];
  } catch (e) {
    console.error("Load failed:", e);
    alert("ไม่สามารถโหลดข้อมูลได้");
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadWithdrawals());
</script>
```

### Status Values

- `pending` - Awaiting admin approval
- `approved` - Approved by admin
- `completed` - Withdrawal completed and funds transferred
- `rejected` - Rejected by admin
- `cancelled` - Cancelled by customer

---

## Complete Function List

### Priority 1 (Critical - Customer & Provider Management)

1. ✅ `get_admin_customers()` - Customer list with search and filters
2. ✅ `count_admin_customers()` - Customer count for pagination
3. ✅ `get_admin_providers_v2()` - Provider list with status
4. ✅ `count_admin_providers_v2()` - Provider count for pagination

### Priority 2 (Important - Financial Management)

5. ✅ `get_scheduled_rides()` - Scheduled rides for future dates
6. ✅ `count_scheduled_rides()` - Scheduled rides count
7. ✅ `get_provider_withdrawals_admin()` - Provider withdrawal requests
8. ✅ `count_provider_withdrawals_admin()` - Withdrawal requests count
9. ✅ `get_topup_requests_admin(TEXT, INT, INT)` - Customer topup requests (migration 316)
10. ✅ `count_topup_requests_admin(TEXT)` - Topup requests count (migration 316)
11. ✅ `approve_topup_request(UUID, UUID, TEXT)` - Approve topup and credit wallet (migration 316)
12. ✅ `reject_topup_request(UUID, UUID, TEXT)` - Reject topup request (migration 316)
13. ✅ `admin_get_customer_withdrawals(TEXT, INT, INT)` - Customer withdrawal requests

### Priority 3 (Analytics)

13. ✅ `get_admin_revenue_stats()` - Revenue statistics and breakdown
14. ✅ `get_admin_payment_stats()` - Payment analytics and trends

### Existing Functions

15. ✅ `get_admin_orders()` - All orders with filters (migration 295)
16. ✅ `get_active_providers_locations()` - Real-time provider locations (migration 251)
17. ✅ `get_push_analytics()` - Push notification metrics (migration 289)
18. ✅ `get_cron_job_stats()` - Cron job monitoring (migration 278)
19. ✅ `get_provider_heatmap_data()` - Provider location heatmap (migration 279)

---

## Testing

### Unit Tests

Unit tests are available in:

- `src/tests/admin-customers-rpc.unit.test.ts` - Priority 1 functions
- `src/tests/admin-providers-rpc.unit.test.ts` - Priority 1 functions
- `src/tests/admin-priority2-rpc.unit.test.ts` - Priority 2 functions
- `src/tests/admin-priority3-rpc.unit.test.ts` - Priority 3 functions

### Running Tests

```bash
# Run all admin RPC tests
npm run test -- admin-rpc

# Run specific priority tests
npm run test -- admin-priority3-rpc

# Run with coverage
npm run test -- --coverage admin-rpc
```

### Manual Testing

```typescript
// Test revenue stats
const { data, error } = await supabase.rpc("get_admin_revenue_stats", {
  p_date_from: "2024-01-01T00:00:00Z",
  p_date_to: "2024-01-31T23:59:59Z",
  p_service_type: null,
});
console.log("Revenue Stats:", data);

// Test payment stats
const { data: paymentData, error: paymentError } = await supabase.rpc(
  "get_admin_payment_stats",
  {
    p_date_from: "2024-01-01T00:00:00Z",
    p_date_to: "2024-01-31T23:59:59Z",
  },
);
console.log("Payment Stats:", paymentData);
```

---

## Support

For issues or questions:

1. Check migration files in `supabase/migrations/`
2. Review test files in `src/tests/`
3. Verify admin role in profiles table
4. Check Supabase logs for errors
5. Consult this documentation
