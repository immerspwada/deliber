# 🐛 Customer Pricing Debug Guide

**Date**: 2026-01-26  
**Issue**: Prices not updating when changing destination  
**Status**: 🔍 Debugging

---

## 🔍 What We've Done

### 1. Created RPC Function ✅

- `calculate_distance_fare` function exists in database
- Reads pricing from `financial_settings` table
- Permissions granted to authenticated users

### 2. Fixed Distance Calculation ✅

- Removed conditional check in `calculateFare()`
- Distance now recalculates every time destination changes

### 3. Added Enhanced Debug Logging ✅

- Added detailed console logs to track the flow
- Shows old and new distance values
- Shows calculated fares for all vehicle types

---

## 🧪 How to Test

### Step 1: Open Browser Console

1. Open `http://localhost:5173/customer/ride`
2. Press `F12` or `Cmd+Option+I` (Mac) to open DevTools
3. Go to "Console" tab
4. Clear console (click 🚫 icon)

### Step 2: Select Pickup Location

1. Click on "Clothes" (pickup location)
2. **Expected Console Output**: Nothing yet (no distance calculated)

### Step 3: Select Destination

1. Click on "Tara Regent Hotel" (destination)
2. **Expected Console Output**:

```
[calculateFare] Distance calculated: 0.6 km
[calculateFare] Fare from database: 50
[watch estimatedDistance] ===== START =====
[watch estimatedDistance] Distance changed from 0 to 0.6
[watch estimatedDistance] Calculating fares for all vehicle types...
[calculateFareFromDatabase] Success: { distance: 0.6, ... }
[watch estimatedDistance] Fares calculated: { car: 50, bike: 35, premium: 75 }
[watch estimatedDistance] rideTypeFares updated: { standard: 50, shared: 35, premium: 75 }
[watch estimatedDistance] ===== END =====
```

### Step 4: Check UI

**Expected**: Prices should show:

- มอเตอร์ไซค์ (Bike): ฿35
- รถยนต์ (Car): ฿50
- พรีเมียม (Premium): ฿75

### Step 5: Change Destination

1. Click "เปลี่ยนปลายทาง" (Change destination)
2. Select a different location (e.g., further away)
3. **Expected Console Output**:

```
[calculateFare] Distance calculated: 5.0 km
[calculateFare] Fare from database: 85
[watch estimatedDistance] ===== START =====
[watch estimatedDistance] Distance changed from 0.6 to 5.0
[watch estimatedDistance] Calculating fares for all vehicle types...
[watch estimatedDistance] Fares calculated: { car: 85, bike: 60, premium: 128 }
[watch estimatedDistance] rideTypeFares updated: { standard: 85, shared: 60, premium: 128 }
[watch estimatedDistance] ===== END =====
```

### Step 6: Check UI Again

**Expected**: Prices should UPDATE to:

- มอเตอร์ไซค์ (Bike): ฿60
- รถยนต์ (Car): ฿85
- พรีเมียม (Premium): ฿128

---

## 🐛 Debugging Scenarios

### Scenario 1: No Console Logs at All

**Problem**: `watch(estimatedDistance)` not triggering

**Check**:

1. Is `estimatedDistance` actually changing?
2. Look for `[calculateFare] Distance calculated:` log
3. If you see this but no watch logs, the watch is not set up correctly

**Solution**: Check if watch is defined correctly in the code

### Scenario 2: Console Shows "Distance changed from 0 to 0"

**Problem**: Distance calculation returning 0

**Check**:

1. Are pickup and destination locations valid?
2. Check `pickupLocation.value` and `destinationLocation.value`
3. Look for `[calculateFare] Distance calculated: 0 km`

**Solution**: Fix the `calculateDistance()` function or location selection

### Scenario 3: Console Shows Error

**Problem**: RPC function call failing

**Example Error**:

```
[watch estimatedDistance] Error calculating fares: Error: ...
[watch estimatedDistance] Fallback fares: { standard: 35, shared: 25, premium: 50 }
```

**Check**:

1. Is RPC function `calculate_distance_fare` created?
2. Are permissions granted?
3. Is `financial_settings` table accessible?

**Solution**: Run database verification queries

### Scenario 4: Fares Calculated but UI Not Updating

**Problem**: Reactivity issue

**Check**:

1. Console shows: `[watch estimatedDistance] rideTypeFares updated: { ... }`
2. But UI still shows old prices

**Possible Causes**:

- Template not reactive to `rideTypeFares` changes
- Vue not detecting the object change
- Component not re-rendering

**Solution**: Check template binding and reactivity

### Scenario 5: Prices Show 0 or "คำนวณ..."

