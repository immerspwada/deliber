# 🔍 Customer Pricing - Enhanced Logging

**Date**: 2026-01-26  
**Status**: ✅ Enhanced Logging Added  
**Priority**: 🔥 CRITICAL - Debug Cache Issue

---

## 🎯 Problem

User clicks on map to select destination, but:

- ❌ No logs appear in console from `selectDestination()` or `calculateFare()`
- ❌ Prices remain at B35, B50, B75 (likely cached values)
- ✅ Map click and geocoding logs DO appear
- ✅ Dev server restarted multiple times
- ✅ Browser cache cleared multiple times (Cmd+Shift+R, Incognito)

**Root Cause**: Suspected browser cache issue or code path not being executed

---

## 🔧 Solution: Enhanced Logging

Added **comprehensive, color-coded logging** to trace the complete execution path:

### 1. Map Click Handler (`RideViewRefactored.vue`)

```typescript
async function handleMapClick(coords: { lat: number; lng: number }): Promise<void> {
  console.log('%c[RideViewRefactored.handleMapClick] ===== MAP CLICKED =====',
    'background: #9c27b0; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
  console.log('[RideViewRefactored.handleMapClick] 📍 Coordinates:', coords)

  // ... haptic feedback ...

  const tempAddress = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
  console.log('[RideViewRefactored.handleMapClick] 🏷️ Temp address:', tempAddress)

  console.log('[RideViewRefactored.handleMapClick] 🎯 Calling selectDestination()...')
  selectDestination({ ... })
  console.log('[RideViewRefactored.handleMapClick] ✅ selectDestination() called')

  // ... geocoding ...

  console.log('%c[RideViewRefactored.handleMapClick] ===== COMPLETED =====',
    'background: #9c27b0; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
}
```

**Color**: 🟣 Purple background

### 2. Select Destination (`useRideRequest.ts`)

```typescript
function selectDestination(place: { name: string; address: string; lat: number; lng: number }): void {
  console.log('%c[useRideRequest.selectDestination] ===== CALLED =====',
    'background: #ff9800; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
  console.log('[useRideRequest.selectDestination] 📍 Place:', JSON.stringify(place))
  console.log('[useRideRequest.selectDestination] 🚗 Current vehicle:', selectedVehicle.value)

  destination.value = { ... }
  console.log('[useRideRequest.selectDestination] ✅ Destination set to:', JSON.stringify(destination.value))

  console.log('[useRideRequest.selectDestination] 🧮 About to call calculateFare()...')
  calculateFare()
  console.log('[useRideRequest.selectDestination] ✅ calculateFare() called')

  console.log('%c[useRideRequest.selectDestination] ===== COMPLETED =====',
    'background: #ff9800; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
}
```

**Color**: 🟠 Orange background

### 3. Calculate Fare (`useRideRequest.ts`)

