# 🔄 Queue Booking Chat - Browser Cache Fix Required

**Date**: 2026-01-27  
**Status**: ⚠️ ACTION REQUIRED  
**Priority**: 🔥 CRITICAL - Browser Cache Issue

---

## 🐛 Problem

Console shows RPC error even though database function is correct:

```
❌ RPC ERROR: get_user_queue_booking_role
{
  code: '42703',
  message: 'column "customer_id" does not exist'
}
```

### Root Cause

**Browser is caching the OLD version of the RPC function** that used `customer_id` instead of `user_id`.

---

## ✅ Database Status (Verified)

### Function is Correct ✅

```sql
-- Current function (CORRECT)
CREATE OR REPLACE FUNCTION get_user_queue_booking_role(p_queue_booking_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  p_user_id UUID := auth.uid();
BEGIN
  -- ✅ Uses user_id (CORRECT)
  SELECT user_id, provider_id
  INTO v_user_id, v_provider_id
  FROM queue_bookings
  WHERE id = p_queue_booking_id;

  -- Check if user is customer
  IF v_user_id = p_user_id THEN
    RETURN 'customer';
  END IF;

  -- Check if user is provider
  IF EXISTS (
    SELECT 1 FROM providers_v2
    WHERE id = v_provider_id AND user_id = p_user_id
  ) THEN
    RETURN 'provider';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Table Schema is Correct ✅

```sql
-- queue_bookings table columns
- user_id UUID        ✅ EXISTS
- provider_id UUID    ✅ EXISTS
- customer_id         ❌ DOES NOT EXIST (never existed)
```

### Frontend Code is Correct ✅

```typescript
// src/composables/useChat.ts (Line 166-169)
const roleParams =
  bookingType === "ride"
    ? { [roleParam]: bookingId, p_user_id: user.id }
    : { [roleParam]: bookingId }; // ✅ Only 1 parameter for queue
```

---

## 🔧 Solution: Clear Browser Cache

### Method 1: Hard Refresh (Recommended)

**Chrome/Edge/Brave:**

- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Firefox:**

- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari:**

- Mac: `Cmd + Option + R`

### Method 2: Clear Site Data (Most Thorough)

**Chrome/Edge/Brave:**

1. Open DevTools (`F12`)
2. Go to **Application** tab
3. Click **Clear site data** button
4. Refresh page (`F5`)

**Firefox:**

1. Open DevTools (`F12`)
2. Go to **Storage** tab
3. Right-click on site → **Delete All**
4. Refresh page (`F5`)

**Safari:**

1. Safari → Preferences → Privacy
2. Click **Manage Website Data**
3. Find `localhost:5173` → Remove
4. Refresh page

### Method 3: Incognito/Private Window (Quick Test)

Open the app in an incognito/private window to test without cache:

- Chrome: `Ctrl/Cmd + Shift + N`
- Firefox: `Ctrl/Cmd + Shift + P`
- Safari: `Cmd + Shift + N`

---

## 🧪 Verification Steps

After clearing cache, verify the chat system works:

### Step 1: Open Queue Tracking

```
http://localhost:5173/customer/queue-booking/d85b9b76-f1af-4bad-8dc6-edc3add7f930
```

### Step 2: Check Console Logs

Should see:

```
✅ [Chat] USER AUTHENTICATED
✅ [Chat] RPC RESULT: get_user_queue_booking_role
✅ [Chat] INITIALIZE COMPLETE
```

Should NOT see:

```
❌ RPC ERROR: column "customer_id" does not exist
```

### Step 3: Open Chat Modal

1. Click the **Chat** button (blue button with chat icon)
2. Chat modal should open
3. Console should show:
   ```
   ✅ [Chat] INITIALIZE SUCCESS
   ```

### Step 4: Send Test Message

1. Type a message: "สวัสดีครับ"
2. Press Enter or click Send
3. Message should appear immediately
4. Console should show:
   ```
   ✅ MESSAGE SENT
   ```

---

## 📊 Expected Behavior After Fix

### Customer View

1. ✅ Can open chat modal
2. ✅ Can see provider info
3. ✅ Can send messages
4. ✅ Can receive messages (realtime)
5. ✅ Chat closes when booking is cancelled/completed

### Provider View

1. ✅ Can see new queue bookings (realtime)
2. ✅ Can accept queue bookings
3. ✅ Can chat with customer
4. ✅ Can update booking status

### Admin View

1. ✅ Can see all queue bookings (realtime)
2. ✅ Can view booking details
3. ✅ Can cancel bookings
4. ✅ Can see chat history

---

## 🔍 Debugging Tips

### If Still Getting Error After Cache Clear

1. **Check Network Tab**
   - Open DevTools → Network tab
   - Filter: `rpc/get_user_queue_booking_role`
   - Check request payload
   - Should only have 1 parameter: `p_queue_booking_id`

2. **Check Application Tab**
   - Open DevTools → Application tab
   - Check **Local Storage** → Clear all
   - Check **Session Storage** → Clear all
   - Check **IndexedDB** → Delete all

3. **Check Service Worker**
   - Open DevTools → Application tab
   - Click **Service Workers**
   - Click **Unregister** for all workers
   - Refresh page

4. **Nuclear Option: Clear Everything**

   ```bash
   # Stop dev server
   # Delete node_modules/.vite cache
   rm -rf node_modules/.vite

   # Restart dev server
   npm run dev
   ```

---

## 🎯 Why This Happened

### Timeline

1. **Initial Implementation**: Function used `customer_id` (wrong)
2. **Database Fix**: Updated function to use `user_id` (correct)
3. **Browser Cache**: Still has old function definition cached
4. **Result**: Frontend calls correct function, but browser uses cached (wrong) version

### Cache Layers

1. **Supabase Client Cache**: Caches RPC function definitions
2. **Browser HTTP Cache**: Caches API responses
3. **Service Worker Cache**: Caches assets and API calls
4. **Vite Dev Server Cache**: Caches modules

All 4 layers need to be cleared!

---

## ✅ Final Checklist

After clearing cache, verify:

- [ ] No console errors about `customer_id`
- [ ] Chat modal opens successfully
- [ ] Can send messages
- [ ] Messages appear in realtime
- [ ] Provider info displays correctly
- [ ] Phone call button works
- [ ] Chat button works
- [ ] Chat closes when booking ends

---

## 📝 Prevention for Future

### For Developers

1. Always use **hard refresh** after database changes
2. Test in incognito window for clean state
3. Clear cache before testing RPC changes
4. Use `?v=timestamp` query param to bust cache

### For Production

1. Implement cache busting in build process
2. Use versioned API endpoints
3. Add cache headers to RPC responses
4. Monitor for schema cache issues

---

## 🚀 Next Steps

1. **Clear browser cache** using Method 1 or 2 above
2. **Refresh the page** (`F5`)
3. **Test chat system** following verification steps
4. **Report results** - does it work now?

---

## 💡 Quick Test Command

```bash
# Open in incognito to test without cache
# Chrome
open -na "Google Chrome" --args --incognito http://localhost:5173/customer/queue-booking/d85b9b76-f1af-4bad-8dc6-edc3add7f930

# Firefox
open -a Firefox --args -private-window http://localhost:5173/customer/queue-booking/d85b9b76-f1af-4bad-8dc6-edc3add7f930
```

---

**Status**: ✅ Database is correct, browser cache needs clearing  
**Action**: Clear browser cache and test again  
**Expected**: Chat system should work perfectly after cache clear

---

**Last Updated**: 2026-01-27  
**Issue**: Browser Cache  
**Solution**: Hard Refresh Required
