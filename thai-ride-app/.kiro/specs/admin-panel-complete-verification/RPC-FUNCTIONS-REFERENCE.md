# Admin RPC Functions - Quick Reference Guide

## Overview

This document provides a quick reference for all 15 admin RPC functions created for the Admin Panel. Each function includes its signature, parameters, return type, and usage examples.

---

## Priority 1: Critical Functions (4)

### 1. get_admin_customers()

**Purpose:** Retrieve customer list with filters, search, and pagination

**Signature:**

```sql
get_admin_customers(
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE
```

**Parameters:**

- `p_search_term` - Search by email, name, or phone (optional)
- `p_status` - Filter by status: 'active', 'suspended', 'banned' (optional)
- `p_limit` - Number of records to return (default: 20)
- `p_offset` - Pagination offset (default: 0)

**Returns:** TABLE with columns:

- `id`, `email`, `full_name`, `phone_number`, `status`
- `wallet_balance`, `total_orders`, `total_spent`, `average_rating`
- `created_at`, `last_order_at`
- `suspension_reason`, `suspended_at`, `suspended_by`

**Usage Examples:**

```sql
-- Get all customers (first 20)
SELECT * FROM get_admin_customers(NULL, NULL, 20, 0);

-- Search for customer by email
SELECT * FROM get_admin_customers('john@example.com', NULL, 20, 0);

-- Get suspended customers
SELECT * FROM get_admin_customers(NULL, 'suspended', 20, 0);

-- Pagination (page 2)
SELECT * FROM get_admin_customers(NULL, NULL, 20, 20);
```

**TypeScript Usage:**

```typescript
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: searchTerm || null,
  p_status: statusFilter || null,
  p_limit: 20,
  p_offset: page * 20,
});
```

---

### 2. count_admin_customers()

**Purpose:** Get total count of customers for pagination

**Signature:**

```sql
count_admin_customers(
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
) RETURNS BIGINT
```

**Parameters:**

- `p_search_term` - Search filter (same as get_admin_customers)
- `p_status` - Status filter (same as get_admin_customers)

**Returns:** BIGINT (total count)

**Usage Examples:**

```sql
-- Count all customers
SELECT count_admin_customers(NULL, NULL);

-- Count suspended customers
SELECT count_admin_customers(NULL, 'suspended');

-- Count customers matching search
SELECT count_admin_customers('john', NULL);
```

**TypeScript Usage:**

```typescript
const { data: count, error } = await supabase.rpc("count_admin_customers", {
  p_search_term: searchTerm || null,
  p_status: statusFilter || null,
});

const totalPages = Math.ceil(count / pageSize);
```

---

### 3. get_admin_providers_v2()

**Purpose:** Retrieve provider list with status, verification info, and pagination

**Signature:**

```sql
get_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE
```

**Parameters:**

- `p_status` - Filter by status: 'pending', 'approved', 'rejected', 'suspended' (optional)
- `p_provider_type` - Filter by type: 'ride', 'delivery', 'shopping', 'all' (optional)
- `p_limit` - Number of records to return (default: 20)
- `p_offset` - Pagination offset (default: 0)

**Returns:** TABLE with columns:

- `id`, `user_id`, `provider_uid`, `email`
- `first_name`, `last_name`, `phone_number`, `provider_type`
- `status`, `is_online`, `is_available`
- `current_lat`, `current_lng`
- `rating`, `total_trips`, `total_earnings`, `wallet_balance`
- `documents_verified`, `verification_notes`
- `created_at`, `approved_at`, `approved_by`, `last_active_at`

**Usage Examples:**

```sql
-- Get all providers
SELECT * FROM get_admin_providers_v2(NULL, NULL, 20, 0);

-- Get pending providers (verification queue)
SELECT * FROM get_admin_providers_v2('pending', NULL, 20, 0);

-- Get approved ride providers
SELECT * FROM get_admin_providers_v2('approved', 'ride', 20, 0);

-- Get online providers
SELECT * FROM get_admin_providers_v2(NULL, NULL, 100, 0)
WHERE is_online = true;
```

**TypeScript Usage:**

```typescript
const { data, error } = await supabase.rpc("get_admin_providers_v2", {
  p_status: statusFilter || null,
  p_provider_type: typeFilter || null,
  p_limit: 20,
  p_offset: page * 20,
});
```

---

### 4. count_admin_providers_v2()

**Purpose:** Get total count of providers for pagination

**Signature:**

```sql
count_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
) RETURNS BIGINT
```

**Parameters:**

- `p_status` - Status filter (same as get_admin_providers_v2)
- `p_provider_type` - Type filter (same as get_admin_providers_v2)

