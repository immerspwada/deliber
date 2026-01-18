# Admin RPC Functions Documentation

## Overview

This document describes the RPC (Remote Procedure Call) functions available for the Admin Panel. All functions use `SECURITY DEFINER` to bypass RLS policies and include admin role verification for security.

## Table of Contents

1. [get_admin_customers()](#get_admin_customers)
2. [count_admin_customers()](#count_admin_customers)
3. [get_admin_providers_v2()](#get_admin_providers_v2)
4. [count_admin_providers_v2()](#count_admin_providers_v2)

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

## Complete Function List

### Priority 1 (Critical)

1. ✅ `get_admin_customers()` - Customer list with search and filters
2. ✅ `count_admin_customers()` - Customer count for pagination
3. ✅ `get_admin_providers_v2()` - Provider list with status
4. ✅ `count_admin_providers_v2()` - Provider count for pagination

### Priority 2 (Important)

5. ✅ `get_scheduled_rides()` - Scheduled rides for future dates
6. ✅ `count_scheduled_rides()` - Scheduled rides count
7. ✅ `get_provider_withdrawals_admin()` - Provider withdrawal requests
8. ✅ `count_provider_withdrawals_admin()` - Withdrawal requests count
9. ✅ `get_topup_requests_admin()` - Customer topup requests
10. ✅ `count_topup_requests_admin()` - Topup requests count

### Priority 3 (Analytics)

11. ✅ `get_admin_revenue_stats()` - Revenue statistics and breakdown
12. ✅ `get_admin_payment_stats()` - Payment analytics and trends

### Existing Functions

13. ✅ `get_admin_orders()` - All orders with filters (migration 295)
14. ✅ `get_active_providers_locations()` - Real-time provider locations (migration 251)
15. ✅ `get_push_analytics()` - Push notification metrics (migration 289)
16. ✅ `get_cron_job_stats()` - Cron job monitoring (migration 278)
17. ✅ `get_provider_heatmap_data()` - Provider location heatmap (migration 279)

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
