---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,vue}"
---

# Supabase Integration Patterns

## Database Queries

### ใช้ Type-Safe Queries

```typescript
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

// ✅ ถูกต้อง - มี type safety
const { data, error } = await supabase
  .from("rides")
  .select("*")
  .eq("status", "active")
  .returns<Database["public"]["Tables"]["rides"]["Row"][]>();

// ❌ ผิด - ไม่มี error handling
const { data } = await supabase.from("rides").select("*");
```

### Error Handling Pattern

```typescript
async function fetchRides(): Promise<Ride[]> {
  const { data, error } = await supabase.from("rides").select("*");

  if (error) {
    console.error("Fetch rides failed:", error.message);
    throw new Error(`Failed to fetch rides: ${error.message}`);
  }

  return data ?? [];
}
```

## Realtime Subscriptions

### ใช้ใน Composables

```typescript
// composables/useRideRealtime.ts
export function useRideRealtime(rideId: string) {
  const ride = ref<Ride | null>(null);
  let channel: RealtimeChannel | null = null;

  onMounted(() => {
    channel = supabase
      .channel(`ride:${rideId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          ride.value = payload.new as Ride;
        }
      )
      .subscribe();
  });

  onUnmounted(() => {
    channel?.unsubscribe();
  });

  return { ride };
}
```

## Edge Functions

### Invoke Pattern

```typescript
const { data, error } = await supabase.functions.invoke("process-payment", {
  body: { rideId, amount },
});

if (error) throw new Error(error.message);
```

## Auth Patterns

### Check Auth State

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) throw new Error("Not authenticated");
```

### Listen to Auth Changes

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    router.push("/login");
  }
});
```
