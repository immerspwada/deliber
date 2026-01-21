# Design Document: Production Deployment and Code Quality Fixes

## Overview

This design addresses critical production deployment gaps and code quality issues identified in the engineering review. The solution encompasses five main areas:

1. **Production Migration Deployment**: Deploy migrations 306, 308, 309 via Supabase Dashboard SQL Editor
2. **Error Handling Standardization**: Refactor to use AppError class and ErrorCode enum
3. **Accessibility Compliance**: Add WCAG 2.1 AA compliant ARIA attributes and keyboard navigation
4. **Testing Coverage**: Add integration tests for end-to-end flows and error scenarios
5. **System Resilience**: Add retry logic, loading skeletons, and rollback migrations

The design follows project standards (TypeScript strict mode, Vue 3 Composition API, Tailwind CSS) and maintains the 3-role system (Customer/Provider/Admin).

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Supabase   │         │  Vue 3 App   │                  │
│  │   Dashboard  │────────▶│   Frontend   │                  │
│  │  SQL Editor  │         │              │                  │
│  └──────────────┘         └──────────────┘                  │
│         │                        │                           │
│         │ Deploy                 │ Uses                      │
│         ▼                        ▼                           │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  Migrations  │         │ Error Handler│                  │
│  │  306,308,309 │         │  + AppError  │                  │
│  └──────────────┘         └──────────────┘                  │
│         │                        │                           │
│         │ Creates                │ Logs                      │
│         ▼                        ▼                           │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ RPC Functions│         │ Error Context│                  │
│  │  + RLS       │         │  + Retry     │                  │
│  └──────────────┘         └──────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
User Action (Admin Panel)
    │
    ▼
OrderReassignmentModal.vue
    │
    ├─ Accessibility Layer (ARIA, Focus Management)
    │
    ▼
useOrderReassignment.ts
    │
    ├─ Error Handling (AppError + ErrorCode)
    ├─ Retry Logic (Exponential Backoff)
    ├─ Loading States (Skeleton)
    │
    ▼
Supabase RPC Functions
    │
    ├─ get_available_providers (Migration 306)
    ├─ suspend_customer (Migration 308)
    ├─ get_admin_customers (Migration 309)
    │
    ▼
RLS Policies (Dual-Role System)
    │
    ▼
Database Response
    │
    ▼
Integration Tests (Verify End-to-End)
```

## Components and Interfaces

### 1. Deployment Scripts

#### Manual Deployment Guide

```markdown
# File: .kiro/specs/production-deployment-and-code-quality-fixes/DEPLOY-PRODUCTION.md

## Prerequisites

- Access to Supabase Dashboard
- Production URL: https://onsflqhkgqhydeupiqyt.supabase.co
- Admin credentials

## Steps

1. Open Supabase Dashboard → SQL Editor
2. Copy migration 306 content
3. Execute and verify
4. Copy migration 308 content
5. Execute and verify
6. Copy migration 309 content
7. Execute and verify
8. Run verification queries
```

#### Verification Queries

```sql
-- File: .kiro/specs/production-deployment-and-code-quality-fixes/verify-deployment.sql

-- Verify RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_available_providers',
  'suspend_customer',
  'unsuspend_customer',
  'get_admin_customers'
)
ORDER BY routine_name;

-- Verify RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('ride_requests', 'profiles')
ORDER BY tablename, policyname;

-- Test get_available_providers
SELECT * FROM get_available_providers(
  1.0, -- pickup_lat
  100.0, -- pickup_lng
  'ride'::text -- service_type
) LIMIT 5;

-- Test get_admin_customers
SELECT * FROM get_admin_customers(
  1, -- page
  20, -- page_size
  NULL, -- search_query
  NULL -- status_filter
) LIMIT 5;
```

### 2. Error Handling System

#### AppError Class Extension

```typescript
// File: src/utils/errors.ts (extend existing)

export enum ErrorCode {
  // Existing codes...

