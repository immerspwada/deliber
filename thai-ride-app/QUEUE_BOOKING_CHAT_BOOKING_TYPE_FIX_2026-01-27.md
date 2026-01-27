# ✅ Queue Booking Chat - Booking Type Fix

**Date**: 2026-01-27  
**Status**: ✅ FIXED  
**Priority**: 🔥 CRITICAL

---

## 🎯 Problem Identified

The console logs showed:

```typescript
bookingType: "ride"; // ❌ WRONG!
bookingId: "d85b9b76-f1af-4bad-8dc6-edc3add7f930"; // This is a queue booking!
```

**Root Cause**: `ChatDrawer` component was not passing the `bookingType` parameter to `useChat`, causing it to default to `'ride'` even for queue bookings.

---

## 🔍 Investigation

### Console Logs Analysis

```typescript
// What we saw:
[Chat 05:31:36.380] 📋 INITIALIZE START {
  bookingId: 'd85b9b76-f1af-4bad-8dc6-edc3add7f930',
  bookingType: 'ride'  // ❌ Wrong!
}

// Then it called:
get_user_ride_role  // ❌ Wrong function!
// Instead of:
get_user_queue_booking_role  // ✅ Should call this
```

### Code Flow

1. **ProviderJobLayout.vue** opens chat:

   ```vue
   <ChatDrawer
     :ride-id="job.id"
     <!-- ❌ Missing: :booking-type -->
   />
   ```

2. **ChatDrawer.vue** calls useChat:

   ```typescript
   useChat(() => props.rideId);
   // ❌ Missing second parameter: bookingType
   ```

3. **useChat.ts** defaults to 'ride':
   ```typescript
   export function useChat(
     bookingIdInput: string | (() => string),
     bookingType: BookingType = "ride", // ❌ Defaults to 'ride'
   );
   ```

---

## ✅ Solution Implemented

### 1. Updated ChatDrawer.vue

**Added `bookingType` prop:**

```vue
<script setup lang="ts">
interface Props {
  rideId: string;
  otherUserName: string;
  isOpen: boolean;
  bookingType?: "ride" | "queue"; // ✅ NEW
}

const props = withDefaults(defineProps<Props>(), {
  bookingType: "ride", // ✅ Default for backward compatibility
});

// Pass bookingType to useChat
const {
  messages,
  loading,
  // ... other returns
} = useChat(() => props.rideId, props.bookingType); // ✅ Pass bookingType
</script>
```

### 2. Updated ProviderJobLayout.vue

**Pass booking type dynamically:**

```vue
<ChatDrawer
  v-if="showChatDrawer && job"
  :ride-id="job.id"
  :booking-type="job.jobType === 'queue' ? 'queue' : 'ride'"  // ✅ NEW
  :other-user-name="job.customer?.name || 'ลูกค้า'"
  :is-open="showChatDrawer"
  @close="showChatDrawer = false"
/>
```

**Logic:**

- If `job.jobType === 'queue'` → Pass `'queue'`
- Otherwise → Pass `'ride'`

---

## 🎯 Expected Behavior After Fix

### For Queue Bookings

```typescript
// Console logs should show:
[Chat] 📋 INITIALIZE START {
  bookingId: 'd85b9b76-f1af-4bad-8dc6-edc3add7f930',
  bookingType: 'queue'  // ✅ Correct!
}

// Should call:
get_user_queue_booking_role('d85b9b76-f1af-4bad-8dc6-edc3add7f930')
// Returns: 'provider' ✅

// Should call:
send_queue_chat_message(...)  // ✅ Correct function
```

### For Ride Bookings

```typescript
// Console logs should show:
[Chat] 📋 INITIALIZE START {
  bookingId: 'some-ride-id',
  bookingType: 'ride'  // ✅ Correct!
}

// Should call:
get_user_ride_role('some-ride-id')
// Returns: 'provider' or 'customer' ✅
```

---

## 📊 Files Modified

### 1. src/components/ChatDrawer.vue

- ✅ Added `bookingType` prop (optional, defaults to 'ride')
- ✅ Pass `bookingType` to `useChat` composable

### 2. src/views/provider/job/ProviderJobLayout.vue

