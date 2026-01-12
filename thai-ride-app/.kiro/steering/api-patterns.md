---
inclusion: fileMatch
fileMatchPattern: "**/*{Service,service,api}*.ts"
---

# API & Service Patterns

## Service Layer Structure

```typescript
// services/rideService.ts
import { supabase } from "@/lib/supabase";
import { AppError, ErrorCode } from "@/types/errors";
import type { Ride, CreateRideInput } from "@/types";

export const rideService = {
  async getById(id: string): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .select(
        `
        *,
        customer:profiles!customer_id(id, name, phone),
        provider:providers!provider_id(id, name, vehicle_type)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      throw new AppError(error.message, ErrorCode.NOT_FOUND);
    }
    return data;
  },

  async create(input: CreateRideInput): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .insert(input)
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, ErrorCode.VALIDATION);
    }
    return data;
  },

  async updateStatus(id: string, status: RideStatus): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new AppError(error.message, ErrorCode.BUSINESS);
    }
    return data;
  },
};
```

## Data Fetching Composable

```typescript
// composables/useQuery.ts
interface UseQueryOptions<T> {
  immediate?: boolean;
  onError?: (error: Error) => void;
}

export function useQuery<T>(
  fetcher: () => Promise<T>,
  options: UseQueryOptions<T> = {}
) {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function execute(): Promise<T | null> {
    loading.value = true;
    error.value = null;

    try {
      data.value = await fetcher();
      return data.value;
    } catch (e) {
      error.value = e as Error;
      options.onError?.(e as Error);
      return null;
    } finally {
      loading.value = false;
    }
  }

  if (options.immediate !== false) {
    execute();
  }

  return { data, loading, error, execute, refetch: execute };
}

// Usage
const {
  data: ride,
  loading,
  refetch,
} = useQuery(() => rideService.getById(rideId.value));
```

## Mutation Composable

```typescript
// composables/useMutation.ts
export function useMutation<TInput, TOutput>(
  mutator: (input: TInput) => Promise<TOutput>
) {
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function execute(input: TInput): Promise<TOutput | null> {
    loading.value = true;
    error.value = null;

    try {
      return await mutator(input);
    } catch (e) {
      error.value = e as Error;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { execute, loading, error };
}

// Usage
const { execute: createRide, loading } = useMutation(rideService.create);
const ride = await createRide({ pickup, dropoff });
```

## Optimistic Updates

```typescript
// composables/useOptimisticUpdate.ts
export function useOptimisticUpdate<T>(
  currentValue: Ref<T>,
  updater: (value: T) => Promise<T>
) {
  async function execute(optimisticValue: T): Promise<T | null> {
    const previousValue = currentValue.value;

    // Optimistic update
    currentValue.value = optimisticValue;

    try {
      const result = await updater(optimisticValue);
      currentValue.value = result;
      return result;
    } catch (error) {
      // Rollback on error
      currentValue.value = previousValue;
      throw error;
    }
  }

  return { execute };
}
```

## Caching

```typescript
// utils/cache.ts
const cache = new Map<string, { data: unknown; timestamp: number }>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > DEFAULT_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}
```