```typescript
async function calculateFare(): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`%c[useRideRequest.calculateFare] ===== CALLED AT ${timestamp} =====`,
    'background: #00a86b; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
  console.log('[useRideRequest.calculateFare] Pickup:', JSON.stringify(pickup.value))
  console.log('[useRideRequest.calculateFare] Destination:', JSON.stringify(destination.value))
  console.log('[useRideRequest.calculateFare] Selected vehicle:', selectedVehicle.value)
  console.log('[useRideRequest.calculateFare] Vehicle multipliers:', JSON.stringify(vehicleMultipliers.value))

  if (!pickup.value || !destination.value) {
    console.warn('[useRideRequest.calculateFare] ⚠️ Missing pickup or destination, returning')
    return
  }

  console.log('[useRideRequest.calculateFare] 📍 Calculating distance...')
  const dist = calculateDistance(...)
  console.log(`%c[useRideRequest.calculateFare] ✅ Distance: ${dist.toFixed(2)} km`,
    'color: #00a86b; font-weight: bold;')

  console.log('[useRideRequest.calculateFare] ⏱️ Estimated time:', estimatedTime.value, 'minutes')

  try {
    console.log('[useRideRequest.calculateFare] 🔌 Calling RPC: calculate_distance_fare...')
    const { data, error: rpcError } = await supabase.rpc('calculate_distance_fare', { ... })

    console.log('[useRideRequest.calculateFare] 📦 RPC Response:', { data, error: rpcError })

    if (rpcError) {
      console.error('%c[calculateFare] ❌ RPC error:', 'color: red; font-weight: bold;', rpcError)
      // ... fallback ...
      console.log('[calculateFare] 🔄 Using fallback pricing:', baseFare)
    } else if (data && Array.isArray(data) && data.length > 0) {
      baseFare = Number(data[0].final_fare)
      console.log('%c[calculateFare] ✅ Database base fare:', 'color: #00a86b; font-weight: bold;', {
        distance: dist,
        baseFare,
        breakdown: data[0]
      })
    } else {
      console.warn('[calculateFare] ⚠️ No data from RPC, using fallback')
      // ... fallback ...
      console.log('[calculateFare] 🔄 Using fallback pricing:', baseFare)
    }

    // Apply multiplier
    const vehicleType = selectedVehicle.value as VehicleType
    const multiplier = vehicleMultipliers.value[vehicleType] || 1.0
    estimatedFare.value = Math.round(baseFare * multiplier)

    console.log('%c[calculateFare] 🎯 Final fare with multiplier:',
      'background: #1976d2; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;', {
      baseFare,
      vehicleType,
      multiplier,
      finalFare: estimatedFare.value,
      source: 'database'
    })
  } catch (error) {
    console.error('%c[calculateFare] 💥 Exception:', 'color: red; font-weight: bold;', error)
    // ... fallback ...
    console.log('[calculateFare] 🔄 Exception fallback fare:', estimatedFare.value)
  }

  console.log(`%c[useRideRequest.calculateFare] ===== COMPLETED =====`,
    'background: #00a86b; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;')
}
```

**Color**: 🟢 Green background

---

## 📊 Expected Console Output

When user clicks on map, you should see this sequence:

```
🟣 [RideViewRefactored.handleMapClick] ===== MAP CLICKED =====
   [RideViewRefactored.handleMapClick] 📍 Coordinates: {lat: 13.7563, lng: 100.5018}
   [RideViewRefactored.handleMapClick] 🏷️ Temp address: 13.7563, 100.5018
   [RideViewRefactored.handleMapClick] 🎯 Calling selectDestination()...

   🟠 [useRideRequest.selectDestination] ===== CALLED =====
      [useRideRequest.selectDestination] 📍 Place: {"name":"13.7563, 100.5018",...}
      [useRideRequest.selectDestination] 🚗 Current vehicle: car
      [useRideRequest.selectDestination] ✅ Destination set to: {...}
      [useRideRequest.selectDestination] 🧮 About to call calculateFare()...

      🟢 [useRideRequest.calculateFare] ===== CALLED AT 2026-01-26T... =====
         [useRideRequest.calculateFare] Pickup: {...}
         [useRideRequest.calculateFare] Destination: {...}
         [useRideRequest.calculateFare] Selected vehicle: car
         [useRideRequest.calculateFare] Vehicle multipliers: {"bike":0.7,"car":1.0,"premium":1.5}
         [useRideRequest.calculateFare] 📍 Calculating distance...
         [useRideRequest.calculateFare] ✅ Distance: 5.23 km
         [useRideRequest.calculateFare] ⏱️ Estimated time: 15 minutes
         [useRideRequest.calculateFare] 🔌 Calling RPC: calculate_distance_fare...
         [useRideRequest.calculateFare] 📦 RPC Response: {data: [...], error: null}
         [calculateFare] ✅ Database base fare: {distance: 5.23, baseFare: 87.3, ...}
         [calculateFare] 🎯 Final fare with multiplier: {baseFare: 87.3, vehicleType: "car", multiplier: 1.0, finalFare: 87}
      🟢 [useRideRequest.calculateFare] ===== COMPLETED =====

      [useRideRequest.selectDestination] ✅ calculateFare() called
   🟠 [useRideRequest.selectDestination] ===== COMPLETED =====

   [RideViewRefactored.handleMapClick] ✅ selectDestination() called
   [RideViewRefactored.handleMapClick] 🌍 Starting background geocoding...
🟣 [RideViewRefactored.handleMapClick] ===== COMPLETED =====
```