  // Order Reassignment
  ORDER_REASSIGNMENT_FAILED = "ORDER_REASSIGNMENT_FAILED",
  NO_AVAILABLE_PROVIDERS = "NO_AVAILABLE_PROVIDERS",
  PROVIDER_ALREADY_ASSIGNED = "PROVIDER_ALREADY_ASSIGNED",

  // Customer Suspension
  CUSTOMER_SUSPENSION_FAILED = "CUSTOMER_SUSPENSION_FAILED",
  CUSTOMER_ALREADY_SUSPENDED = "CUSTOMER_ALREADY_SUSPENDED",
  CUSTOMER_NOT_SUSPENDED = "CUSTOMER_NOT_SUSPENDED",

  // Network
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  NETWORK_UNAVAILABLE = "NETWORK_UNAVAILABLE",

  // Validation
  INVALID_PROVIDER_ID = "INVALID_PROVIDER_ID",
  INVALID_ORDER_ID = "INVALID_ORDER_ID",
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Existing messages...

  [ErrorCode.ORDER_REASSIGNMENT_FAILED]: "ไม่สามารถมอบหมายงานใหม่ได้",
  [ErrorCode.NO_AVAILABLE_PROVIDERS]: "ไม่มีผู้ให้บริการที่พร้อมรับงาน",
  [ErrorCode.PROVIDER_ALREADY_ASSIGNED]: "ผู้ให้บริการนี้ได้รับงานแล้ว",

  [ErrorCode.CUSTOMER_SUSPENSION_FAILED]: "ไม่สามารถระงับบัญชีลูกค้าได้",
  [ErrorCode.CUSTOMER_ALREADY_SUSPENDED]: "บัญชีลูกค้านี้ถูกระงับแล้ว",
  [ErrorCode.CUSTOMER_NOT_SUSPENDED]: "บัญชีลูกค้านี้ไม่ได้ถูกระงับ",

  [ErrorCode.NETWORK_TIMEOUT]: "หมดเวลาการเชื่อมต่อ กรุณาลองใหม่",
  [ErrorCode.NETWORK_UNAVAILABLE]: "ไม่สามารถเชื่อมต่อได้ ตรวจสอบอินเทอร์เน็ต",

  [ErrorCode.INVALID_PROVIDER_ID]: "รหัสผู้ให้บริการไม่ถูกต้อง",
  [ErrorCode.INVALID_ORDER_ID]: "รหัสคำสั่งซื้อไม่ถูกต้อง",
};

export interface ErrorContext {
  userId?: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public context: ErrorContext,
    public originalError?: Error,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "AppError";
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
      originalError: this.originalError?.message,
    };
  }
}
```

#### Retry Logic Utility

```typescript
// File: src/utils/retry.ts

