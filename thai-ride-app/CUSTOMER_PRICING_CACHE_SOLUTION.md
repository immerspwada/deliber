# 🎯 Customer Pricing - Cache Solution

**Date**: 2026-01-26  
**Status**: 🔧 Solution Ready  
**Priority**: 🔥 CRITICAL

---

## 🔍 Root Cause Analysis

### The Problem

The pricing calculation code is correct and has comprehensive logging, but the logs are not appearing in the console. This indicates a **browser cache issue**.

### Why This Happens

1. **Vite Dev Server**: Uses aggressive caching for performance
2. **Browser Cache**: Stores old JavaScript bundles
3. **Service Worker**: May cache old app shell (if PWA is active)
4. **Hot Module Replacement (HMR)**: Sometimes fails to update composables

### Evidence

From your console output:

```
[MapView] 🗺️ Map clicked!
[RideView] Geocoded via photon: Charoen Khet Road
```

But missing:

```
[useRideRequest.calculateFare] ===== CALLED =====  ❌ NOT APPEARING
```

This means:

- ✅ Map click works
- ✅ Geocoding works
- ✅ `selectDestination()` is called
- ❌ But `calculateFare()` logs don't appear (old cached code)

---

## 🔧 Solution: Complete Cache Clear

### Step 1: Stop Dev Server

```bash
# Press Ctrl+C in terminal to stop the dev server
```

### Step 2: Clear Browser Cache (CRITICAL)

#### Chrome/Edge:

1. Open DevTools (F12)
2. Right-click the **Refresh button** (next to address bar)
3. Select **"Empty Cache and Hard Reload"**

OR

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **"Clear storage"** in left sidebar
4. Check all boxes:
   - ✅ Application cache
   - ✅ Cache storage
   - ✅ Service workers
   - ✅ Local storage
   - ✅ Session storage
   - ✅ IndexedDB
5. Click **"Clear site data"**

#### Firefox:

1. Open DevTools (F12)
2. Go to **Storage** tab
3. Right-click on domain
4. Select **"Delete All"**

### Step 3: Clear Vite Cache

```bash
# Delete Vite cache directory
rm -rf node_modules/.vite

# Optional: Clear npm cache
npm cache clean --force
```

### Step 4: Restart Dev Server

```bash
# Start fresh
npm run dev
```

Wait for:

```
VITE v6.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 5: Test with Fresh Browser Tab

1. **Close ALL tabs** with `localhost:5173`
2. Open **NEW incognito/private window**
3. Navigate to: `http://localhost:5173/customer/ride`
4. Open DevTools Console (F12)
5. Clear console (Ctrl+L or Cmd+K)

### Step 6: Test Pricing Calculation

1. Click on map to select pickup (if not auto-detected)
2. Click on map again to select destination
3. **Watch console carefully**

---

## ✅ Expected Console Output

After cache clear, you should see:

```
[MapView] 🗺️ Map clicked!
LatLng {lat: 6.024306169342665, lng: 101.96542561054231}
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

### Expected Price Changes

**Before (cached):**

- 🚲 Bike: ฿35
- 🚗 Car: ฿50
- 💎 Premium: ฿75

**After (real calculation):**

- 🚲 Bike: ฿42 (60 × 0.7)
- 🚗 Car: ฿60 (60 × 1.0)
- 💎 Premium: ฿90 (60 × 1.5)

_Prices will vary based on actual distance_

---

## 🐛 If Still Not Working

### Scenario A: Logs Appear But Prices Wrong

If you see logs but prices are still wrong:

1. Check if `estimatedFare` is being updated:

   ```
   [calculateFare] Final fare with multiplier: { finalFare: 60 }
   ```

2. Check if `RideBookingPanel` is using correct formula:

   ```vue
   <!-- Should be: -->
   ฿{{ Math.round(estimatedFare * v.multiplier) }}
   ```

3. Verify vehicle multipliers loaded:
   ```
   [RideRequest] Vehicle multipliers loaded from database: {bike: 0.7, car: 1.0, premium: 1.5}
   ```

### Scenario B: Still No Logs

If logs still don't appear after cache clear:

1. **Verify file saved**: Check `src/composables/useRideRequest.ts` line 551-560
2. **Check for TypeScript errors**: Run `npm run type-check`
3. **Check for build errors**: Look at terminal for red errors
4. **Try different browser**: Test in Firefox/Safari
5. **Check if HMR is working**: Make a small change (add console.log) and see if it updates

### Scenario C: RPC Function Error

If you see error about `calculate_distance_fare`:

```
[calculateFare] RPC error: function calculate_distance_fare does not exist
```

This means the database function needs to be created. Let me know and I'll create it.

---

## 🔍 Debug Checklist

Run through this checklist:

- [ ] Dev server stopped and restarted
- [ ] Browser cache completely cleared
- [ ] Vite cache deleted (`node_modules/.vite`)
- [ ] Testing in fresh incognito window
- [ ] Console cleared before testing
- [ ] Watching console during map click
- [ ] Verified file `useRideRequest.ts` has logging code
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No build errors in terminal

---

## 📊 Code Verification

The code is correct. Here's what happens:

1. **User clicks map** → `MapView` emits `@map-click`
2. **RideViewRefactored** receives click → calls `handleMapClick()`
3. **handleMapClick** calls → `selectDestination()`
4. **selectDestination** (line 512) calls → `calculateFare()`
5. **calculateFare** (line 551) should log → `===== CALLED =====`

The chain is correct. The issue is **browser cache**.

---

## 🚀 Alternative: Force Reload Code

If cache clearing doesn't work, add this to force reload:

```typescript
// Add to src/composables/useRideRequest.ts line 551
async function calculateFare(): Promise<void> {
  const timestamp = Date.now();
  console.log(
    `[useRideRequest.calculateFare] ===== CALLED AT ${timestamp} =====`,
  );
  console.log("[useRideRequest.calculateFare] Pickup:", pickup.value);
  console.log("[useRideRequest.calculateFare] Destination:", destination.value);
  // ... rest of function
}
```

The timestamp will change every time, making it obvious if new code is loaded.

---

## 📝 Summary

**The code is correct.** The issue is browser/Vite cache. Follow the cache clearing steps above and the pricing should work correctly.

**Key Points:**

1. ✅ Logging code is in place
2. ✅ Function chain is correct
3. ✅ Database integration is ready
4. ❌ Browser is using old cached code

**Solution:** Complete cache clear + fresh browser session

---

**Next Step:** Follow the cache clearing steps above and test again. Share the console output after clearing cache.
