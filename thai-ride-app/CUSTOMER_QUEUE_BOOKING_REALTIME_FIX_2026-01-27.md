# 🔴 Customer Queue Booking Realtime - Missing Subscription

**Date**: 2026-01-27  
**Job ID**: QUE-20260127-6257  
**Status**: 🔴 CRITICAL - Customer not receiving status updates  
**Priority**: 🔥 URGENT

---

## 🚨 Problem

**Symptom**:

- ✅ Provider accepts job → Status changes to `confirmed` in database
- ✅ Admin sees status change immediately
- ❌ **Customer does NOT see status change** - UI still shows "รอไรเดอร์รับงาน"

**Root Cause**: `QueueBookingView.vue` **does NOT subscribe to realtime updates**!

---

## 🔍 Analysis

### Current State

**useQueueBooking Composable** (✅ Has realtime function):

```typescript
// src/composables/useQueueBooking.ts

// ✅ Function exists
function subscribeToBooking(bookingId: string): void {
  unsubscribe();

  realtimeChannel = supabase
    .channel(`queue_booking_${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "queue_bookings",
        filter: `id=eq.${bookingId}`,
      },
      (payload) => {
        if (payload.eventType === "UPDATE") {
          const updated = payload.new as QueueBooking;
          currentBooking.value = updated;
          // Update in list too
          const index = bookings.value.findIndex((b) => b.id === updated.id);
          if (index !== -1) {
            bookings.value[index] = updated;
          }
        }
      },
    )
    .subscribe();
}
```

**QueueBookingView.vue** (❌ NOT using it):

```vue
<script setup lang="ts">
import { useQueueBooking } from "../composables/useQueueBooking";

const {
  createQueueBooking,
  loading,
  error: bookingError,
  walletBalance,
  // ❌ Missing: subscribeToBooking, unsubscribe
} = useQueueBooking();

// ❌ No subscription setup!
// ❌ No onMounted to subscribe
// ❌ No onUnmounted to unsubscribe
</script>
```

---

## 🛠️ Solution

### Step 1: Import Realtime Functions

```typescript
const {
  createQueueBooking,
  loading,
  error: bookingError,
  walletBalance,
  subscribeToBooking, // ✅ Add
  unsubscribe, // ✅ Add
  currentBooking, // ✅ Add (to watch for updates)
} = useQueueBooking();
```

### Step 2: Subscribe After Booking Created

```typescript
// After successful booking creation
const booking = await createQueueBooking(bookingData);

if (booking) {
  // ✅ Subscribe to realtime updates
  subscribeToBooking(booking.id);

  // Navigate to tracking/status page
  router.push(`/queue-booking/${booking.id}`);
}
```

### Step 3: Watch for Status Changes

```typescript
import { watch } from "vue";

// Watch for status updates
watch(
  () => currentBooking.value?.status,
  (newStatus, oldStatus) => {
    if (newStatus && newStatus !== oldStatus) {
      console.log("📡 Status updated:", oldStatus, "→", newStatus);

      // Show notification
      if (newStatus === "confirmed") {
        showSuccess("✅ ไรเดอร์รับงานแล้ว!");
      } else if (newStatus === "in_progress") {
        showSuccess("🚗 ไรเดอร์กำลังเดินทาง");
      } else if (newStatus === "completed") {
        showSuccess("🎉 งานเสร็จสิ้น!");
      }
    }
  },
);
```

### Step 4: Cleanup on Unmount

```typescript
import { onUnmounted } from "vue";

