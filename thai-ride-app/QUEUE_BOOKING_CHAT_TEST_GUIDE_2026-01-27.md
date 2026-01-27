# 🧪 Queue Booking Chat - Complete Test Guide

**Date**: 2026-01-27  
**Status**: ✅ Ready for Testing  
**Priority**: 🔥 CRITICAL

---

## ⚠️ BEFORE TESTING - CLEAR BROWSER CACHE

**CRITICAL**: You MUST clear browser cache before testing!

### Why?

- RLS policies are server-side changes
- Browser may have cached old permission errors
- Frontend code hasn't changed, but database access rules have

### How to Clear Cache:

#### Option 1: Hard Refresh (Recommended)

```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

#### Option 2: Clear All Site Data

1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Click "Clear Storage" in left sidebar
4. Click "Clear site data" button
5. Refresh page

---

## ✅ Complete System Verification

### Backend Components (All ✅)

#### Helper Functions

- ✅ `is_queue_booking_participant()` - Checks if user can access chat
- ✅ `is_queue_booking_chat_allowed()` - Checks if booking status allows chat
- ✅ `get_user_queue_booking_role()` - Returns user's role in booking

#### RLS Policies

- ✅ `chat_select_queue_participants` - SELECT messages
- ✅ `chat_insert_queue_active` - INSERT messages
- ✅ `chat_update_queue_mark_read` - UPDATE read status

#### RPC Functions

- ✅ `send_queue_chat_message()` - Send message
- ✅ `get_queue_chat_messages()` - Get message history
- ✅ `mark_queue_chat_messages_read()` - Mark as read

### Frontend Components (All ✅)

- ✅ `useChat.ts` - Supports `bookingType: 'queue'`
- ✅ `ChatDrawer.vue` - Accepts `bookingType` prop
- ✅ `QueueTrackingView.vue` - Chat button for customer
- ✅ `ProviderJobLayout.vue` - Chat button for provider

---

## 🧪 Test Scenarios

### Test 1: Customer → Provider Chat

#### Setup

1. Clear browser cache (Cmd+Shift+R)
2. Login as customer
3. Create queue booking
4. Wait for provider to accept

#### Test Steps

1. Go to: `http://localhost:5173/customer/queue-booking`
2. Click on your booking
3. Wait for provider to accept (status: confirmed)
4. Click "แชท" (Chat) button
5. Type message: "สวัสดีครับ" (Hello)
6. Click send
7. Verify message appears in chat

#### Expected Results

- ✅ Chat drawer opens
- ✅ Message sends successfully
- ✅ Message appears in chat history
- ✅ No console errors
- ✅ Provider receives message (test in next scenario)

#### If It Fails

- Check browser console for errors
- Verify booking status is 'confirmed' (not 'pending')
- Verify you cleared browser cache
- Check network tab for failed RPC calls

---

### Test 2: Provider → Customer Chat

#### Setup

1. Clear browser cache (Cmd+Shift+R)
2. Login as provider
3. Accept a queue booking

#### Test Steps

1. Go to: `http://localhost:5173/provider`
2. Click on accepted queue booking
3. Click "แชท" (Chat) button
4. Type message: "กำลังไปรับครับ" (On my way)
5. Click send
6. Verify message appears in chat

#### Expected Results

- ✅ Chat drawer opens
- ✅ Message sends successfully
- ✅ Message appears in chat history
- ✅ Customer's previous message visible
- ✅ No console errors

#### If It Fails

- Check browser console for errors
- Verify booking status is 'confirmed'
- Verify you cleared browser cache
- Check that provider is assigned to booking

---

### Test 3: Realtime Updates

#### Setup

1. Open two browser windows side by side
2. Window 1: Login as customer
3. Window 2: Login as provider
4. Both viewing same queue booking

#### Test Steps

1. **Customer window**: Open chat, send message
2. **Provider window**: Verify message appears instantly
3. **Provider window**: Send reply
4. **Customer window**: Verify reply appears instantly

#### Expected Results

- ✅ Messages appear instantly (< 1 second)
- ✅ Toast notification shows on new message
- ✅ Unread count updates
- ✅ No page refresh needed

#### If It Fails

- Check if realtime is enabled on `chat_messages` table
- Verify both users are viewing same booking
- Check browser console for subscription errors

---

### Test 4: Admin Chat

#### Setup

1. Clear browser cache (Cmd+Shift+R)
2. Login as admin
3. Go to orders view

#### Test Steps

1. Go to: `http://localhost:5173/admin/orders`
2. Filter by "Queue Booking"
3. Click on a booking with status 'confirmed'
4. Click chat button
5. Send message to customer/provider
6. Verify message appears

#### Expected Results

- ✅ Admin can see all messages
- ✅ Admin can send messages
- ✅ Messages appear for customer/provider
- ✅ No console errors

---

### Test 5: Status-Based Access Control

#### Test 5.1: Pending Booking (Should Fail)

1. Create queue booking (status: pending)
2. Try to open chat
3. **Expected**: Chat button disabled or error message

