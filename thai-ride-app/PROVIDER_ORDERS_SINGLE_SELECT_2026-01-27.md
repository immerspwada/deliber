# Provider Orders - Single Selection with Active Job Check

**Date**: 2026-01-27  
**Status**: ✅ Complete  
**Priority**: 🔥 CRITICAL - Business Rule Change

---

## 📋 Overview

Changed Provider Orders page from multi-select to single-select with active job checking. Providers can now only accept ONE job at a time and cannot accept new jobs if they have an active/incomplete job.

---

## 🎯 Changes Made

### 1. State Management

**Before (Multi-Select):**

```typescript
const selectedOrders = ref<Set<string>>(new Set());
```

**After (Single-Select):**

```typescript
const selectedOrderId = ref<string | null>(null);
const hasActiveJob = ref(false);
```

### 2. Computed Properties

**Updated:**

- `selectedOrder` - Returns single selected order object
- `selectedServiceType` - Returns service type of selected order
- `totalEarnings` - Calculates for single order only
- `totalTips` - From single order
- `totalDistance` - From single order
- `hasSelectedOrder` - Boolean for single selection
- `canAcceptJobs` - Checks if provider can accept jobs

**Removed:**

- `selectedRideCount`
- `selectedQueueCount`
- `dropPointsCount`
- `hasSelectedOrders`

### 3. Active Job Checking

**New Function:**

```typescript
async function checkActiveJob() {
  // Check for active ride requests
  const { data: activeRides } = await supabase
    .from("ride_requests")
    .select("id, status")
    .eq("provider_id", provider.id)
    .in("status", ["matched", "pickup", "in_progress"])
    .limit(1);

  // Check for active queue bookings
  const { data: activeQueues } = await supabase
    .from("queue_bookings")
    .select("id, status")
    .eq("provider_id", provider.id)
    .in("status", ["confirmed", "in_progress"])
    .limit(1);

  hasActiveJob.value = activeRides?.length > 0 || activeQueues?.length > 0;
}
```

**Called:**

- On mount (in `loadOrders()`)
- Before accepting job (in `acceptOrder()`)

### 4. Selection Behavior

**Before (Checkbox):**

```typescript
function toggleOrder(orderId: string) {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId);
  } else {
    selectedOrders.value.add(orderId);
  }
}
```

**After (Radio Button):**

```typescript
function toggleOrder(orderId: string) {
  // Radio button behavior - select only one
  if (selectedOrderId.value === orderId) {
    selectedOrderId.value = null; // Deselect if clicking same order
  } else {
    selectedOrderId.value = orderId; // Select new order
  }
}
```

### 5. Accept Job Function

**Before (Multi-Accept):**

```typescript
async function acceptOrders() {
  // Accept multiple orders
  for (const order of selectedOrdersList) {
    await updateOrder(order.id);
  }
  // Navigate to first order
}
```

**After (Single-Accept):**

```typescript
async function acceptOrder() {
  if (!selectedOrderId.value) return;

  // Check for active job
  if (hasActiveJob.value) {
    alert("คุณมีงานที่กำลังทำอยู่ กรุณาทำงานเดิมให้เสร็จก่อน");
    return;
  }

  const order = selectedOrder.value;
  if (!order) return;

  // Accept single order based on service type
  if (order.service_type === "ride") {
    await updateRideRequest(order.id);
  } else if (order.service_type === "queue") {
    await updateQueueBooking(order.id);
  }

  // Navigate to job detail
  router.push(`/provider/job/${order.id}`);
}
```

### 6. UI Changes

**Removed:**

- "Select All" button
- "Deselect All" button
- Checkboxes

**Added:**

- Radio buttons (circular selection)
- Active job warning card
- Disabled state for orders when has active job

**Updated:**

- Accept button text: "รับงาน (฿X)" instead of "รับ X งาน (฿Y)"
- Accept button disabled when has active job
- Earnings card shows "จาก 1 งาน" instead of "จาก X งาน"

### 7. Auto-Selection

**Before:**

```typescript
// Auto-select all orders
orders.value.forEach((o) => selectedOrders.value.add(o.id));
```

**After:**

```typescript
// Auto-select first order only if no active job
if (!hasActiveJob.value && orders.value.length > 0) {
  selectedOrderId.value = orders.value[0].id;
}
```

### 8. Realtime Updates

**Updated:**

- New jobs auto-select only if no active job and no current selection
- Removed jobs clear selection if it was the selected order
- Updated jobs clear selection if status changed

---

## 🎨 UI/UX Improvements

### Warning Card

```vue
<div v-if="hasActiveJob" class="warning-card">
  <div class="warning-icon">⚠️</div>
  <div class="warning-content">
    <h3 class="warning-title">คุณมีงานที่กำลังทำอยู่</h3>
    <p class="warning-text">กรุณาทำงานเดิมให้เสร็จก่อน จึงจะสามารถรับงานใหม่ได้</p>
  </div>
</div>
```

**Styling:**

