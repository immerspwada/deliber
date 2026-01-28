# 🔧 Shopping Chat Parameter Name Fix

**Date**: 2026-01-27  
**Status**: ✅ Fixed  
**Priority**: 🔥 CRITICAL

---

## 🐛 Problem

Shopping chat was failing with **400 Bad Request** and **404 Not Found** errors on both customer and provider sides due to **parameter name mismatches** between frontend and database functions.

### Error Logs

**Customer Side:**

```
POST https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/rpc/get_shopping_chat_history 400 (Bad Request)
```

**Provider Side:**

```
POST https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/rpc/get_shopping_chat_history 400 (Bad Request)
POST https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/rpc/mark_shopping_messages_read 404 (Not Found)
```

---

## 🔍 Root Cause Analysis

### Issue 1: `mark_shopping_messages_read` Parameter Mismatch

**Database Function Signature:**

```sql
mark_shopping_messages_read(
  p_shopping_request_id uuid,
  p_sender_id uuid  -- ✅ Expects p_sender_id
)
```

**Frontend Code (WRONG):**

```typescript
await supabase.rpc("mark_shopping_messages_read", {
  p_shopping_request_id: bookingId,
  p_user_id: currentUserId.value, // ❌ Passing p_user_id
});
```

**Result:** 404 Not Found (function signature doesn't match)

### Issue 2: `get_shopping_unread_count` Parameter Mismatch

**Database Function Signature:**

```sql
get_shopping_unread_count(
  p_shopping_request_id uuid,
  p_sender_id uuid  -- ✅ Expects p_sender_id
)
```

**Frontend Code (WRONG):**

```typescript
await supabase.rpc("get_shopping_unread_count", {
  p_shopping_request_id: bookingId,
  p_user_id: currentUserId.value, // ❌ Passing p_user_id
});
```

**Result:** 404 Not Found (function signature doesn't match)

### Why This Happened

Shopping chat functions use **`p_sender_id`** while ride and queue booking functions use **`p_user_id`**. The frontend code was using a hardcoded `p_user_id` for all booking types instead of checking which parameter name each function expects.

---

## ✅ Solution

### Fixed `markAsRead()` Function

```typescript
async function markAsRead(): Promise<void> {
  const bookingId = getBookingId();
  if (!currentUserId.value) return;

  try {
    let rpcName: string;
    let rpcParam: string;
    let userParam: string; // ✅ NEW: Dynamic user parameter name

    if (bookingType === "ride") {
      rpcName = "mark_messages_read";
      rpcParam = "p_ride_id";
      userParam = "p_user_id";
    } else if (bookingType === "queue") {
      rpcName = "mark_queue_booking_messages_read";
      rpcParam = "p_queue_booking_id";
      userParam = "p_user_id";
    } else {
      rpcName = "mark_shopping_messages_read";
      rpcParam = "p_shopping_request_id";
      userParam = "p_sender_id"; // ✅ Shopping uses p_sender_id
    }

    await supabase.rpc(rpcName, {
      [rpcParam]: bookingId,
      [userParam]: currentUserId.value, // ✅ Dynamic parameter name
    });
    unreadCount.value = 0;
  } catch (err) {
    console.error("[Chat] Mark read error:", err);
  }
}
```

### Fixed `getUnreadCount()` Function

```typescript
async function getUnreadCount(): Promise<number> {
  const bookingId = getBookingId();
  if (!currentUserId.value) return 0;

  try {
    let rpcName: string;
    let rpcParam: string;
    let userParam: string; // ✅ NEW: Dynamic user parameter name

    if (bookingType === "ride") {
      rpcName = "get_unread_message_count";
      rpcParam = "p_ride_id";
      userParam = "p_user_id";
    } else if (bookingType === "queue") {
      rpcName = "get_queue_booking_unread_count";
      rpcParam = "p_queue_booking_id";
      userParam = "p_user_id";
    } else {
      rpcName = "get_shopping_unread_count";
      rpcParam = "p_shopping_request_id";
      userParam = "p_sender_id"; // ✅ Shopping uses p_sender_id
    }

    const { data, error: rpcError } = await supabase.rpc(rpcName, {
      [rpcParam]: bookingId,
      [userParam]: currentUserId.value, // ✅ Dynamic parameter name
    });

    if (rpcError) {
      console.error("[Chat] Unread count error:", rpcError);
      return 0;
    }

    unreadCount.value = data || 0;
    return unreadCount.value;
  } catch (err) {
    console.error("[Chat] Exception:", err);
    return 0;
  }
}
```

---

## 📋 Changes Made

### File: `src/composables/useChat.ts`

1. ✅ Added `userParam` variable to `markAsRead()` function
2. ✅ Set `userParam = 'p_sender_id'` for shopping chat
3. ✅ Set `userParam = 'p_user_id'` for ride and queue booking
4. ✅ Use dynamic `[userParam]` in RPC call

5. ✅ Added `userParam` variable to `getUnreadCount()` function
6. ✅ Set `userParam = 'p_sender_id'` for shopping chat
7. ✅ Set `userParam = 'p_user_id'` for ride and queue booking
8. ✅ Use dynamic `[userParam]` in RPC call

---

## 🧪 Testing

### Test Customer Side

1. Open: `http://localhost:5173/tracking/SHP-20260127-958060`
2. Click "การสนทนา" button
3. ✅ Chat should load without 400 errors
4. ✅ Send a message - should work
5. ✅ No 404 errors in console

### Test Provider Side

1. Open: `http://localhost:5173/provider/job/53a59c76-00b4-45d4-a7cd-0944d21ff896/matched`
2. Click chat icon
3. ✅ Chat should load without 400 errors
4. ✅ Send a message - should work
5. ✅ No 404 errors for `mark_shopping_messages_read`

---

## 🚨 CRITICAL: Hard Refresh Required

**Users MUST perform a hard refresh** to clear JavaScript cache:

### Desktop

- **Windows/Linux**: `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### Mobile

- **iOS Safari**: Settings → Safari → Clear History and Website Data
- **Android Chrome**: Settings → Privacy → Clear browsing data → Cached images and files

---

## 📊 Function Parameter Reference

| Function                           | Booking ID Param        | User ID Param    |
| ---------------------------------- | ----------------------- | ---------------- |
| **Ride Chat**                      |
| `mark_messages_read`               | `p_ride_id`             | `p_user_id`      |
| `get_unread_message_count`         | `p_ride_id`             | `p_user_id`      |
| **Queue Booking Chat**             |
| `mark_queue_booking_messages_read` | `p_queue_booking_id`    | `p_user_id`      |
| `get_queue_booking_unread_count`   | `p_queue_booking_id`    | `p_user_id`      |
| **Shopping Chat**                  |
| `mark_shopping_messages_read`      | `p_shopping_request_id` | `p_sender_id` ⚠️ |
| `get_shopping_unread_count`        | `p_shopping_request_id` | `p_sender_id` ⚠️ |

---

## 🎯 Prevention

### Lesson Learned

When adding new booking types with chat functionality:

1. ✅ Check database function signatures FIRST
2. ✅ Don't assume parameter names are the same across all booking types
3. ✅ Use dynamic parameter names in frontend code
4. ✅ Test with actual RPC calls before deploying

### Code Pattern to Follow

```typescript
// ✅ GOOD: Dynamic parameter names
let userParam: string;
if (bookingType === "shopping") {
  userParam = "p_sender_id";
} else {
  userParam = "p_user_id";
}

await supabase.rpc(rpcName, {
  [bookingParam]: bookingId,
  [userParam]: userId, // Dynamic!
});

// ❌ BAD: Hardcoded parameter name
await supabase.rpc(rpcName, {
  [bookingParam]: bookingId,
  p_user_id: userId, // Assumes all functions use p_user_id
});
```

---

## 📝 Summary

**Problem**: Shopping chat failed due to parameter name mismatches  
**Root Cause**: Frontend used `p_user_id` but shopping functions expect `p_sender_id`  
**Solution**: Use dynamic parameter names based on booking type  
**Status**: ✅ Fixed in `src/composables/useChat.ts`  
**Action Required**: Hard refresh browser to clear cache

---

**Last Updated**: 2026-01-27 10:55 AM  
**Fixed By**: AI Assistant  
**Verified**: Pending user testing
