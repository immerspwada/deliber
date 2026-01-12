---
inclusion: fileMatch
fileMatchPattern: "**/*{ride,Ride}*.{ts,vue}"
---

# Ride System Architecture

## Ride State Machine

```
PENDING → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED
    ↓         ↓         ↓           ↓
CANCELLED CANCELLED CANCELLED   CANCELLED
```

## Database Schema

```sql
CREATE TYPE ride_status AS ENUM (
  'pending', 'accepted', 'arrived',
  'in_progress', 'completed', 'cancelled'
);

CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  provider_id UUID REFERENCES providers(id),
  status ride_status NOT NULL DEFAULT 'pending',

  -- Locations
  pickup_location GEOGRAPHY(POINT) NOT NULL,
  dropoff_location GEOGRAPHY(POINT) NOT NULL,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,

  -- Pricing
  estimated_fare DECIMAL(10,2) NOT NULL,
  final_fare DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  CONSTRAINT valid_fare CHECK (estimated_fare > 0)
);

-- Indexes
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_customer ON rides(customer_id, created_at DESC);
CREATE INDEX idx_rides_provider ON rides(provider_id, status);
CREATE INDEX idx_rides_pickup ON rides USING GIST(pickup_location);
```

## Service Layer

```typescript
// services/rideService.ts
export const rideService = {
  async create(input: CreateRideInput): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .insert({
        customer_id: input.customerId,
        pickup_location: `POINT(${input.pickup.lng} ${input.pickup.lat})`,
        dropoff_location: `POINT(${input.dropoff.lng} ${input.dropoff.lat})`,
        pickup_address: input.pickup.address,
        dropoff_address: input.dropoff.address,
        estimated_fare: input.estimatedFare,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, ErrorCode.VALIDATION);
    return data;
  },

  async accept(rideId: string, providerId: string): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .update({
        provider_id: providerId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", rideId)
      .eq("status", "pending") // Prevent race condition
      .select()
      .single();

    if (error) throw new AppError("Ride already taken", ErrorCode.BUSINESS);
    return data;
  },
};
```

## Realtime Tracking

```typescript
// composables/useRideTracking.ts
export function useRideTracking(rideId: Ref<string>) {
  const ride = ref<Ride | null>(null);
  const driverLocation = ref<LatLng | null>(null);

  const channel = computed(() =>
    supabase
      .channel(`ride:${rideId.value}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rides",
          filter: `id=eq.${rideId.value}`,
        },
        (payload) => {
          ride.value = payload.new as Ride;
        }
      )
      .on("broadcast", { event: "location" }, (payload) => {
        driverLocation.value = payload.payload as LatLng;
      })
  );

  onMounted(() => channel.value.subscribe());
  onUnmounted(() => channel.value.unsubscribe());

  return { ride, driverLocation };
}
```

## Fare Calculation

```typescript
interface FareConfig {
  baseFare: number; // 35 THB
  perKm: number; // 6.5 THB/km
  perMinute: number; // 2 THB/min
  minimumFare: number; // 45 THB
  surgePricing: number; // 1.0 - 2.5x
}

export function calculateFare(
  distance: number, // km
  duration: number, // minutes
  config: FareConfig
): number {
  const fare =
    config.baseFare + distance * config.perKm + duration * config.perMinute;

  const surgedFare = fare * config.surgePricing;
  return Math.max(surgedFare, config.minimumFare);
}
```