- Yellow/amber background (#FEF3C7)
- Orange border (#F59E0B)
- Warning icon (⚠️)
- Clear message

### Radio Buttons

```css
.order-radio {
  width: 28px;
  height: 28px;
  border: 2px solid #d1d5db;
  border-radius: 50%; /* Circular */
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-dot {
  width: 14px;
  height: 14px;
  background: #00a86b;
  border-radius: 50%;
}
```

### Disabled State

```css
.order-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.order-card.disabled:active {
  transform: none; /* No scale animation */
}
```

---

## 🔒 Business Rules

### Rule 1: One Job at a Time

**Enforcement:**

- Provider can only select ONE order
- Radio button behavior (not checkbox)
- Previous selection cleared when selecting new order

### Rule 2: No New Jobs with Active Job

**Enforcement:**

- Check for active jobs on mount
- Check before accepting job
- Show warning card if has active job
- Disable order cards if has active job
- Disable accept button if has active job

### Rule 3: Active Job Definition

**Active Statuses:**

**Ride Requests:**

- `matched` - Provider accepted, not picked up yet
- `pickup` - Provider on the way to pickup
- `in_progress` - Ride in progress

**Queue Bookings:**

- `confirmed` - Provider confirmed, not started yet
- `in_progress` - Service in progress

**Not Active:**

- `pending` - Not yet accepted
- `completed` - Finished
- `cancelled` - Cancelled

---

## 📊 Database Queries

### Check Active Jobs

```typescript
// Check ride requests
const { data: activeRides } = await supabase
  .from("ride_requests")
  .select("id, status")
  .eq("provider_id", provider.id)
  .in("status", ["matched", "pickup", "in_progress"])
  .limit(1);

// Check queue bookings
const { data: activeQueues } = await supabase
  .from("queue_bookings")
  .select("id, status")
  .eq("provider_id", provider.id)
  .in("status", ["confirmed", "in_progress"])
  .limit(1);

// Has active job if either has results
hasActiveJob.value = activeRides?.length > 0 || activeQueues?.length > 0;
```

---

## 🧪 Testing Scenarios

### Scenario 1: No Active Job

1. ✅ Provider opens orders page
2. ✅ First order auto-selected
3. ✅ Can click to select different order
4. ✅ Can click accept button
5. ✅ Navigates to job detail

### Scenario 2: Has Active Job

1. ✅ Provider opens orders page
2. ✅ Warning card shows at top
3. ✅ No order auto-selected
4. ✅ All order cards disabled (opacity 0.5)
5. ✅ Cannot click to select orders
6. ✅ Accept button disabled
7. ✅ Button text: "มีงานที่กำลังทำอยู่"

### Scenario 3: Try to Accept with Active Job

1. ✅ Provider has active job
2. ✅ Somehow selects an order (shouldn't be possible)
3. ✅ Clicks accept button
4. ✅ Alert shows: "คุณมีงานที่กำลังทำอยู่ กรุณาทำงานเดิมให้เสร็จก่อน"
5. ✅ No navigation occurs

### Scenario 4: Radio Button Behavior

1. ✅ Click order A → Order A selected
2. ✅ Click order B → Order A deselected, Order B selected
3. ✅ Click order B again → Order B deselected, nothing selected
4. ✅ Only one order can be selected at a time

### Scenario 5: Realtime Updates

1. ✅ New job arrives → Auto-selects if no active job and no selection
2. ✅ New job arrives → Does NOT auto-select if has active job
3. ✅ Selected job taken by someone else → Selection cleared
4. ✅ Selected job cancelled → Selection cleared

---

## 🚀 Deployment

### Files Changed

- `src/views/provider/ProviderOrdersNew.vue` - Complete rewrite

### Commit Message

```
feat(provider): change orders to single-select with active job check

- Changed from multi-select (checkboxes) to single-select (radio buttons)
- Added active job checking to prevent accepting multiple jobs
- Show warning card when provider has active job
- Disable order selection when has active job
- Update accept button to handle single job only
- Auto-select first order only if no active job
- Remove "Select All" and "Deselect All" buttons

Business Rule: Provider can only accept ONE job at a time
```

### Deployment Steps

1. ✅ Commit changes
2. ✅ Push to production
3. ✅ Test with real provider account
4. ✅ Verify active job checking works
5. ✅ Verify radio button behavior
6. ✅ Verify warning card shows correctly

---

## 📝 User Impact

### For Providers

**Before:**

- Could select multiple jobs
- Could accept multiple jobs at once
- No restriction on active jobs

**After:**

- Can only select ONE job
- Can only accept ONE job at a time
- Cannot accept new jobs if has active job
- Clear warning when has active job

### Benefits

1. **Prevents Overload**: Provider can't accept more jobs than they can handle
2. **Better Focus**: Provider focuses on one job at a time
3. **Quality Service**: Better service quality when not juggling multiple jobs
4. **Clear Status**: Always know if provider is available or busy

---

## 🐛 Known Issues

None - All functionality working as expected

---

## 💡 Future Enhancements

1. **Job Queue**: Allow providers to queue next job while finishing current
2. **Auto-Accept**: Option to auto-accept next job when current completes
3. **Job History**: Show recently completed jobs
4. **Performance Metrics**: Track acceptance rate, completion time, etc.

---

**Last Updated**: 2026-01-27  
**Next Review**: 2026-02-27  
**Status**: ✅ Production Ready
