# 🔍 Customer Pricing Handler Debug Guide

**Date**: 2026-01-26  
**Status**: 🐛 Debugging  
**Issue**: Destination selection not triggering price calculation

---

## 🎯 Problem Summary

User reports that when selecting a destination on the map:

- Prices remain at B35, B50, B75 (hardcoded demo values)
- No console logs appear from `calculateFare()` or `watch(estimatedDistance)`
- This indicates the destination selection handler is NOT calling `calculateFare()`

---

## 🔍 Diagnosis Steps Added

### 1. Added Logging to All Destination Handlers

I've added comprehensive logging to these functions:

#### `handleDestinationPickerSelect` (Line ~990)

```typescript
console.log("[handleDestinationPickerSelect] ===== CALLED =====");
console.log("[handleDestinationPickerSelect] Place:", place);
// ... sets destination ...
console.log("[handleDestinationPickerSelect] About to call calculateFare()");
await calculateFare();
console.log("[handleDestinationPickerSelect] calculateFare() completed");
```

#### `handleMapPickerConfirm` (Line ~880)

```typescript
console.log("[handleMapPickerConfirm] ===== CALLED =====");
console.log("[handleMapPickerConfirm] Type:", type, "Location:", location);
// ... sets destination ...
console.log("[handleMapPickerConfirm] About to call calculateFare()");
await calculateFare();
console.log("[handleMapPickerConfirm] calculateFare() completed");
```

#### `selectDestPlaceQuick` (Line ~1210)

```typescript
console.log("[selectDestPlaceQuick] ===== CALLED =====");
console.log("[selectDestPlaceQuick] Place:", place);
// ... sets destination ...
console.log("[selectDestPlaceQuick] About to call calculateFare()");
await calculateFare();
console.log("[selectDestPlaceQuick] calculateFare() completed");
```

---

## 🧪 Testing Instructions

### Step 1: Clear Console

1. Open browser DevTools (F12)
2. Clear console (Ctrl+L or Cmd+K)

### Step 2: Select Pickup

1. Go to http://localhost:5173/customer/ride
2. Select "Clothes" as pickup location
3. Check console for logs

### Step 3: Select Destination

1. Select "Tara Regent Hotel" as destination
2. **Watch console carefully** - you should see ONE of these:
   - `[handleDestinationPickerSelect] ===== CALLED =====`
   - `[handleMapPickerConfirm] ===== CALLED =====`
   - `[selectDestPlaceQuick] ===== CALLED =====`
   - Or some other handler name

### Step 4: Report Results

Copy ALL console output and report:

- Which handler was called (if any)
- Whether `calculateFare()` was called
- Whether `watch(estimatedDistance)` triggered
- Any error messages

---

## 🔎 Possible Scenarios

### Scenario A: No Handler Called

**Symptoms**: No logs appear at all when selecting destination

**Cause**: The UI element clicked is NOT connected to any handler

**Solution**: Need to find which component/element is being clicked and add the handler

### Scenario B: Handler Called But No calculateFare

**Symptoms**: Handler logs appear but no `calculateFare()` logs

**Cause**: Handler sets destination but doesn't call `calculateFare()`

**Solution**: Add `await calculateFare()` to that handler

### Scenario C: calculateFare Called But No Distance

**Symptoms**: `calculateFare()` logs appear but distance stays 0

**Cause**: Distance calculation failing or locations invalid

**Solution**: Check location coordinates and distance calculation

### Scenario D: Distance Set But No Watch Trigger

**Symptoms**: Distance changes but `watch(estimatedDistance)` doesn't fire

**Cause**: Watch not properly configured or reactive issue

**Solution**: Check watch configuration and reactivity

---

## 📋 All Destination Handlers in RideView.vue

Here's a complete list of functions that set `destinationLocation.value`:

1. ✅ **handleDestinationPickerSelect** (Line 990) - Has logging + calls calculateFare
2. ✅ **handleMapPickerConfirm** (Line 880) - Has logging + calls calculateFare
3. ✅ **selectDestPlaceQuick** (Line 1210) - Has logging + calls calculateFare
4. ⚠️ **onMounted pendingDest** (Line 70) - NO calculateFare call
5. ⚠️ **useRecurringTemplate** (Line 306) - Calls calculateFare
6. ⚠️ **handleNearbyPlaceSelect** (Line 897) - Calls calculateFare
7. ⚠️ **confirmTapSelectedDestination** (Line 961) - Calls calculateFare
8. ⚠️ **selectSavedPlaceEnhanced** (Line 1181) - Calls calculateFare
9. ⚠️ **selectRecentPlaceEnhanced** (Line 1197) - Calls calculateFare
10. ⚠️ **selectFavoritePlaceEnhanced** (Line 1230) - Calls calculateFare

---

## 🎯 Next Steps

1. **Run the test** with the new logging
2. **Identify which handler** (if any) is being called
3. **If no handler is called**: Find the UI element and connect it
4. **If handler is called**: Verify it calls `calculateFare()`
5. **If calculateFare is called**: Debug why distance isn't calculated

---

## 🔧 Quick Fixes

### If No Handler Is Called

The user might be clicking on a UI element that's not connected to any handler. Common culprits:

1. **Popular destination chips** in the UI
2. **Recent places** list items
3. **Map markers** that don't have click handlers
4. **Search results** that don't call handlers

### If Handler Doesn't Call calculateFare

Add this line to the handler:

```typescript
await calculateFare();
```

### If calculateFare Doesn't Calculate Distance

Check that both locations are set:

```typescript
console.log("Pickup:", pickupLocation.value);
console.log("Destination:", destinationLocation.value);
```

---

## 📊 Expected Console Output

When working correctly, you should see:

```
[handleDestinationPickerSelect] ===== CALLED =====
[handleDestinationPickerSelect] Place: { name: "Tara Regent Hotel", ... }
[handleDestinationPickerSelect] destinationLocation set: { lat: ..., lng: ..., address: ... }
[handleDestinationPickerSelect] About to call calculateFare()
[calculateFare] Distance calculated: 2.5 km
[watch estimatedDistance] ===== START =====
[watch estimatedDistance] Distance changed from 0 to 2.5
[watch estimatedDistance] Calculating fares for all vehicle types...
[watch estimatedDistance] Fares calculated: { car: 60, bike: 42, premium: 90 }
[watch estimatedDistance] rideTypeFares updated: { standard: 60, shared: 42, premium: 90 }
[watch estimatedDistance] ===== END =====
[handleDestinationPickerSelect] calculateFare() completed
```

---

**Last Updated**: 2026-01-26  
**Status**: Awaiting test results with new logging
