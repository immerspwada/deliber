---
inclusion: always
---

# 🚨 Error Handling Standards (Production-Ready)

## Error Types

```typescript
// types/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public userMessage?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export enum ErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RATE_LIMITED = "RATE_LIMITED",
  UNKNOWN = "UNKNOWN",
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NETWORK_ERROR: "ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต",
  AUTH_ERROR: "กรุณาเข้าสู่ระบบใหม่",
  VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง",
  NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ",
  PERMISSION_DENIED: "คุณไม่มีสิทธิ์เข้าถึง",
  RATE_LIMITED: "คำขอมากเกินไป กรุณารอสักครู่",
  UNKNOWN: "เกิดข้อผิดพลาด กรุณาลองใหม่",
};
```

## Global Error Handler

```typescript
// composables/useErrorHandler.ts
export function useErrorHandler() {
  const toast = useToast();

  function handleError(error: unknown): void {
    console.error("[Error]", error);

    if (error instanceof AppError) {
      toast.error(error.userMessage || ERROR_MESSAGES[error.code]);
      return;
    }

    if (error instanceof Error) {
      // Log to Sentry
      Sentry.captureException(error);
      toast.error(ERROR_MESSAGES.UNKNOWN);
      return;
    }

    toast.error(ERROR_MESSAGES.UNKNOWN);
  }

  return { handleError };
}
```

## Component Error Boundary

```vue
<!-- components/ErrorBoundary.vue -->
<script setup lang="ts">
import { onErrorCaptured, ref } from "vue";

const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  error.value = err;
  Sentry.captureException(err);
  return false; // Prevent propagation
});

function retry(): void {
  error.value = null;
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <p>เกิดข้อผิดพลาด</p>
    <button @click="retry">ลองใหม่</button>
  </div>
  <slot v-else />
</template>
```

## Async Error Handling

```typescript
// ✅ ถูกต้อง - จัดการ error ทุกกรณี
async function fetchRide(id: string): Promise<Ride | null> {
  try {
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new AppError(error.message, ErrorCode.NOT_FOUND);
    }

    return data;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      (e as Error).message,
      ErrorCode.UNKNOWN,
      "ไม่สามารถโหลดข้อมูลการเดินทางได้"
    );
  }
}
```

## Form Validation Errors

```typescript
// composables/useFormValidation.ts
interface ValidationError {
  field: string;
  message: string;
}

export function useFormValidation<T extends Record<string, unknown>>() {
  const errors = ref<ValidationError[]>([]);

  function validate(data: T, rules: ValidationRules<T>): boolean {
    errors.value = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const error = rule(value);
      if (error) {
        errors.value.push({ field, message: error });
      }
    }

    return errors.value.length === 0;
  }

  function getError(field: string): string | undefined {
    return errors.value.find((e) => e.field === field)?.message;
  }

  return { errors, validate, getError };
}
```

## Production Error Reporting

```typescript
// ✅ ส่ง errors ไป Sentry ใน Production
import * as Sentry from "@sentry/vue";

export function reportError(
  error: Error,
  context?: Record<string, unknown>
): void {
  // Log locally
  console.error("[Error]", error.message, context);

  // Send to Sentry in production
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        component: context?.component as string,
        action: context?.action as string,
      },
    });
  }
}

// Usage
try {
  await processPayment(orderId);
} catch (error) {
  reportError(error as Error, {
    component: "PaymentForm",
    action: "processPayment",
    orderId,
  });
  throw error;
}
```

## Circuit Breaker Pattern

```typescript
// utils/circuitBreaker.ts
interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailure: number | null = null;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - (this.lastFailure || 0) > this.config.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.state = "open";
    }
  }
}

// Usage for external services
const paymentCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
});
```