**Returns:** BIGINT (total count)

**Usage Examples:**

```sql
-- Count all providers
SELECT count_admin_providers_v2(NULL, NULL);

-- Count pending providers
SELECT count_admin_providers_v2('pending', NULL);

-- Count approved ride providers
SELECT count_admin_providers_v2('approved', 'ride');
```

---

## Priority 2: Important Functions (6)

### 5. get_scheduled_rides()

**Purpose:** Retrieve scheduled rides for future dates

**Signature:**

```sql
get_scheduled_rides(
  p_date_from TIMESTAMPTZ DEFAULT NOW(),
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE
```

**Parameters:**

- `p_date_from` - Start date for filter (default: NOW())
- `p_date_to` - End date for filter (optional)
- `p_limit` - Number of records to return (default: 20)
- `p_offset` - Pagination offset (default: 0)

**Returns:** TABLE with columns:

- `id`, `tracking_id`, `user_id`
- `customer_name`, `customer_email`, `customer_phone`
- `pickup_address`, `pickup_lat`, `pickup_lng`
- `destination_address`, `destination_lat`, `destination_lng`
- `scheduled_datetime`, `ride_type`, `estimated_fare`
- `notes`, `reminder_sent`, `status`
- `ride_request_id`, `passenger_count`, `special_requests`
- `provider_id`, `provider_name`, `provider_phone`, `provider_rating`
- `created_at`, `updated_at`

**Usage Examples:**

```sql
-- Get all future scheduled rides
SELECT * FROM get_scheduled_rides(NOW(), NULL, 20, 0);

-- Get scheduled rides for next 7 days
SELECT * FROM get_scheduled_rides(
  NOW(),
  NOW() + INTERVAL '7 days',
  50,
  0
);

-- Get scheduled rides for specific date range
SELECT * FROM get_scheduled_rides(
  '2026-01-20 00:00:00+00',
  '2026-01-27 23:59:59+00',
  100,
  0
);
```

**TypeScript Usage:**

```typescript
const { data, error } = await supabase.rpc("get_scheduled_rides", {
  p_date_from: new Date().toISOString(),
  p_date_to: endDate?.toISOString() || null,
  p_limit: 20,
  p_offset: page * 20,
});
```

---

### 6. count_scheduled_rides()

**Purpose:** Get total count of scheduled rides for pagination

**Signature:**

```sql
count_scheduled_rides(
  p_date_from TIMESTAMPTZ DEFAULT NOW(),
  p_date_to TIMESTAMPTZ DEFAULT NULL
) RETURNS BIGINT
```

---

### 7. get_provider_withdrawals_admin()

**Purpose:** Retrieve provider withdrawal requests with bank details

**Signature:**

```sql
get_provider_withdrawals_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE
```

**Parameters:**

- `p_status` - Filter by status: 'pending', 'approved', 'rejected', 'completed' (optional)
- `p_limit` - Number of records to return (default: 20)
- `p_offset` - Pagination offset (default: 0)

**Returns:** TABLE with columns:

- `id`, `provider_id`, `provider_name`, `provider_phone`, `provider_email`
- `amount`, `bank_account`, `bank_name`, `account_holder`
- `status`, `requested_at`, `processed_at`, `processed_by`
- `rejection_reason`, `transaction_id`
- `wallet_balance`, `total_earnings`

**Usage Examples:**

```sql
-- Get all withdrawal requests
SELECT * FROM get_provider_withdrawals_admin(NULL, 20, 0);

-- Get pending withdrawals (needs approval)
SELECT * FROM get_provider_withdrawals_admin('pending', 50, 0);

-- Get approved withdrawals
SELECT * FROM get_provider_withdrawals_admin('approved', 20, 0);
```

**TypeScript Usage:**

```typescript
const { data, error } = await supabase.rpc("get_provider_withdrawals_admin", {
  p_status: statusFilter || null,
  p_limit: 20,
  p_offset: page * 20,
});
```

---

### 8. count_provider_withdrawals_admin()

**Purpose:** Get total count of withdrawal requests for pagination

---

### 9. get_topup_requests_admin()

**Purpose:** Retrieve customer topup requests with payment proof

**Signature:**

```sql
get_topup_requests_admin(
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE
```

**Parameters:**

- `p_status` - Filter by status: 'pending', 'approved', 'rejected' (optional)
- `p_limit` - Number of records to return (default: 20)
- `p_offset` - Pagination offset (default: 0)

**Returns:** TABLE with columns:

- `id`, `user_id`, `user_name`, `user_email`, `user_phone`
- `amount`, `payment_method`, `payment_reference`, `payment_proof_url`
- `status`, `requested_at`, `processed_at`, `processed_by`
- `rejection_reason`, `wallet_balance`

