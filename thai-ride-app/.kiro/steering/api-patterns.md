---
inclusion: fileMatch
fileMatchPattern: "**/services/**/*.ts,**/composables/**/*.ts"
---

# API & Service Patterns

## Service Layer Architecture

```typescript
// services/base.ts
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function handleSupabaseError(error: PostgrestError): never {
  throw new ServiceError(error.message, error.code, 400);
}
```

## Standard Service Pattern

```typescript
// services/rideService.ts
import { supabase } from "@/lib/supabase";
import type { Ride, CreateRideInput } from "@/types";

export const rideService = {
  async getById(id: string): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .select(
        `
        *,
        passenger:users!passenger_id(*),
        driver:users!driver_id(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) handleSupabaseError(error);
    return data;
  },

  async create(input: CreateRideInput): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .insert(input)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data;
  },

  async updateStatus(id: string, status: RideStatus): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) handleSupabaseError(error);
    return data;
  },
};
```

## Composable Pattern for Data Fetching

```typescript
// composables/useRide.ts
export function useRide(rideId: MaybeRef<string>) {
  const ride = ref<Ride | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function fetch(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      ride.value = await rideService.getById(toValue(rideId));
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  // Auto-fetch on mount and when rideId changes
  watchEffect(() => {
    if (toValue(rideId)) fetch();
  });

  return { ride, loading, error, refetch: fetch };
}
```

## Mutation Pattern

```typescript
// composables/useCreateRide.ts
export function useCreateRide() {
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function execute(input: CreateRideInput): Promise<Ride | null> {
    loading.value = true;
    error.value = null;

    try {
      const ride = await rideService.create(input);
      return ride;
    } catch (e) {
      error.value = e as Error;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { execute, loading, error };
}
```

## Retry Logic

```typescript
// utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
```