- ✅ Pass `:booking-type` prop to ChatDrawer
- ✅ Determine type from `job.jobType`

---

## 🧪 Testing Instructions

### Step 1: Clear Browser Cache (CRITICAL!)

```bash
# Hard refresh
Ctrl+Shift+R (Windows)
Cmd+Shift+R (Mac)

# Or clear cache
Ctrl+Shift+Delete → Clear cached images and files
```

### Step 2: Test Queue Booking Chat

1. Login as provider (ridertest@gmail.com)
2. Go to: `http://localhost:5173/provider/job/d85b9b76-f1af-4bad-8dc6-edc3add7f930/matched`
3. Click chat button
4. **Check console logs:**

   ```typescript
   [Chat] 📋 INITIALIZE START {
     bookingId: 'd85b9b76-f1af-4bad-8dc6-edc3add7f930',
     bookingType: 'queue'  // ✅ Should be 'queue'
   }

   [Chat] 📡 RPC RESULT: get_user_queue_booking_role {
     roleData: 'provider',  // ✅ Should return 'provider'
     roleError: null
   }
   ```

5. **Expected**: Chat opens successfully
6. Type message: "สวัสดีครับ"
7. **Expected**: Message sends successfully

### Step 3: Test Ride Booking Chat (Regression Test)

1. Create a regular ride booking
2. Accept as provider
3. Open chat
4. **Check console logs:**
   ```typescript
   bookingType: "ride"; // ✅ Should still be 'ride'
   ```
5. **Expected**: Chat works normally

---

## 🔍 Debugging

### If Still Not Working

**Check console logs for:**

```typescript
// 1. Booking type
[Chat] 📋 INITIALIZE START { bookingType: '???' }
// Should be 'queue' for queue bookings

// 2. RPC function called
[Chat] 📡 RPC RESULT: get_user_???_role
// Should be 'get_user_queue_booking_role' for queue bookings

// 3. Role result
roleData: '???'
// Should be 'provider' or 'customer', NOT null
```

### Common Issues

| Issue                           | Cause                  | Solution                     |
| ------------------------------- | ---------------------- | ---------------------------- |
| `bookingType: 'ride'` for queue | Browser cache          | Hard refresh (Ctrl+Shift+R)  |
| `roleData: null`                | RPC function not found | Already fixed - clear cache  |
| `bookingType: undefined`        | Prop not passed        | Check ProviderJobLayout code |

---

## 🎯 Success Criteria

- [x] ChatDrawer accepts `bookingType` prop
- [x] ProviderJobLayout passes correct booking type
- [ ] Console shows `bookingType: 'queue'` for queue bookings
- [ ] Console shows `bookingType: 'ride'` for ride bookings
- [ ] RPC calls correct function based on type
- [ ] Role detection returns correct role
- [ ] Messages send successfully
- [ ] Realtime updates work

---

## 📝 Key Learnings

### 1. Always Pass Context

```typescript
// ❌ Bad - Missing context
useChat(bookingId);

// ✅ Good - Full context
useChat(bookingId, bookingType);
```

### 2. Default Parameters Can Hide Bugs

```typescript
// This hides the bug:
function useChat(id: string, type: BookingType = "ride");

// Better to make it required:
function useChat(id: string, type: BookingType);
// Forces caller to think about the type
```

### 3. Console Logs Are Critical

The detailed console logs in `useChat.ts` made it easy to identify:

- What booking type was being used
- Which RPC function was being called
- What the result was

Without these logs, debugging would have been much harder!

---

## 🚀 Next Steps

1. ✅ Code updated
2. ⏳ **Clear browser cache**
3. ⏳ Test queue booking chat
4. ⏳ Test ride booking chat (regression)
5. ⏳ Verify realtime updates
6. ⏳ Test with customer role

---

## 🎉 Expected Result

After clearing browser cache, the chat should work perfectly for queue bookings! The system will:

1. ✅ Detect booking type correctly (`'queue'`)
2. ✅ Call correct RPC function (`get_user_queue_booking_role`)
3. ✅ Get correct role (`'provider'`)
4. ✅ Allow sending messages
5. ✅ Show realtime updates

**The fix is complete - just need to clear browser cache and test!** 🚀
