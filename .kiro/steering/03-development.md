# Development Guidelines - Thai Ride App

## 🔧 Development Workflow

### Standard Feature Development Flow

```
1. Design Phase
   ├── Create Role-Based Behavior Matrix
   ├── Define Status Flow
   └── Identify affected tables/composables

2. Database Phase
   ├── Create migration file
   ├── Define RLS policies
   ├── Execute via MCP Supabase
   └── Verify execution success

3. Backend Phase
   ├── Create/update database functions
   ├── Add triggers if needed
   └── Test RLS policies

4. Frontend Phase
   ├── Create/update composables
   ├── Create Customer views
   ├── Create Provider views
   ├── Create Admin views
   └── Add realtime subscriptions

5. Integration Phase
   ├── Add notifications
   ├── Test cross-role sync
   └── Verify all roles work

6. Verification Phase
   ├── Test as Customer
   ├── Test as Provider
   ├── Test as Admin
   └── Test edge cases
```

---

## 📝 Coding Standards

### TypeScript Standards

```typescript
// ✅ Use strict typing
interface ServiceRequest {
  id: string;
  user_id: string;
  status: RequestStatus;
  created_at: string;
}

type RequestStatus =
  | "pending"
  | "matched"
  | "in_progress"
  | "completed"
  | "cancelled";

// ✅ Use const assertions for enums
const STATUS = {
  PENDING: "pending",
  MATCHED: "matched",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// ✅ Use generics for reusable functions
async function fetchData<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;
  return data as T[];
}
```

### Vue Component Standards

```vue
<script setup lang="ts">
/**
 * Feature: F## - Feature Name
 * @description Component description
 */

// 1. Imports
import { ref, computed, onMounted } from "vue";
import { useFeature } from "@/composables/useFeature";

// 2. Props & Emits
const props = defineProps<{
  id: string;
  title?: string;
}>();

const emit = defineEmits<{
  (e: "update", value: string): void;
  (e: "close"): void;
}>();

// 3. Composables
const { data, loading, fetchData } = useFeature();

// 4. State
const localState = ref("");

// 5. Computed
const computedValue = computed(() => data.value?.length ?? 0);

// 6. Methods
function handleAction() {
  emit("update", localState.value);
}

// 7. Lifecycle
onMounted(() => {
  fetchData(props.id);
});
</script>

<template>
  <!-- Template content -->
</template>

<style scoped>
/* Scoped styles */
</style>
```

### Composable Standards

```typescript
/**
 * Feature: F## - Feature Name
 * Tables: table1, table2
 * Migration: XXX_feature_name.sql
 */
export function useFeatureName() {
  // 1. Dependencies
  const supabase = useSupabaseClient();
  const { user } = useAuth();

  // 2. State
  const data = ref<FeatureType[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 3. Computed
  const isEmpty = computed(() => data.value.length === 0);
  const sortedData = computed(() =>
    [...data.value].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  );

  // 4. Core Methods
  async function fetchData() {
    loading.value = true;
    error.value = null;
    try {
      const { data: result, error: err } = await supabase
        .from("table_name")
        .select("*")
        .eq("user_id", user.value?.id);

      if (err) throw err;
      data.value = result ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      console.error("[useFeatureName] fetchData error:", err);
    } finally {
      loading.value = false;
    }
  }

  async function createItem(input: CreateInput): Promise<boolean> {
    try {
      const { error: err } = await supabase.from("table_name").insert(input);

      if (err) throw err;
      await fetchData(); // Refresh data
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Unknown error";
      return false;
    }
  }

  // 5. Realtime Subscription
  function setupRealtimeSubscription() {
    const channel = supabase
      .channel("feature-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_name",
          filter: `user_id=eq.${user.value?.id}`,
        },
        (payload) => {
          handleRealtimeChange(payload);
        }
      )
      .subscribe();

    return () => channel.unsubscribe();
  }

  // 6. Return
  return {
    // State
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    // Computed
    isEmpty,
    sortedData,
    // Methods
    fetchData,
    createItem,
    setupRealtimeSubscription,
  };
}
```

---

## 🗄️ Database Development

