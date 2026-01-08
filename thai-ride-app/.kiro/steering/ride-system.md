---
inclusion: manual
---

# Ride System Architecture

## Core Entities

### Ride States

```
PENDING → ACCEPTED → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED
                  ↘ CANCELLED
```

### Database Schema Reference

```sql
-- rides table
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES auth.users(id),
  driver_id UUID REFERENCES auth.users(id),
  status ride_status NOT NULL DEFAULT 'pending',
  pickup_location GEOGRAPHY(POINT),
  dropoff_location GEOGRAPHY(POINT),
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  estimated_fare DECIMAL(10,2),
  final_fare DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
```

## Service Layer Pattern

```typescript
// services/rideService.ts
export const rideService = {
  async createRide(request: CreateRideRequest): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .insert({
        passenger_id: request.passengerId,
        pickup_address: request.pickup,
        dropoff_address: request.dropoff,
        pickup_location: `POINT(${request.pickupLng} ${request.pickupLat})`,
        dropoff_location: `POINT(${request.dropoffLng} ${request.dropoffLat})`,
        estimated_fare: request.estimatedFare,
      })
      .select()
      .single();

    if (error) throw new RideServiceError(error.message);
    return data;
  },

  async acceptRide(rideId: string, driverId: string): Promise<Ride> {
    const { data, error } = await supabase
      .from("rides")
      .update({
        driver_id: driverId,
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", rideId)
      .eq("status", "pending") // Prevent race condition
      .select()
      .single();

    if (error) throw new RideServiceError(error.message);
    return data;
  },
};
```

## Realtime Updates

```typescript
// composables/useRideTracking.ts
export function useRideTracking(rideId: Ref<string>) {
  const ride = ref<Ride | null>(null);
  const driverLocation = ref<LatLng | null>(null);

  const channel = supabase
    .channel(`ride-tracking:${rideId.value}`)
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
    .on("broadcast", { event: "driver_location" }, (payload) => {
      driverLocation.value = payload.payload as LatLng;
    })
    .subscribe();

  onUnmounted(() => channel.unsubscribe());

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

function calculateFare(
  distance: number,
  duration: number,
  config: FareConfig
): number {
  const fare =
    config.baseFare + distance * config.perKm + duration * config.perMinute;

  return Math.max(fare * config.surgePricing, config.minimumFare);
}
```
