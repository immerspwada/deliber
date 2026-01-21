---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,vue}"
---

# 🚨 Error Handling Standards

## Error Types

```typescript
// types/errors.ts
export enum ErrorCode {
  NETWORK = "NETWORK",
  AUTH = "AUTH",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION = "PERMISSION",
  RATE_LIMITED = "RATE_LIMITED",
  BUSINESS = "BUSINESS",
  UNKNOWN = "UNKNOWN",
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public userMessage?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Thai user messages
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NETWORK: "ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต",
  AUTH: "กรุณาเข้าสู่ระบบใหม่",
  VALIDATION: "ข้อมูลไม่ถูกต้อง",
  NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ",
  PERMISSION: "คุณไม่มีสิทธิ์เข้าถึง",
  RATE_LIMITED: "คำขอมากเกินไป กรุณารอสักครู่",
  BUSINESS: "ไม่สามารถดำเนินการได้",
  UNKNOWN: "เกิดข้อผิดพลาด กรุณาลองใหม่",
};
```

## Error Handler Composable

```typescript
// composables/useErrorHandler.ts
export function useErrorHandler() {
  const toast = useToast();

  function handle(error: unknown, context?: string): void {
    // Log for debugging
    console.error(`[${context}]`, error);

    // Handle AppError
    if (error instanceof AppError) {
      toast.error(error.userMessage ?? ERROR_MESSAGES[error.code]);

      // Report to Sentry (production)
      if (import.meta.env.PROD) {
        Sentry.captureException(error, { extra: error.context });
      }
      return;
    }

    // Handle unknown errors
    toast.error(ERROR_MESSAGES.UNKNOWN);
    if (import.meta.env.PROD) {
      Sentry.captureException(error);
    }
  }

  return { handle };
}
```

## Async Error Pattern

```typescript
// ✅ Standard async error handling
async function fetchRide(id: string): Promise<Ride> {
  try {
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new AppError(
        error.message,
        ErrorCode.NOT_FOUND,
        "ไม่พบข้อมูลการเดินทาง"
      );
    }

    return data;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError((e as Error).message, ErrorCode.UNKNOWN, undefined, {
      rideId: id,
    });
  }
}
```

## Error Boundary Component

```vue
<!-- components/ErrorBoundary.vue -->
<script setup lang="ts">
import { onErrorCaptured, ref } from "vue";

const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  error.value = err;
  Sentry.captureException(err);
  return false;
});
</script>

<template>
  <div v-if="error" class="p-4 text-center">
    <p class="text-red-600">เกิดข้อผิดพลาด</p>
    <button
      class="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg"
      @click="error = null"
    >
      ลองใหม่
    </button>
  </div>
  <slot v-else />
</template>
```

## Circuit Breaker

```typescript
// utils/circuitBreaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(private threshold = 5, private resetTimeout = 60_000) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new AppError("Service unavailable", ErrorCode.NETWORK);
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}
```

## Retry with Backoff

```typescript
// utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
```