### Migration File Template

```sql
-- ============================================
-- Migration: XXX_feature_name.sql
-- Feature: F## - Feature Name
-- Date: YYYY-MM-DD
-- ============================================
-- Description: What this migration does
-- Tables: table1, table2
-- RLS: Yes
-- Realtime: Yes
-- ============================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS feature_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_feature_table_user_id
  ON feature_table(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_table_status
  ON feature_table(status);

-- 3. Enable RLS
ALTER TABLE feature_table ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Admin: Full access
CREATE POLICY "admin_full_access" ON feature_table
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Customer: Own data only
CREATE POLICY "customer_own_data" ON feature_table
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE feature_table;

-- 6. Create Functions
CREATE OR REPLACE FUNCTION update_feature_status(
  p_id UUID,
  p_status TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE feature_table
  SET status = p_status, updated_at = NOW()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create Triggers
CREATE OR REPLACE FUNCTION feature_table_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feature_table_updated_at
  BEFORE UPDATE ON feature_table
  FOR EACH ROW
  EXECUTE FUNCTION feature_table_updated_at();
```

### Migration Execution (MANDATORY)

```typescript
// After creating migration file, MUST execute via MCP:

// Step 1: Activate Supabase power
kiroPowers({ action: "activate", powerName: "supabase-hosted" });

// Step 2: Execute migration
kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    sql: `-- Migration content here`,
  },
});

// Step 3: Verify success
// Check for errors in response
// If error, fix and re-execute
```

---

## 🎨 UI Development

### Component Structure

```
src/components/
├── customer/           # Customer-specific components
│   ├── WelcomeHeader.vue
│   ├── ServiceCard.vue
│   └── ActiveOrderCard.vue
│
├── provider/           # Provider-specific components
│   ├── OnlineToggle.vue
│   ├── JobCard.vue
│   └── EarningsCard.vue
│
├── shared/             # Shared components
│   ├── SkeletonLoader.vue
│   ├── EmptyState.vue
│   └── FormInput.vue
│
└── admin/              # Admin components (legacy)
    ├── AdminTable.vue
    └── AdminCard.vue
```

### Styling Guidelines (MUNEEF Design)

```css
/* Color Variables */
:root {
  --primary: #00a86b;
  --primary-hover: #008f5b;
  --primary-light: #e8f5ef;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #999999;
  --border: #e8e8e8;
  --background: #ffffff;
  --background-secondary: #f5f5f5;
  --error: #e53935;
  --warning: #f5a623;
}

/* Button Styles */
.btn-primary {
  @apply bg-[#00A86B] text-white rounded-[14px] px-6 py-4 font-semibold;
  @apply hover:bg-[#008F5B] transition-colors;
  @apply shadow-[0_4px_12px_rgba(0,168,107,0.3)];
}

/* Card Styles */
.card {
  @apply bg-white rounded-[16px] p-4;
  @apply border border-[#F0F0F0];
}

/* Input Styles */
.input {
  @apply border-2 border-[#E8E8E8] rounded-[12px] px-4 py-3;
  @apply focus:border-[#00A86B] focus:outline-none;
  @apply placeholder:text-[#999999];
}
```

### Icon Guidelines

```vue
<!-- ❌ WRONG: Using Emoji -->
<span>🚗</span>

<!-- ✅ CORRECT: Using SVG -->
<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <path d="..." stroke-width="2" stroke-linecap="round"/>
</svg>

<!-- ✅ CORRECT: Using Icon Component -->
<IconCar class="w-6 h-6 text-gray-600" />
```

---

## 🧪 Testing Guidelines

### Test Categories

```
1. Unit Tests
   - Composable logic
   - Utility functions
   - State management

2. Integration Tests
   - Cross-role flows
   - Realtime sync
   - Database operations

3. Property-Based Tests
   - State transitions
   - Data validation
   - Edge cases
```

### Test File Structure

```typescript
// src/tests/feature-name.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useFeatureName } from "@/composables/useFeatureName";

describe("useFeatureName", () => {
  beforeEach(() => {
    // Setup
  });

  describe("fetchData", () => {
    it("should fetch data successfully", async () => {
      // Test implementation
    });

    it("should handle errors gracefully", async () => {
      // Test implementation
    });
  });

  describe("createItem", () => {
    it("should create item and refresh data", async () => {
      // Test implementation
    });
  });
});
```