#### Test 5.2: Confirmed Booking (Should Work)

1. Provider accepts booking (status: confirmed)
2. Open chat
3. **Expected**: Chat works normally

#### Test 5.3: Cancelled Booking (Should Fail)

1. Cancel booking (status: cancelled)
2. Try to open chat
3. **Expected**: Chat button disabled or error message

---

### Test 6: Security Tests

#### Test 6.1: Access Other User's Chat (Should Fail)

1. Login as customer A
2. Create booking
3. Note booking ID from URL
4. Login as customer B
5. Try to access customer A's booking chat
6. **Expected**: No messages visible or access denied

#### Test 6.2: Provider Access (Should Work Only for Assigned)

1. Login as provider A
2. Accept booking
3. Open chat - **Expected**: Works
4. Login as provider B
5. Try to access same booking chat
6. **Expected**: Access denied or no messages

---

## 🔍 Debugging Guide

### Console Errors to Check

#### Error: "Failed to send message"

**Cause**: RLS policy blocking insert
**Fix**:

- Verify booking status is 'confirmed'
- Check `sender_type` matches user role
- Clear browser cache

#### Error: "Failed to load messages"

**Cause**: RLS policy blocking select
**Fix**:

- Verify user is participant
- Check booking exists
- Clear browser cache

#### Error: "User role not found"

**Cause**: `get_user_queue_booking_role()` returning NULL
**Fix**:

- Verify user is customer, provider, or admin
- Check provider assignment (dual-role)
- Verify booking exists

### Network Tab Checks

#### Check RPC Calls

1. Open DevTools > Network tab
2. Filter by "Fetch/XHR"
3. Look for these calls:
   - `send_queue_chat_message` - Should return success
   - `get_queue_chat_messages` - Should return message array
   - `mark_queue_chat_messages_read` - Should return success

#### Check Response Status

- ✅ 200 OK - Success
- ❌ 403 Forbidden - RLS policy blocking
- ❌ 500 Error - Function error

---

## 📊 Test Results Template

### Customer Role

- [ ] Can open chat drawer
- [ ] Can send messages
- [ ] Can see provider messages
- [ ] Realtime updates work
- [ ] Mark as read works
- [ ] No console errors

### Provider Role

- [ ] Can open chat drawer
- [ ] Can send messages
- [ ] Can see customer messages
- [ ] Realtime updates work
- [ ] Mark as read works
- [ ] No console errors

### Admin Role

- [ ] Can open chat drawer
- [ ] Can send messages
- [ ] Can see all messages
- [ ] Realtime updates work
- [ ] Mark as read works
- [ ] No console errors

### Security

- [ ] Cannot access other user's chat
- [ ] Cannot chat on pending booking
- [ ] Cannot chat on cancelled booking
- [ ] Dual-role system works for provider

---

## 🚀 Quick Test Commands

### Test Database Functions Directly

```sql
-- Test 1: Check if user is participant
SELECT is_queue_booking_participant(
  'your-booking-id'::UUID,
  auth.uid()
);
-- Expected: true if you're customer/provider/admin

-- Test 2: Check if chat is allowed
SELECT is_queue_booking_chat_allowed('your-booking-id'::UUID);
-- Expected: true if status is confirmed/in_progress/completed

-- Test 3: Get user role
SELECT get_user_queue_booking_role('your-booking-id'::UUID);
-- Expected: 'customer', 'provider', or 'admin'

-- Test 4: Get messages
SELECT * FROM get_queue_chat_messages('your-booking-id'::UUID, 50);
-- Expected: Array of messages

-- Test 5: Send message
SELECT send_queue_chat_message(
  'your-booking-id'::UUID,
  'Test message',
  'text'
);
-- Expected: Success response
```

---

## ✅ Success Criteria

### All Tests Pass When:

1. ✅ Customer can chat with provider
2. ✅ Provider can chat with customer
3. ✅ Admin can chat with both
4. ✅ Realtime updates work (< 1 second)
5. ✅ Status-based access control works
6. ✅ Security tests pass (no unauthorized access)
7. ✅ No console errors
8. ✅ No network errors (403/500)

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅

1. Mark feature as complete
2. Deploy to production
3. Monitor for issues
4. Collect user feedback

### If Tests Fail ❌

1. Note which test failed
2. Check console errors
3. Check network tab
4. Verify browser cache cleared
5. Report specific error messages

---

## 📞 Support

### Common Issues

#### "Chat button not showing"

- Check booking status (must be confirmed/in_progress/completed)
- Verify provider is assigned
- Clear browser cache

#### "Messages not sending"

- Check console for RLS errors
- Verify user role matches sender_type
- Check booking status allows chat

#### "Messages not appearing"

- Check realtime subscription
- Verify RLS policies allow SELECT
- Clear browser cache

#### "Realtime not working"

- Check if `chat_messages` table has realtime enabled
- Verify subscription in browser console
- Check network connection

---

**Created**: 2026-01-27  
**Ready for Testing**: ✅ Yes  
**Estimated Test Time**: 15-20 minutes