onUnmounted(() => {
  unsubscribe();
});
```

---

## 📝 Complete Implementation

### QueueBookingView.vue (Updated)

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import {
  useQueueBooking,
  type CreateQueueBookingInput,
} from "../composables/useQueueBooking";
import { useToast } from "../composables/useToast";

const router = useRouter();
const {
  createQueueBooking,
  loading,
  error: bookingError,
  walletBalance,
  subscribeToBooking, // ✅ Added
  unsubscribe, // ✅ Added
  currentBooking, // ✅ Added
} = useQueueBooking();

const { success: showSuccess, error: showError } = useToast();

// ... existing code ...

// ✅ Watch for realtime status updates
watch(
  () => currentBooking.value?.status,
  (newStatus, oldStatus) => {
    if (newStatus && newStatus !== oldStatus) {
      console.log(
        "📡 Queue booking status updated:",
        oldStatus,
        "→",
        newStatus,
      );

      // Show user-friendly notifications
      switch (newStatus) {
        case "confirmed":
          showSuccess("✅ ไรเดอร์รับงานแล้ว! กำลังเดินทางมา");
          break;
        case "in_progress":
          showSuccess("🚗 ไรเดอร์กำลังดำเนินการ");
          break;
        case "completed":
          showSuccess("🎉 งานเสร็จสิ้นแล้ว!");
          break;
        case "cancelled":
          showError("❌ งานถูกยกเลิก");
          break;
      }
    }
  },
);

// Submit booking
async function handleSubmit() {
  if (!selectedCategory.value) return;

  const bookingData: CreateQueueBookingInput = {
    category: selectedCategory.value,
    place_name: placeName.value || undefined,
    place_address: placeAddress.value || undefined,
    details: details.value || undefined,
    scheduled_date: selectedDate.value,
    scheduled_time: selectedTime.value,
  };

  const booking = await createQueueBooking(bookingData);

  if (booking) {
    showSuccess("✅ จองคิวสำเร็จ!");

    // ✅ Subscribe to realtime updates
    subscribeToBooking(booking.id);

    // Navigate to status page
    router.push(`/queue-booking/${booking.id}`);
  } else if (bookingError.value) {
    showError(bookingError.value);
  }
}

// ✅ Cleanup on unmount
onUnmounted(() => {
  unsubscribe();
});
</script>
```

---

## 🎯 Expected Behavior After Fix

### Timeline

```
1. Customer creates booking
   ↓
   Status: pending
   ↓
2. Provider accepts job
   ↓
   Database: status = 'confirmed'
   ↓
3. Realtime broadcast
   ↓
4. Customer receives update (via subscription)
   ↓
   UI updates: "ไรเดอร์รับงานแล้ว!"
   ↓
5. Provider updates to pickup
   ↓
   Database: status = 'pickup'
   ↓
6. Customer receives update
   ↓
   UI updates: "ไรเดอร์ถึงจุดรับแล้ว"
```

### Console Logs (After Fix)

```javascript
// Customer side
📡 Queue booking status updated: pending → confirmed
✅ ไรเดอร์รับงานแล้ว! กำลังเดินทางมา

📡 Queue booking status updated: confirmed → pickup
🚗 ไรเดอร์ถึงจุดรับแล้ว

📡 Queue booking status updated: pickup → in_progress
🚗 ไรเดอร์กำลังดำเนินการ

📡 Queue booking status updated: in_progress → completed
🎉 งานเสร็จสิ้นแล้ว!
```

---

## 🔄 Alternative: Create Dedicated Status Page

If QueueBookingView is only for creating bookings, create a separate status page:

### src/views/QueueBookingStatusView.vue

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useQueueBooking } from "../composables/useQueueBooking";
import { useToast } from "../composables/useToast";

const route = useRoute();
const bookingId = route.params.id as string;

const { currentBooking, subscribeToBooking, unsubscribe, loading } =
  useQueueBooking();

const { success: showSuccess } = useToast();

// Subscribe on mount
onMounted(() => {
  if (bookingId) {
    subscribeToBooking(bookingId);
  }
});

// Watch for status changes
watch(
  () => currentBooking.value?.status,
  (newStatus, oldStatus) => {
    if (newStatus && newStatus !== oldStatus) {
      console.log("📡 Status updated:", oldStatus, "→", newStatus);

      switch (newStatus) {
        case "confirmed":
          showSuccess("✅ ไรเดอร์รับงานแล้ว!");
          break;
        case "pickup":
          showSuccess("📍 ไรเดอร์ถึงจุดรับแล้ว");
          break;
        case "in_progress":
          showSuccess("🚗 กำลังดำเนินการ");
          break;
        case "completed":
          showSuccess("🎉 เสร็จสิ้น!");
          break;
      }
    }
  },
);