### Cross-Role Test Template

```typescript
// src/tests/cross-role.integration.test.ts
describe("Cross-Role Integration", () => {
  describe("Service Request Flow", () => {
    it("Customer creates → Provider receives → Admin sees", async () => {
      // 1. Customer creates request
      // 2. Verify Provider can see it
      // 3. Verify Admin can see it
    });

    it("Provider updates → Customer sees → Admin sees", async () => {
      // 1. Provider updates status
      // 2. Verify Customer receives update
      // 3. Verify Admin sees update
    });
  });
});
```

---

## 🔍 Error Handling

### Standard Error Pattern

```typescript
// Composable error handling
async function performAction(): Promise<Result<Data>> {
  try {
    const { data, error } = await supabase.from("table").select("*");

    if (error) {
      // Log for debugging
      console.error("[performAction] Supabase error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    // Unexpected errors
    console.error("[performAction] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Result type
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

### User-Facing Error Messages

```typescript
// Error message mapping
const ERROR_MESSAGES: Record<string, string> = {
  PGRST116: "ไม่พบข้อมูลที่ต้องการ",
  PGRST301: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้",
  "23505": "ข้อมูลนี้มีอยู่แล้วในระบบ",
  default: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as any).code;
    return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.default;
  }
  return ERROR_MESSAGES.default;
}
```

---

## 📊 Performance Guidelines

### Query Optimization

```typescript
// ❌ WRONG: Fetching all columns
const { data } = await supabase.from("users").select("*");

// ✅ CORRECT: Select only needed columns
const { data } = await supabase
  .from("users")
  .select("id, first_name, last_name, member_uid");

// ❌ WRONG: Multiple queries
const users = await supabase.from("users").select("*");
const providers = await supabase.from("service_providers").select("*");

// ✅ CORRECT: Join in single query
const { data } = await supabase.from("users").select(`
    id, first_name, last_name,
    service_providers (id, provider_uid, status)
  `);
```

### Component Optimization

```vue
<script setup lang="ts">
// ✅ Use shallowRef for large arrays
const items = shallowRef<Item[]>([]);

// ✅ Use computed for derived state
const filteredItems = computed(() =>
  items.value.filter((item) => item.status === "active")
);

// ✅ Debounce search input
const searchQuery = ref("");
const debouncedSearch = useDebounceFn((query: string) => {
  performSearch(query);
}, 300);

watch(searchQuery, debouncedSearch);
</script>

<template>
  <!-- ✅ Use v-once for static content -->
  <header v-once>
    <h1>Static Title</h1>
  </header>

  <!-- ✅ Use v-memo for expensive renders -->
  <div v-for="item in items" :key="item.id" v-memo="[item.id, item.status]">
    {{ item.name }}
  </div>
</template>
```

---

## 📦 Code Organization

### Import Order

```typescript
// 1. Vue core
import { ref, computed, onMounted } from "vue";

// 2. Vue ecosystem
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";

// 3. Third-party
import { format } from "date-fns";

// 4. Internal - composables
import { useAuth } from "@/composables/useAuth";
import { useServices } from "@/composables/useServices";

// 5. Internal - components
import ServiceCard from "@/components/customer/ServiceCard.vue";

// 6. Internal - types
import type { ServiceRequest } from "@/types";

// 7. Internal - utils
import { formatCurrency } from "@/lib/utils";
```

### File Naming

```
Components:   PascalCase.vue     (ServiceCard.vue)
Composables:  camelCase.ts       (useServices.ts)
Views:        PascalCase.vue     (CustomerHomeView.vue)
Types:        camelCase.ts       (service.types.ts)
Utils:        camelCase.ts       (formatters.ts)
Tests:        kebab-case.test.ts (service-request.test.ts)
Migrations:   NNN_snake_case.sql (001_initial_schema.sql)
```

---

**Version**: 2.0.0
**Last Updated**: December 29, 2024