**Usage Examples:**

```sql
-- Get all topup requests
SELECT * FROM get_topup_requests_admin(NULL, 20, 0);

-- Get pending topups (needs approval)
SELECT * FROM get_topup_requests_admin('pending', 50, 0);

-- Get rejected topups
SELECT * FROM get_topup_requests_admin('rejected', 20, 0);
```

---

### 10. count_topup_requests_admin()

**Purpose:** Get total count of topup requests for pagination

---

## Priority 3: Analytics Functions (2)

### 11. get_admin_revenue_stats()

**Purpose:** Calculate revenue statistics with date ranges and service type breakdown

**Signature:**

```sql
get_admin_revenue_stats(
  p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMPTZ DEFAULT NOW(),
  p_service_type TEXT DEFAULT NULL
) RETURNS JSON
```

**Parameters:**

- `p_date_from` - Start date for analysis (default: 30 days ago)
- `p_date_to` - End date for analysis (default: now)
- `p_service_type` - Filter by service: 'ride', 'delivery', 'shopping' (optional)

**Returns:** JSON with structure:

```json
{
  "total_revenue": 150000.0,
  "ride_revenue": 80000.0,
  "delivery_revenue": 45000.0,
  "shopping_revenue": 25000.0,
  "platform_fee": 22500.0,
  "provider_earnings": 127500.0,
  "daily_breakdown": [
    {
      "date": "2026-01-15",
      "revenue": 5000.0,
      "orders": 45,
      "ride_revenue": 3000.0,
      "delivery_revenue": 1500.0,
      "shopping_revenue": 500.0
    }
  ],
  "payment_method_breakdown": {
    "cash": 60000.0,
    "wallet": 50000.0,
    "card": 30000.0,
    "promptpay": 8000.0,
    "mobile_banking": 2000.0,
    "other": 0.0
  },
  "date_from": "2025-12-16T00:00:00Z",
  "date_to": "2026-01-16T00:00:00Z",
  "service_type_filter": null
}
```

**Usage Examples:**

```sql
-- Get revenue for last 30 days
SELECT get_admin_revenue_stats(
  NOW() - INTERVAL '30 days',
  NOW(),
  NULL
);

-- Get ride revenue only for last 7 days
SELECT get_admin_revenue_stats(
  NOW() - INTERVAL '7 days',
  NOW(),
  'ride'
);

-- Get revenue for specific month
SELECT get_admin_revenue_stats(
  '2026-01-01 00:00:00+00',
  '2026-01-31 23:59:59+00',
  NULL
);
```

**TypeScript Usage:**

```typescript
const { data, error } = await supabase.rpc("get_admin_revenue_stats", {
  p_date_from: startDate.toISOString(),
  p_date_to: endDate.toISOString(),
  p_service_type: serviceFilter || null,
});

// Access data
const totalRevenue = data.total_revenue;
const dailyData = data.daily_breakdown;
const paymentBreakdown = data.payment_method_breakdown;
```

---

### 12. get_admin_payment_stats()

**Purpose:** Calculate payment statistics and trends

**Signature:**

```sql
get_admin_payment_stats(
  p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_date_to TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON
```

**Parameters:**

- `p_date_from` - Start date for analysis (default: 30 days ago)
- `p_date_to` - End date for analysis (default: now)

**Returns:** JSON with structure:

```json
{
  "total_transactions": 1250,
  "total_amount": 150000.0,
  "average_transaction": 120.0,
  "payment_methods": [
    {
      "payment_method": "cash",
      "transaction_count": 500,
      "total_amount": 60000.0,
      "average_amount": 120.0,
      "percentage": 40.0
    },
    {
      "payment_method": "wallet",
      "transaction_count": 450,
      "total_amount": 50000.0,
      "average_amount": 111.11,
      "percentage": 33.33
    }
  ],
  "daily_trends": [
    {
      "date": "2026-01-15",
      "transaction_count": 45,
      "total_amount": 5400.0,
      "average_amount": 120.0
    }
  ],
  "service_breakdown": {
    "ride": {
      "count": 700,
      "amount": 80000.0,
      "average": 114.29
    },
    "delivery": {
      "count": 350,
      "amount": 45000.0,
      "average": 128.57
    },
    "shopping": {
      "count": 200,
      "amount": 25000.0,
      "average": 125.0
    }
  },
  "date_from": "2025-12-16T00:00:00Z",
  "date_to": "2026-01-16T00:00:00Z"
}
```

**Usage Examples:**

