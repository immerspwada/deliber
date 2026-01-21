---
inclusion: fileMatch
fileMatchPattern: "**/*{supabase,Service,store}*.{ts,vue}"
---

# Supabase Integration Patterns

## Type-Safe Client

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce",
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);
```

## Query Patterns

```typescript
// ✅ Type-safe query with error handling
async function fetchRides(userId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("id, status, fare, created_at") // ระบุ columns
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new AppError(error.message, "DB_ERROR");
  return data ?? [];
}

// ✅ Join queries (avoid N+1)
const { data } = await supabase
  .from("rides")
  .select(
    `
    id, status, fare,
    customer:profiles!customer_id(id, name, phone),
    provider:providers!provider_id(id, name, vehicle_type)
  `
  )
  .eq("id", rideId)
  .single();

// ✅ Pagination
const { data, count } = await supabase
  .from("rides")
  .select("*", { count: "exact" })
  .range(offset, offset + limit - 1);
```

## Realtime Subscriptions

```typescript
// composables/useRealtimeRide.ts
export function useRealtimeRide(rideId: Ref<string>) {
  const ride = ref<Ride | null>(null);
  let channel: RealtimeChannel | null = null;

  function subscribe(): void {
    channel = supabase
      .channel(`ride:${rideId.value}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId.value}`,
        },
        (payload) => {
          ride.value = payload.new as Ride;
        }
      )
      .subscribe();
  }

  onMounted(subscribe);
  onUnmounted(() => channel?.unsubscribe());

  return { ride };
}
```

## Edge Functions

```typescript
// ✅ Invoke with type safety
interface PaymentRequest {
  rideId: string;
  amount: number;
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
}

async function processPayment(req: PaymentRequest): Promise<PaymentResponse> {
  const { data, error } = await supabase.functions.invoke<PaymentResponse>(
    "process-payment",
    { body: req }
  );

  if (error) throw new AppError(error.message, "PAYMENT_ERROR");
  return data!;
}
```

## Auth Patterns

```typescript
// ✅ Get current user (cached)
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) throw new AppError("Not authenticated", "AUTH_ERROR");

// ✅ Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    router.push("/login");
  }
  if (event === "TOKEN_REFRESHED") {
    // Token refreshed automatically
  }
});

// ✅ Sign out (clear all sessions)
await supabase.auth.signOut({ scope: "global" });
```

## RLS Policy Template

```sql
-- ทุก table ต้องมี RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- User can only access own data
CREATE POLICY "users_own_data" ON table_name
  FOR ALL USING (auth.uid() = user_id);

-- Admin full access
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```