// Cleanup
onUnmounted(() => {
  unsubscribe();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div v-if="loading" class="text-center py-8">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"
      ></div>
      <p class="mt-4 text-gray-600">กำลังโหลด...</p>
    </div>

    <div v-else-if="currentBooking" class="max-w-md mx-auto">
      <!-- Status Card -->
      <div class="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <h2 class="text-xl font-bold mb-4">สถานะการจองคิว</h2>

        <!-- Tracking ID -->
        <div class="mb-4">
          <p class="text-sm text-gray-500">หมายเลขติดตาม</p>
          <p class="text-lg font-mono font-bold">
            {{ currentBooking.tracking_id }}
          </p>
        </div>

        <!-- Status Badge -->
        <div class="mb-4">
          <span
            class="inline-block px-4 py-2 rounded-full text-sm font-medium"
            :class="{
              'bg-yellow-100 text-yellow-800':
                currentBooking.status === 'pending',
              'bg-blue-100 text-blue-800':
                currentBooking.status === 'confirmed',
              'bg-purple-100 text-purple-800':
                currentBooking.status === 'pickup',
              'bg-green-100 text-green-800':
                currentBooking.status === 'in_progress',
              'bg-gray-100 text-gray-800':
                currentBooking.status === 'completed',
            }"
          >
            {{ getStatusText(currentBooking.status) }}
          </span>
        </div>

        <!-- Details -->
        <div class="space-y-2 text-sm">
          <div>
            <span class="text-gray-500">ประเภท:</span>
            <span class="ml-2 font-medium">{{
              getCategoryText(currentBooking.category)
            }}</span>
          </div>
          <div v-if="currentBooking.place_name">
            <span class="text-gray-500">สถานที่:</span>
            <span class="ml-2 font-medium">{{
              currentBooking.place_name
            }}</span>
          </div>
          <div>
            <span class="text-gray-500">วันที่:</span>
            <span class="ml-2 font-medium">{{
              formatDate(currentBooking.scheduled_date)
            }}</span>
          </div>
          <div>
            <span class="text-gray-500">เวลา:</span>
            <span class="ml-2 font-medium">{{
              currentBooking.scheduled_time
            }}</span>
          </div>
        </div>
      </div>

      <!-- Provider Info (if confirmed) -->
      <div
        v-if="currentBooking.provider_id && currentBooking.status !== 'pending'"
        class="bg-white rounded-2xl shadow-lg p-6"
      >
        <h3 class="font-bold mb-2">ข้อมูลไรเดอร์</h3>
        <p class="text-sm text-gray-600">ไรเดอร์กำลังเดินทางมา</p>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-600">ไม่พบข้อมูลการจอง</p>
    </div>
  </div>
</template>
```

### Router Configuration

```typescript
// src/router/index.ts
{
  path: '/queue-booking/:id',
  name: 'QueueBookingStatus',
  component: () => import('@/views/QueueBookingStatusView.vue'),
  meta: { requiresAuth: true }
}
```

---

## ✅ Implementation Checklist

- [ ] Import `subscribeToBooking` and `unsubscribe` in QueueBookingView
- [ ] Import `currentBooking` to watch for updates
- [ ] Add `watch` for status changes
- [ ] Call `subscribeToBooking(booking.id)` after creating booking
- [ ] Add `onUnmounted` to cleanup subscription
- [ ] Test: Create booking and verify realtime updates
- [ ] Test: Provider accepts → Customer sees update immediately
- [ ] Test: Provider updates status → Customer sees each step
- [ ] Verify console logs show realtime events

---

## 🎯 Success Criteria

- [x] Composable has realtime function
- [ ] View imports realtime functions
- [ ] View subscribes after booking created
- [ ] View watches for status changes
- [ ] View shows notifications on updates
- [ ] View cleans up on unmount
- [ ] Customer sees status change immediately
- [ ] No console errors

---

**NEXT STEP**: Update QueueBookingView.vue to use realtime subscription!