```sql
-- Get payment stats for last 30 days
SELECT get_admin_payment_stats(
  NOW() - INTERVAL '30 days',
  NOW()
);

-- Get payment stats for last 7 days
SELECT get_admin_payment_stats(
  NOW() - INTERVAL '7 days',
  NOW()
);

-- Get payment stats for specific month
SELECT get_admin_payment_stats(
  '2026-01-01 00:00:00+00',
  '2026-01-31 23:59:59+00'
);
```

---

## Existing Functions (3)

### 13. get_admin_dashboard_stats()

**Purpose:** Get overall system statistics for dashboard

**Signature:**

```sql
get_admin_dashboard_stats() RETURNS JSON
```

**Returns:** JSON with system-wide statistics

**Usage:**

```sql
SELECT get_admin_dashboard_stats();
```

---

### 14. get_admin_orders()

**Purpose:** Retrieve all orders across service types with filters

**Signature:**

```sql
get_admin_orders(
  p_service_type TEXT,
  p_status TEXT,
  p_limit INT,
  p_offset INT,
  p_search TEXT,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
) RETURNS TABLE
```

**Usage:**

```sql
SELECT * FROM get_admin_orders(NULL, NULL, 20, 0, NULL, NULL, NULL);
```

---

### 15. get_active_providers_locations()

**Purpose:** Get real-time provider locations for map display

**Signature:**

```sql
get_active_providers_locations() RETURNS TABLE
```

**Usage:**

```sql
SELECT * FROM get_active_providers_locations();
```

---

## Common Patterns

### Pagination Pattern

```typescript
// Fetch data with pagination
const pageSize = 20;
const page = 0;

const { data: items, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: null,
  p_status: null,
  p_limit: pageSize,
  p_offset: page * pageSize,
});

// Get total count
const { data: totalCount } = await supabase.rpc("count_admin_customers", {
  p_search_term: null,
  p_status: null,
});

const totalPages = Math.ceil(totalCount / pageSize);
```

### Search and Filter Pattern

```typescript
// Search with filters
const { data, error } = await supabase.rpc("get_admin_customers", {
  p_search_term: searchQuery || null, // Search by email, name, phone
  p_status: statusFilter || null, // Filter by status
  p_limit: 20,
  p_offset: 0,
});
```

### Date Range Pattern

```typescript
// Get data for date range
const startDate = new Date("2026-01-01");
const endDate = new Date("2026-01-31");

const { data, error } = await supabase.rpc("get_admin_revenue_stats", {
  p_date_from: startDate.toISOString(),
  p_date_to: endDate.toISOString(),
  p_service_type: null,
});
```

---

## Security Notes

All functions:

- ✅ Use `SECURITY DEFINER` to bypass RLS
- ✅ Check admin role before executing
- ✅ Use SELECT wrapper pattern for `auth.uid()` (performance)
- ✅ Follow dual-role pattern for provider queries
- ✅ Include proper error handling

**Admin Role Check Pattern:**

```sql
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT (SELECT auth.uid()) INTO v_admin_id;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = v_admin_id
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Function logic here
END;
```

---

## Performance Notes

All functions include:

- ✅ Proper indexes on frequently queried columns
- ✅ LIMIT and OFFSET for pagination
- ✅ Efficient JOIN patterns
- ✅ Aggregation optimization
- ✅ Partial indexes where appropriate

**Expected Performance:**

- Simple queries: < 50ms
- Complex aggregations: < 200ms
- Large dataset queries: < 500ms

---

## Error Handling

All functions will raise exceptions for:

- ❌ Non-admin users: "Access denied. Admin privileges required."
- ❌ Invalid parameters: PostgreSQL type errors
- ❌ Database errors: Standard PostgreSQL errors

**TypeScript Error Handling:**

```typescript
const { data, error } = await supabase.rpc("get_admin_customers", params);

if (error) {
  if (error.message.includes("Access denied")) {
    // Redirect to unauthorized page
    router.push("/unauthorized");
  } else {
    // Show error toast
    toast.error("Failed to load customers: " + error.message);
  }
}
```

---

## Testing Checklist

For each function, verify:

- [ ] Function exists in database
- [ ] SECURITY DEFINER is set
- [ ] Admin role check works (non-admin gets error)
- [ ] Returns expected data structure
- [ ] Pagination works correctly
- [ ] Filters work as expected
- [ ] Search works (if applicable)
- [ ] Performance is acceptable (< 500ms)
- [ ] TypeScript types are correct

---

**Last Updated:** 2026-01-16
**Total Functions:** 15 (4 Priority 1, 6 Priority 2, 2 Priority 3, 3 Existing)
**Status:** Ready for testing when Supabase is available