export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2,
  retryableErrors: [ErrorCode.NETWORK_TIMEOUT, ErrorCode.NETWORK_UNAVAILABLE],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (error instanceof AppError) {
        if (!opts.retryableErrors.includes(error.code)) {
          throw error; // Non-retryable error
        }
      }

      // Last attempt, throw error
      if (attempt === opts.maxAttempts) {
        throw new AppError(
          ErrorCode.NETWORK_UNAVAILABLE,
          {
            action: "retry_exhausted",
            timestamp: Date.now(),
            metadata: { attempts: attempt, lastError: lastError.message },
          },
          lastError,
        );
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);

      console.warn(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms`,
      );
    }
  }

  throw lastError!;
}
```

### 3. Refactored useOrderReassignment Composable

```typescript
// File: src/admin/composables/useOrderReassignment.ts (refactored)

import { ref } from "vue";
import { supabase } from "@/lib/supabase";
import { AppError, ErrorCode, type ErrorContext } from "@/utils/errors";
import { withRetry } from "@/utils/retry";
import type { Provider } from "@/types/provider";

export function useOrderReassignment() {
  const availableProviders = ref<Provider[]>([]);
  const isLoading = ref(false);
  const error = ref<AppError | null>(null);

  async function fetchAvailableProviders(
    orderId: string,
    pickupLat: number,
    pickupLng: number,
    serviceType: string,
  ): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await withRetry(async () => {
        const { data, error: rpcError } = await supabase.rpc(
          "get_available_providers",
          {
            pickup_lat: pickupLat,
            pickup_lng: pickupLng,
            service_type: serviceType,
          },
        );

        if (rpcError) {
          throw new AppError(
            ErrorCode.ORDER_REASSIGNMENT_FAILED,
            {
              action: "fetch_available_providers",
              timestamp: Date.now(),
              metadata: { orderId, serviceType },
            },
            rpcError,
          );
        }

        if (!data || data.length === 0) {
          throw new AppError(ErrorCode.NO_AVAILABLE_PROVIDERS, {
            action: "fetch_available_providers",
            timestamp: Date.now(),
            metadata: { orderId, serviceType },
          });
        }

        return data;
      });

      availableProviders.value = result;
    } catch (err) {
      error.value =
        err instanceof AppError
          ? err
          : new AppError(
              ErrorCode.ORDER_REASSIGNMENT_FAILED,
              {
                action: "fetch_available_providers",
                timestamp: Date.now(),
                metadata: { orderId },
              },
              err as Error,
            );

      console.error(
        "Failed to fetch available providers:",
        error.value.toJSON(),
      );
    } finally {
      isLoading.value = false;
    }
  }

  async function reassignOrder(
    orderId: string,
    newProviderId: string,
  ): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const result = await withRetry(async () => {
        const { error: updateError } = await supabase
          .from("ride_requests")
          .update({ provider_id: newProviderId, status: "pending" })
          .eq("id", orderId);

        if (updateError) {
          throw new AppError(
            ErrorCode.ORDER_REASSIGNMENT_FAILED,
            {
              action: "reassign_order",
              timestamp: Date.now(),
              metadata: { orderId, newProviderId },
            },
            updateError,
          );
        }

        return true;
      });

      return result;
    } catch (err) {
      error.value =
        err instanceof AppError
          ? err
          : new AppError(
              ErrorCode.ORDER_REASSIGNMENT_FAILED,
              {
                action: "reassign_order",
                timestamp: Date.now(),
                metadata: { orderId, newProviderId },
              },
              err as Error,
            );

      console.error("Failed to reassign order:", error.value.toJSON());
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    availableProviders,
    isLoading,
    error,
    fetchAvailableProviders,
    reassignOrder,
  };
}
```

### 4. Accessible OrderReassignmentModal Component

```vue
<!-- File: src/admin/components/OrderReassignmentModal.vue (refactored) -->

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="handleClose"
        @keydown.esc="handleClose"
      >
        <div
          ref="modalRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="descriptionId"
          class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
          @keydown.tab="handleTabKey"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 :id="titleId" class="text-xl font-semibold text-gray-900">
              มอบหมายงานใหม่
            </h2>
            <p :id="descriptionId" class="text-sm text-gray-600 mt-1">
              เลือกผู้ให้บริการที่พร้อมรับงาน
            </p>
            <button
              ref="closeButtonRef"
              type="button"
              class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="ปิดหน้าต่าง"
              @click="handleClose"
            >
              <XMarkIcon class="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          <!-- Content -->
          <div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
            <!-- Loading Skeleton -->
            <div v-if="isLoading" class="space-y-3">
              <div v-for="i in 3" :key="i" class="animate-pulse">
                <div class="h-20 bg-gray-200 rounded-lg"></div>
              </div>
            </div>

            <!-- Error Message -->
            <div
              v-else-if="error"
              role="alert"
              aria-live="assertive"
              class="bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <p class="text-red-800">{{ error.message }}</p>
            </div>

            <!-- Provider List -->
            <div v-else-if="availableProviders.length > 0" class="space-y-3">
              <button
                v-for="provider in availableProviders"
                :key="provider.id"
                type="button"
                class="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                :aria-label="`เลือก ${provider.name} ระยะห่าง ${provider.distance} กิโลเมตร`"
                @click="handleSelectProvider(provider.id)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-gray-900">{{ provider.name }}</p>
                    <p class="text-sm text-gray-600">{{ provider.phone }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">
                      {{ provider.distance }} km
                    </p>
                    <p class="text-xs text-gray-600">
                      คะแนน {{ provider.rating }}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-8">
              <p class="text-gray-600">ไม่มีผู้ให้บริการที่พร้อมรับงาน</p>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3"
          >
            <button
              ref="cancelButtonRef"
              type="button"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="ยกเลิก"
              @click="handleClose"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { XMarkIcon } from "@heroicons/vue/24/outline";
import { useOrderReassignment } from "@/admin/composables/useOrderReassignment";
import { useFocusTrap } from "@/composables/useFocusTrap";

interface Props {
  isOpen: boolean;
  orderId: string;
  pickupLat: number;
  pickupLng: number;
  serviceType: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  reassigned: [providerId: string];
}>();

const titleId = "modal-title";
const descriptionId = "modal-description";

const modalRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);
const previousActiveElement = ref<HTMLElement | null>(null);

const {
  availableProviders,
  isLoading,
  error,
  fetchAvailableProviders,
  reassignOrder,
} = useOrderReassignment();

const { trapFocus, releaseFocus } = useFocusTrap();

// Fetch providers when modal opens
watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.value = document.activeElement as HTMLElement;

      // Fetch providers
      await fetchAvailableProviders(
        props.orderId,
        props.pickupLat,
        props.pickupLng,
        props.serviceType,
      );

      // Focus first interactive element
      await nextTick();
      closeButtonRef.value?.focus();

      // Trap focus within modal
      if (modalRef.value) {
        trapFocus(modalRef.value);
      }
    } else {
      // Release focus trap
      releaseFocus();

      // Restore focus to previous element
      previousActiveElement.value?.focus();
    }
  },
);

function handleClose() {
  emit("close");
}

async function handleSelectProvider(providerId: string) {
  const success = await reassignOrder(props.orderId, providerId);
  if (success) {
    emit("reassigned", providerId);
    handleClose();
  }
}

function handleTabKey(event: KeyboardEvent) {
  if (!modalRef.value) return;

  const focusableElements = modalRef.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

// Prevent body scroll when modal is open
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  },
);

onUnmounted(() => {
  document.body.style.overflow = "";
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
```

### 5. Focus Trap Composable

```typescript
// File: src/composables/useFocusTrap.ts

import { ref } from "vue";

export function useFocusTrap() {
  const trapElement = ref<HTMLElement | null>(null);
  const handleKeyDown = ref<((event: KeyboardEvent) => void) | null>(null);

  function trapFocus(element: HTMLElement) {
    trapElement.value = element;

    handleKeyDown.value = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !trapElement.value) return;

      const focusableElements = trapElement.value.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown.value);
  }

  function releaseFocus() {
    if (handleKeyDown.value) {
      document.removeEventListener("keydown", handleKeyDown.value);
      handleKeyDown.value = null;
    }
    trapElement.value = null;
  }

  return {
    trapFocus,
    releaseFocus,
  };
}
```

## Data Models

### Error Context Model

```typescript
interface ErrorContext {
  userId?: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

### Retry Options Model

```typescript
interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}
```

### Provider Model (Extended)

```typescript
interface Provider {
  id: string;
  name: string;
  phone: string;
  distance: number; // kilometers
  rating: number; // 0-5
  status: "available" | "busy" | "offline";
  service_types: string[];
}
```

### Deployment Verification Result

```typescript
interface DeploymentVerification {
  migration: string;
  status: "success" | "failed";
  rpcFunctions: {
    name: string;
    exists: boolean;
  }[];
  rlsPolicies: {
    table: string;
    policy: string;
    exists: boolean;
  }[];
  testQueries: {
    query: string;
    success: boolean;
    error?: string;
  }[];
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

- Requirements 7.1 and 7.2 both test rollback schema restoration (combined into Property 11)
- Requirements 4.1-4.7 are meta-requirements about test coverage (not testable as properties)
- Requirements 8.3 and 8.4 are performance benchmarks (not unit-testable properties)
- Requirement 6.4 is about visual smoothness (subjective, not testable)

### Deployment Verification Properties

**Property 1: Migration Deployment Verification**
_For any_ deployed migration (306, 308, 309), querying `information_schema.routines` for its RPC functions should return all expected function names.
**Validates: Requirements 1.1, 1.3, 1.4, 11.1**

**Property 2: RLS Policy Verification**
_For any_ deployed migration with RLS policies, querying `pg_policies` should return all expected policy names for the affected tables.
**Validates: Requirements 11.2**

**Property 3: Functional Verification**
_For any_ deployed RPC function, calling it with valid test parameters should return a successful response without errors.
**Validates: Requirements 1.2, 11.3**

**Property 4: Deployment Error Logging**
_For any_ migration deployment failure, the system should log an error containing the migration name, error message, and rollback instructions.
**Validates: Requirements 1.6**

**Property 5: Verification Failure Reporting**
_For any_ verification check that fails, the error message should specifically identify which function, policy, or column is missing.
**Validates: Requirements 11.4**

**Property 6: Verification Success Logging**
_For any_ successful verification, the system should log a success message with timestamp and verification type.
**Validates: Requirements 11.5**

### Error Handling Properties

**Property 7: AppError Wrapping**
_For any_ error thrown in `useOrderReassignment.ts`, it should be an instance of AppError class.
**Validates: Requirements 2.1**

**Property 8: Valid ErrorCode**
_For any_ AppError instance, its `code` property should be a valid member of the ErrorCode enum.
**Validates: Requirements 2.2**

**Property 9: Thai Error Messages**
_For any_ ErrorCode value, the ERROR_MESSAGES map should contain a Thai language string.
**Validates: Requirements 2.3**

**Property 10: Error Context Completeness**
_For any_ AppError instance, its `context` property should include `action` and `timestamp` fields.
**Validates: Requirements 2.4**

**Property 11: Error Classification**
_For any_ HTTP error status code, the system should map it to the appropriate ErrorCode (4xx → client errors, 5xx → server errors, timeout → network errors).
**Validates: Requirements 2.5**

**Property 12: Validation Error Detail**
_For any_ validation error, the error context should include the field name that failed validation.
**Validates: Requirements 2.6**

### Accessibility Properties

**Property 13: Button Accessibility Labels**
_For any_ button element in OrderReassignmentModal, it should have an `aria-label` attribute.
**Validates: Requirements 3.1**

**Property 14: Icon Accessibility Hiding**
_For any_ icon element (SVG with decorative purpose), it should have `aria-hidden="true"` attribute.
**Validates: Requirements 3.2**

**Property 15: Focus Management on Open**
_For any_ modal opening event, `document.activeElement` should change to the first focusable element within the modal.
**Validates: Requirements 3.4**

**Property 16: Focus Restoration on Close**
_For any_ modal closing event, `document.activeElement` should return to the element that triggered the modal.
**Validates: Requirements 3.5**

**Property 17: Focus Trap Behavior**
_For any_ Tab key press when focus is on the last focusable element in the modal, focus should move to the first focusable element.
**Validates: Requirements 3.7**

**Property 18: Screen Reader Announcements**
_For any_ error message displayed, the containing element should have `aria-live="assertive"` or `aria-live="polite"` attribute.
**Validates: Requirements 3.8**

### Network Resilience Properties

**Property 19: Retry on Transient Errors**
_For any_ network request that fails with a retryable error (timeout, 503), the system should retry the request up to maxAttempts times.
**Validates: Requirements 5.1**

**Property 20: Exponential Backoff Timing**
_For any_ retry attempt N, the delay before retry should be `initialDelay * (backoffMultiplier ^ (N-1))`, capped at maxDelay.
**Validates: Requirements 5.2**

**Property 21: Retry Exhaustion Error**
_For any_ request that fails after maxAttempts retries, the final error should include retry context with attempt count.
**Validates: Requirements 5.3**

**Property 22: Retry Success Logging**
_For any_ request that succeeds after retrying, the system should log the number of attempts made.
**Validates: Requirements 5.4**

**Property 23: Non-Retryable Error Handling**
_For any_ error with a non-retryable error code (400, 401, 403, 404), the system should throw immediately without retrying.
**Validates: Requirements 5.5**

### Loading State Properties

**Property 24: Skeleton Loader Display**
_For any_ component in loading state (`isLoading === true`), skeleton loader elements should be rendered in the DOM.
**Validates: Requirements 6.1**

**Property 25: Skeleton Dimensions**
_For any_ skeleton item in a list, its height should match the height of the real item it represents.
**Validates: Requirements 6.2**

### Rollback Properties

**Property 26: Rollback Schema Restoration**
_For any_ migration, applying the forward migration then the rollback migration should result in the same schema state as before the forward migration.
**Validates: Requirements 7.1, 7.2**

**Property 27: Rollback Data Preservation**
_For any_ rollback migration that doesn't require data deletion, existing data should remain in the database after rollback.
**Validates: Requirements 7.3**

**Property 28: Rollback Action Logging**
_For any_ rollback migration execution, all SQL statements executed should be logged with timestamps.
**Validates: Requirements 7.4**

### Performance Properties

**Property 29: Virtual Scrolling Activation**
_For any_ list with more than 1000 items, the number of DOM elements rendered should be less than the total item count.
**Validates: Requirements 8.1**

**Property 30: Virtual Scrolling Buffer**
_For any_ virtual scrolling list, the number of rendered items should equal visible items plus buffer size.
**Validates: Requirements 8.2**

### Caching Properties

**Property 31: Cache Storage with TTL**
_For any_ API response, it should be stored in cache with an expiration timestamp equal to current time plus TTL.
**Validates: Requirements 9.1**

**Property 32: Cache Hit Behavior**
_For any_ API request made within TTL of a previous identical request, the cached response should be returned without making a network call.
**Validates: Requirements 9.2**

**Property 33: Cache Expiration**
_For any_ cached response whose TTL has expired, a fresh network request should be made.
**Validates: Requirements 9.3**

**Property 34: Cache Invalidation on Mutation**
_For any_ data mutation operation, all cache entries related to that data should be removed from cache.
**Validates: Requirements 9.4**

**Property 35: LRU Cache Eviction**
_For any_ cache that exceeds its size limit, the least-recently-used entry should be evicted first.
**Validates: Requirements 9.5**

### Circuit Breaker Properties

**Property 36: Circuit Opening**
_For any_ API endpoint that fails N consecutive times (where N is the failure threshold), the circuit breaker should transition to open state.
**Validates: Requirements 10.1**

**Property 37: Open Circuit Fast Fail**
_For any_ request made when circuit is open, it should fail immediately with a circuit open error without making a network call.
**Validates: Requirements 10.2**

**Property 38: Circuit Half-Open Transition**
_For any_ circuit that has been open for the timeout duration, it should transition to half-open state.
**Validates: Requirements 10.3**

**Property 39: Circuit Closing on Success**
_For any_ request that succeeds when circuit is in half-open state, the circuit should transition to closed state.
**Validates: Requirements 10.4**

**Property 40: Circuit Reopening on Failure**
_For any_ request that fails when circuit is in half-open state, the circuit should transition back to open state.
**Validates: Requirements 10.5**

### Dual-Role System Properties

**Property 41: Dual-Role Column Verification**
_For any_ dual-role system verification, querying `information_schema.columns` for `providers_v2.user_id` should return exactly one row.
**Validates: Requirements 12.1**

**Property 42: RLS Policy Dual-Role Pattern**
_For any_ RLS policy on tables with provider_id, the policy definition should contain a JOIN to `providers_v2` checking `user_id = auth.uid()`.
**Validates: Requirements 12.2**

**Property 43: Storage Policy Dual-Role Pattern**
_For any_ storage bucket policy for provider uploads, the policy should JOIN to `providers_v2` to verify `user_id = auth.uid()`.
**Validates: Requirements 12.3**

**Property 44: Dual-Role Check Failure Guidance**
_For any_ dual-role verification that fails, the error message should include specific SQL migration code to fix the issue.
**Validates: Requirements 12.4**

## Error Handling

### Error Classification

```typescript
// Error hierarchy
AppError
├── DeploymentError (migration failures)
├── ValidationError (input validation)
├── NetworkError (connectivity issues)
│   ├── TimeoutError
│   └── UnavailableError
├── AuthorizationError (403, 401)
├── NotFoundError (404)
└── ServerError (500, 503)
```

### Error Recovery Strategies

| Error Type         | Recovery Strategy              | User Action                   |
| ------------------ | ------------------------------ | ----------------------------- |
| TimeoutError       | Retry with exponential backoff | "กำลังลองใหม่..."             |
| UnavailableError   | Retry with exponential backoff | "กำลังลองใหม่..."             |
| ValidationError    | Show field-specific errors     | "กรุณาแก้ไขข้อมูล"            |
| AuthorizationError | Redirect to login              | "กรุณาเข้าสู่ระบบ"            |
| NotFoundError      | Show not found message         | "ไม่พบข้อมูล"                 |
| ServerError        | Show generic error             | "เกิดข้อผิดพลาด กรุณาลองใหม่" |

### Error Context Requirements

Every AppError must include:

- `action`: String describing what operation failed (e.g., "fetch_available_providers")
- `timestamp`: Unix timestamp when error occurred
- `metadata`: Optional object with additional context (orderId, providerId, etc.)
- `userId`: Optional user ID if available from auth context

### Error Logging Format

```typescript
{
  level: 'error',
  code: 'ORDER_REASSIGNMENT_FAILED',
  message: 'ไม่สามารถมอบหมายงานใหม่ได้',
  context: {
    userId: 'user-123',
    action: 'reassign_order',
    timestamp: 1704067200000,
    metadata: {
      orderId: 'order-456',
      newProviderId: 'provider-789'
    }
  },
  originalError: 'RPC function failed: get_available_providers',
  stack: '...'
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests:

**Unit Tests** focus on:

- Specific deployment verification examples (migrations 306, 308, 309)
- Specific accessibility examples (modal role, escape key)
- Edge cases (empty provider list, network timeout)
- Error scenarios (invalid provider ID, missing function)

**Property-Based Tests** focus on:

- Universal error handling (all errors wrapped in AppError)
- Universal accessibility (all buttons have aria-label)
- Universal retry behavior (all retryable errors trigger retry)
- Universal caching behavior (all responses cached with TTL)

### Test Configuration

All property-based tests must:

- Run minimum 100 iterations (due to randomization)
- Reference the design document property number
- Use tag format: `Feature: production-deployment-and-code-quality-fixes, Property N: [property text]`

### Test Files

```
src/tests/
├── deployment-verification.unit.test.ts
├── deployment-verification.property.test.ts
├── error-handling.unit.test.ts
├── error-handling.property.test.ts
├── accessibility.unit.test.ts
├── accessibility.property.test.ts
├── retry-logic.unit.test.ts
├── retry-logic.property.test.ts
├── loading-states.unit.test.ts
├── rollback-migrations.unit.test.ts
├── caching.property.test.ts
├── circuit-breaker.property.test.ts
└── integration/
    ├── order-reassignment-flow.integration.test.ts
    └── customer-suspension-flow.integration.test.ts
```

### Integration Test Coverage

Integration tests must verify:

1. **Order Reassignment Flow**: Admin opens modal → fetches providers → selects provider → order updated → modal closes
2. **Customer Suspension Flow**: Admin suspends customer → customer cannot create rides → admin unsuspends → customer can create rides
3. **Error Scenarios**: Network failure → retry → success; Invalid provider → validation error
4. **RLS Verification**: Admin can access all orders; Provider can only access assigned orders
5. **Dual-Role System**: Provider actions use providers_v2.user_id JOIN pattern

### Property-Based Testing Libraries

- **TypeScript/JavaScript**: fast-check
- **Test Framework**: Vitest
- **Minimum Iterations**: 100 per property test

### Example Property Test

```typescript
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AppError, ErrorCode } from "@/utils/errors";