---

## 🧪 Testing Instructions

### 1. Hard Refresh Browser

```bash
# macOS
Cmd + Shift + R

# Or use Incognito/Private window
Cmd + Shift + N (Chrome)
Cmd + Shift + P (Firefox)
```

### 2. Clear All Caches

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

### 3. Test Map Click

1. Open http://localhost:5173/customer/ride
2. Open DevTools Console (Cmd+Option+J)
3. Click on map to select destination
4. **Look for colored logs** in console:
   - 🟣 Purple: Map click handler
   - 🟠 Orange: Select destination
   - 🟢 Green: Calculate fare

### 4. Verify Prices Update

After clicking map, check if prices change from:

- ❌ B35, B50, B75 (old cached values)
- ✅ B87, B61, B131 (new calculated values based on distance)

---

## 🔍 Diagnostic Scenarios

### Scenario A: No Logs at All

**Symptoms**:

- No colored logs appear
- Only see geocoding logs

**Diagnosis**: Browser is using cached JavaScript

**Solution**:

1. Force reload: Cmd+Shift+R
2. Try Incognito window
3. Clear browser cache completely
4. Check Network tab - verify `useRideRequest.ts` is loaded with new timestamp

### Scenario B: Logs Appear but Prices Don't Update

**Symptoms**:

- ✅ All colored logs appear
- ✅ `calculateFare()` shows correct values
- ❌ UI still shows old prices

**Diagnosis**: Reactive state not updating UI

**Solution**:

1. Check if `estimatedFare` ref is being updated
2. Check if `RideBookingPanel` is receiving new props
3. Verify `v-memo` dependencies in `RideBookingPanel.vue`

### Scenario C: Logs Show Error

**Symptoms**:

- ✅ Logs appear
- ❌ RPC error or exception

**Diagnosis**: Database function issue

**Solution**:

1. Check RPC function exists: `calculate_distance_fare`
2. Verify database connection
3. Check Supabase logs

### Scenario D: Distance is 0

**Symptoms**:

- ✅ Logs appear
- ❌ Distance shows 0 km
- ❌ Prices remain at minimum fare

**Diagnosis**: Pickup or destination coordinates invalid

**Solution**:

1. Check pickup coordinates are set
2. Verify destination coordinates from map click
3. Check `calculateDistance()` function

---

## 📝 Files Modified

1. **src/composables/useRideRequest.ts**
   - Enhanced `selectDestination()` with detailed logging
   - Enhanced `calculateFare()` with step-by-step logging
   - Added color-coded console messages
   - Added emoji indicators for better visibility

2. **src/views/customer/RideViewRefactored.vue**
   - Enhanced `handleMapClick()` with detailed logging
   - Added execution flow tracking
   - Added geocoding result logging

---

## 🎯 Next Steps

1. **User Action Required**:
   - Hard refresh browser (Cmd+Shift+R)
   - Open DevTools Console
   - Click on map
   - Report what logs appear (if any)

2. **If No Logs Appear**:
   - Try Incognito window
   - Check Network tab for file loading
   - Verify dev server is running latest code

3. **If Logs Appear**:
   - Share console output
   - Check if prices update in UI
   - Verify calculated values are correct

---

## 🔗 Related Files

- `src/composables/useRideRequest.ts` - Main pricing logic
- `src/views/customer/RideViewRefactored.vue` - Map click handler
- `src/components/ride/RideBookingPanel.vue` - Price display
- `CUSTOMER_PRICING_READY_TO_TEST.md` - Previous status
- `CUSTOMER_PRICING_CACHE_SOLUTION.md` - Cache clearing guide

---

**Status**: ✅ Enhanced logging added - Ready for testing  
**Next**: User needs to refresh and test with new logging
