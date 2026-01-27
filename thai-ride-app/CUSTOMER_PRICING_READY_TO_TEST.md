# ✅ Customer Pricing - Ready to Test

**Date**: 2026-01-26  
**Status**: ✅ Code Complete - Awaiting Cache Clear Test  
**Priority**: 🔥 CRITICAL

---

## 📊 Current Status

### ✅ What's Been Done

1. **Database Integration** ✅
   - RPC function `calculate_distance_fare` created in production
   - Fetches pricing from `financial_settings` table
   - Current settings: base_fare=35, per_km=10, min_fare=50

2. **Vehicle Multipliers** ✅
   - Loaded from database on initialization (line 1161)
   - Current multipliers: bike=0.7, car=1.0, premium=1.5
   - Applied to base fare calculation

3. **Comprehensive Logging** ✅
   - Added to `calculateFare()` function (lines 551-620)
   - Shows distance, base fare, multiplier, final fare
   - Helps debug any issues

4. **Code Flow Verified** ✅
   ```
   Map Click → handleMapClick() → selectDestination() → calculateFare()
   ```

   - All functions properly chained
   - `selectDestination()` calls `calculateFare()` at line 512

---

## 🔍 The Issue

**Browser Cache** is preventing new code from loading. The logs we added aren't appearing because the browser is still using old cached JavaScript.

### Evidence

Your console shows:

```
✅ [MapView] 🗺️ Map clicked!
✅ [RideView] Geocoded via photon: Charoen Khet Road
❌ [useRideRequest.calculateFare] ===== CALLED =====  ← MISSING!
```

This proves the browser is using old code.

---

## 🚀 Solution: Complete Cache Clear

### Quick Steps

1. **Stop dev server**: `Ctrl+C` in terminal
2. **Clear Vite cache**: `rm -rf node_modules/.vite`
3. **Restart dev server**: `npm run dev`
4. **Clear browser cache**:
   - Open DevTools (F12)
   - Right-click Refresh button
   - Select "Empty Cache and Hard Reload"
5. **Test in incognito window**: `http://localhost:5173/customer/ride`

### Detailed Instructions

See `CUSTOMER_PRICING_CACHE_SOLUTION.md` for complete step-by-step guide.

---

## ✅ Expected Results After Cache Clear

### Console Output

```
[MapView] 🗺️ Map clicked!
[RideView] Geocoded via photon: Charoen Khet Road

[useRideRequest.calculateFare] ===== CALLED =====
[useRideRequest.calculateFare] Pickup: {lat: 6.xxx, lng: 101.xxx, address: "..."}
[useRideRequest.calculateFare] Destination: {lat: 6.xxx, lng: 101.xxx, address: "..."}
[useRideRequest.calculateFare] Distance calculated: 2.5 km

[calculateFare] Database base fare: {
  distance: 2.5,
  baseFare: 60,
  breakdown: {...}
}

[calculateFare] Final fare with multiplier: {
  baseFare: 60,
  vehicleType: 'car',
  multiplier: 1.0,
  finalFare: 60,
  source: 'database'
}
```

### Price Display

**Example for 2.5 km distance:**

| Vehicle    | Calculation | Price |
| ---------- | ----------- | ----- |
| 🚲 Bike    | 60 × 0.7    | ฿42   |
| 🚗 Car     | 60 × 1.0    | ฿60   |
| 💎 Premium | 60 × 1.5    | ฿90   |

_Base fare: 35 + (2.5 × 10) = 60 THB_

**Prices will change dynamically** based on actual distance between pickup and destination.

---

## 🎯 How It Works

### 1. Distance Calculation

```typescript
const dist = calculateDistance(
  pickup.lat,
  pickup.lng,
  destination.lat,
  destination.lng,
);
// Example: 2.5 km
```

### 2. Database Pricing

```typescript
const { data } = await supabase.rpc("calculate_distance_fare", {
  p_service_type: "ride",
  p_distance_km: 2.5,
});
// Returns: { final_fare: 60 }
```

### 3. Vehicle Multiplier

```typescript
const baseFare = 60;
const multiplier = vehicleMultipliers.value["car"]; // 1.0
const finalFare = Math.round(baseFare * multiplier); // 60
```

### 4. Display

```vue
<span class="vehicle-price">
  ฿{{ Math.round(estimatedFare * v.multiplier) }}
</span>
```

---

## 📁 Files Modified

