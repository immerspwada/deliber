# 🚀 Shopping Chat Quick Fix Reference

**Date**: 2026-01-27  
**Status**: ✅ FIXED

---

## 🎯 What Was Wrong

Shopping chat had **parameter name mismatches**:

- Frontend used `p_user_id`
- Database expected `p_sender_id`

Result: **400 Bad Request** and **404 Not Found** errors

---

## ✅ What Was Fixed

**File**: `src/composables/useChat.ts`

### Changed Functions

1. **`markAsRead()`** - Now uses `p_sender_id` for shopping
2. **`getUnreadCount()`** - Now uses `p_sender_id` for shopping

### Code Pattern

```typescript
// ✅ NEW: Dynamic parameter names
let userParam: string;

if (bookingType === "shopping") {
  userParam = "p_sender_id"; // Shopping uses p_sender_id
} else {
  userParam = "p_user_id"; // Ride/Queue use p_user_id
}

await supabase.rpc(rpcName, {
  [bookingParam]: bookingId,
  [userParam]: userId, // Dynamic!
});
```

---

## 🚨 MUST DO: Hard Refresh

**Before testing**, clear browser cache:

### Desktop

```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Mobile

```
iOS: Settings → Safari → Clear History
Android: Settings → Privacy → Clear Cache
```

---

## 🧪 Quick Test

### Customer

1. Hard refresh
2. Open: `/tracking/SHP-20260127-958060`
3. Click "การสนทนา"
4. ✅ Should work without errors

### Provider

1. Hard refresh
2. Open: `/provider/job/53a59c76-00b4-45d4-a7cd-0944d21ff896/matched`
3. Click chat icon
4. ✅ Should work without errors

---

## 📊 Function Parameters Reference

| Booking Type | User Parameter   |
| ------------ | ---------------- |
| Ride         | `p_user_id`      |
| Queue        | `p_user_id`      |
| Shopping     | `p_sender_id` ⚠️ |

---

## ✅ Status

- ✅ Database functions: Correct
- ✅ Frontend code: Fixed
- ✅ Parameter names: Match
- ✅ Ready to test: YES

**Action**: Hard refresh → Test → Report results

---

**Fixed**: 2026-01-27 10:55 AM