describe("Property 8: Valid ErrorCode", () => {
  it("should have valid ErrorCode for all AppError instances", () => {
    // Feature: production-deployment-and-code-quality-fixes, Property 8: Valid ErrorCode

    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(ErrorCode)),
        fc.record({
          action: fc.string(),
          timestamp: fc.integer(),
        }),
        (code, context) => {
          const error = new AppError(code, context);

          // Verify code is in enum
          expect(Object.values(ErrorCode)).toContain(error.code);
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

### Manual Testing Checklist

After implementation, manually verify:

- [ ] Migrations 306, 308, 309 deployed to production
- [ ] All RPC functions callable in production
- [ ] Modal opens with correct ARIA attributes
- [ ] Focus moves to first element on modal open
- [ ] Focus returns to trigger on modal close
- [ ] Escape key closes modal
- [ ] Tab key cycles focus within modal
- [ ] Error messages display in Thai
- [ ] Network errors trigger retry
- [ ] Loading shows skeleton loader
- [ ] Screen reader announces errors

### Accessibility Testing Tools

- **Automated**: axe-core, eslint-plugin-jsx-a11y
- **Manual**: NVDA (Windows), VoiceOver (Mac), JAWS
- **Keyboard**: Test all interactions with keyboard only
- **Target**: WCAG 2.1 AA compliance

## Implementation Notes

### Deployment Constraints

- **No Docker**: Cannot use local Supabase CLI
- **No MCP**: Cannot use automated deployment tools
- **Manual Only**: Must deploy via Supabase Dashboard SQL Editor
- **Production URL**: https://onsflqhkgqhydeupiqyt.supabase.co

### Deployment Process

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy migration 306 content
4. Execute and verify output
5. Run verification queries
6. Repeat for migrations 308, 309
7. Run comprehensive verification script
8. Test functionality in production

### Rollback Strategy

Each migration must have a corresponding rollback script:

- `306_admin_order_reassignment_system.sql` → `306_rollback.sql`
- `308_customer_suspension_system_production_ready.sql` → `308_rollback.sql`
- `309_fix_get_admin_customers_status.sql` → `309_rollback.sql`

### Priority Implementation Order

1. **P0 (Critical)**: Deploy migrations 306, 308, 309 to production
2. **P1 (High)**: Fix error handling, accessibility, integration tests
3. **P2 (Medium)**: Add retry logic, loading skeletons, rollback migrations
4. **P3 (Low)**: Add virtual scrolling, caching, circuit breaker

### Backward Compatibility

All changes must maintain backward compatibility:

- Existing error handling code continues to work
- New AppError wraps existing errors
- Accessibility additions don't break existing UI
- Retry logic is opt-in via withRetry wrapper

### Performance Targets

- Modal open: < 100ms
- Provider list fetch: < 500ms
- Retry delay: 1s, 2s, 4s (exponential backoff)
- Skeleton transition: < 200ms
- Virtual scrolling: 60fps

### Security Considerations

- All RLS policies must use dual-role pattern
- Storage policies must verify providers_v2.user_id
- Error messages must not leak sensitive data
- Retry logic must not amplify DDoS attacks
- Circuit breaker prevents cascading failures