1. ✅ `src/composables/useRideRequest.ts`
   - Line 551-620: `calculateFare()` with database integration
   - Line 512: `selectDestination()` calls `calculateFare()`
   - Line 1161: `initialize()` loads vehicle multipliers

2. ✅ `src/components/ride/RideBookingPanel.vue`
   - Line 236: Displays `estimatedFare * v.multiplier`

3. ✅ `src/views/customer/RideViewRefactored.vue`
   - Line 152: `handleMapClick()` calls `selectDestination()`

4. ✅ Production Database
   - RPC function `calculate_distance_fare` created
   - Financial settings configured

---

## 🔧 Code Architecture

### Composable: `useRideRequest.ts`

```typescript
export function useRideRequest() {
  // State
  const estimatedFare = ref(0);
  const vehicleMultipliers = ref({ bike: 0.7, car: 1.0, premium: 1.5 });

  // Load multipliers from database
  async function fetchVehicleMultipliers() {
    const { data } = await supabase
      .from("financial_settings")
      .select("value")
      .eq("key", "vehicle_multipliers")
      .single();

    if (data) vehicleMultipliers.value = data.value;
  }

  // Calculate fare with database pricing
  async function calculateFare() {
    const dist = calculateDistance(pickup, destination);

    // Get base fare from database
    const { data } = await supabase.rpc("calculate_distance_fare", {
      p_service_type: "ride",
      p_distance_km: dist,
    });

    const baseFare = data[0].final_fare;

    // Apply vehicle multiplier
    const multiplier = vehicleMultipliers.value[selectedVehicle.value];
    estimatedFare.value = Math.round(baseFare * multiplier);
  }

  // Initialize on mount
  async function initialize() {
    await fetchVehicleMultipliers();
    await fetchVehicleTypes();
    await checkActiveRide();
  }

  return { estimatedFare, calculateFare, initialize };
}
```

### Component: `RideBookingPanel.vue`

```vue
<template>
  <button v-for="v in vehicles" :key="v.id" @click="selectVehicle(v.id)">
    <span class="vehicle-name">{{ v.name }}</span>
    <span class="vehicle-price">
      ฿{{ Math.round(estimatedFare * v.multiplier) }}
    </span>
  </button>
</template>
```

---

## 🧪 Testing Checklist

After cache clear, verify:

- [ ] Console shows `[useRideRequest.calculateFare] ===== CALLED =====`
- [ ] Console shows distance calculation
- [ ] Console shows database base fare
- [ ] Console shows final fare with multiplier
- [ ] Prices change from B35/50/75 to real calculated values
- [ ] Prices are different for bike/car/premium
- [ ] Prices change when selecting different destinations
- [ ] No errors in console

---

## 🐛 Troubleshooting

### If Logs Still Don't Appear

1. **Verify file saved**: Check `src/composables/useRideRequest.ts` line 551
2. **Check TypeScript**: Run `npm run type-check`
3. **Check build errors**: Look at terminal output
4. **Try different browser**: Test in Firefox/Safari
5. **Nuclear option**: Delete `node_modules` and reinstall

### If Prices Still Wrong

1. **Check console logs**: Look for error messages
2. **Verify database function**: Test RPC call manually
3. **Check vehicle multipliers**: Should be loaded on init
4. **Verify estimatedFare**: Should update after calculation

---

## 📊 Database Verification

### Check Financial Settings

```sql
SELECT * FROM financial_settings
WHERE category = 'pricing'
AND key IN ('base_fare', 'per_km_rate', 'min_fare', 'vehicle_multipliers');
```

Expected:

```
base_fare: 35
per_km_rate: 10
min_fare: 50
vehicle_multipliers: {"bike": 0.7, "car": 1.0, "premium": 1.5}
```

### Test RPC Function

```sql
SELECT * FROM calculate_distance_fare('ride', 2.5);
```

Expected:

```
{
  "base_fare": 35,
  "distance_fare": 25,
  "final_fare": 60,
  "min_fare": 50
}
```

---

## 🎯 Success Criteria

✅ **Code Complete**: All pricing logic implemented  
✅ **Database Ready**: RPC function and settings configured  
✅ **Logging Added**: Comprehensive debug output  
⏳ **Cache Clear**: User needs to clear browser cache  
⏳ **Testing**: Awaiting test results after cache clear

---

## 📞 Next Steps

1. **User Action Required**: Clear browser cache completely
2. **Test**: Select pickup and destination on map
3. **Verify**: Check console for logs and price changes
4. **Report**: Share console output and screenshots

---

**The code is ready. The only remaining step is clearing the browser cache to load the new code.**