**Problem**: Fares not being set correctly

**Check**:

1. Console shows fares calculated: `{ car: 85, bike: 60, premium: 128 }`
2. But `rideTypeFares.value` is `{ standard: 0, shared: 0, premium: 0 }`

**Possible Causes**:

- Async timing issue
- Promise not resolving
- Error in calculation

**Solution**: Check if `calculateFareFromDatabase` is returning values

---

## 🔧 Database Verification

If you suspect database issues, run these queries:

### Check RPC Function Exists

```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'calculate_distance_fare';
```

**Expected**: Should return 1 row with function definition

### Check Permissions

```sql
SELECT proname, proacl
FROM pg_proc
WHERE proname = 'calculate_distance_fare';
```

**Expected**: Should show `authenticated=X` and `anon=X` in proacl

### Check Pricing Data

```sql
SELECT
  key,
  value->'ride' as ride_pricing,
  updated_at
FROM financial_settings
WHERE category = 'pricing'
  AND key = 'distance_rates';
```

**Expected**: Should return current pricing configuration

### Test RPC Function Directly

```sql
SELECT * FROM calculate_distance_fare('ride', 5.0);
```

**Expected**: Should return fare breakdown with `final_fare` around 85

---

## 📊 Expected Values

### For 0.6 km Trip (Min Fare Applied)

```
Base calculation: 35 + (0.6 × 10) = 41 THB
Apply min_fare: max(50, 41) = 50 THB

Vehicle multipliers:
- Car (standard):  50 × 1.0 = 50 THB
- Bike (shared):   50 × 0.7 = 35 THB
- Premium:         50 × 1.5 = 75 THB
```

### For 5 km Trip

```
Base calculation: 35 + (5 × 10) = 85 THB
Apply constraints: max(50, min(1000, 85)) = 85 THB

Vehicle multipliers:
- Car (standard):  85 × 1.0 = 85 THB
- Bike (shared):   85 × 0.7 = 60 THB (rounded)
- Premium:         85 × 1.5 = 128 THB (rounded)
```

### For 10 km Trip

```
Base calculation: 35 + (10 × 10) = 135 THB
Apply constraints: max(50, min(1000, 135)) = 135 THB

Vehicle multipliers:
- Car (standard):  135 × 1.0 = 135 THB
- Bike (shared):   135 × 0.7 = 95 THB (rounded)
- Premium:         135 × 1.5 = 203 THB (rounded)
```

---

## 🎯 What to Look For

### ✅ Success Indicators

1. Console shows `[watch estimatedDistance] ===== START =====`
2. Console shows distance changing: `Distance changed from X to Y`
3. Console shows fares calculated: `{ car: XX, bike: XX, premium: XX }`
4. Console shows `rideTypeFares updated`
5. UI shows correct prices matching console values
6. Prices update when destination changes

### ❌ Failure Indicators

1. No console logs when selecting destination
2. Distance always shows 0
3. Fares always show 0 or old values
4. Error messages in console
5. UI shows "คำนวณ..." forever
6. Prices don't change when destination changes

---

## 🚀 Next Steps Based on Results

### If Console Logs Show Correct Values But UI Doesn't Update

**Problem**: Template reactivity issue

**Actions**:

1. Check template binding: `rideTypeFares[type.value]`
2. Verify `type.value` matches keys in `rideTypeFares`
3. Check if component is re-rendering
4. Try force update or key change

### If Console Shows No Logs

**Problem**: Watch not triggering

**Actions**:

1. Check if `estimatedDistance` is a ref
2. Verify watch is set up correctly
3. Check if `calculateFare()` is being called
4. Add log in `calculateFare()` to confirm execution

### If Console Shows Errors

**Problem**: RPC function or database issue

**Actions**:

1. Verify RPC function exists
2. Check permissions
3. Test function directly in database
4. Check network tab for failed requests

### If Fares Are Wrong

**Problem**: Calculation or pricing configuration issue

**Actions**:

1. Check `financial_settings` table values
2. Verify vehicle multipliers
3. Test RPC function with known values
4. Check if admin pricing changes are saved

---

## 📝 Report Template

When reporting issues, please provide:

```
### Environment
- URL: http://localhost:5173/customer/ride
- Browser: [Chrome/Firefox/Safari]
- Browser Version: [version]

### Steps Taken
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Console Output
```

[Paste console logs here]

```

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Screenshots
[If applicable]
```

---

**Status**: 🔍 **DEBUGGING IN PROGRESS**  
**Next Action**: Test in browser and check console logs  
**Expected Time**: 5-10 minutes

Once you test and provide console output, we can identify the exact issue and fix it immediately.
