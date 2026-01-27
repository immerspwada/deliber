# 🧪 Customer Queue Booking Realtime - Test Guide

**Date**: 2026-01-27  
**Status**: ✅ READY FOR TESTING  
**Priority**: 🔥 CRITICAL

---

## 📋 Test Scenario

### Complete End-to-End Flow

```
Customer Side                    Provider Side                   Admin Side
─────────────                    ─────────────                   ──────────
1. Create booking
   Status: pending
   📡 Subscribe to updates
   ↓
                                2. See new booking
                                   Click "รับงาน"
                                   ↓
3. 📡 Receive UPDATE event
   Status: pending → confirmed
   🎉 Toast: "ไรเดอร์รับงานแล้ว!"
   ↓
                                3. Click "ถึงจุดรับแล้ว"
                                   ↓
4. 📡 Receive UPDATE event
   Status: confirmed → pickup
   🎉 Toast: "ไรเดอร์ถึงจุดรับแล้ว"
   ↓
                                4. Click "เริ่มดำเนินการ"
                                   ↓
5. 📡 Receive UPDATE event
   Status: pickup → in_progress
   🎉 Toast: "ไรเดอร์กำลังดำเนินการ"
   ↓
                                5. Click "เสร็จสิ้น"
                                   ↓
6. 📡 Receive UPDATE event
   Status: in_progress → completed
   🎉 Toast: "งานเสร็จสิ้นแล้ว!"
```

---

## 🔍 Expected Console Logs

### Customer Browser Console

#### Step 1: Create Booking

```javascript
💰 Balance changed in QueueBookingView: 950
🎫 Creating queue booking...
👤 User ID: bc1a3546-ee13-47d6-804a-6be9055509b4
💰 Current balance (from composable): 950
💰 Formatted balance: ฿950.00
💵 Service fee: 50
🔌 Calling create_queue_atomic RPC...
✅ RPC Result: {success: true, booking_id: 'd8ed2c45-...', message: '...'}
✅ Booking created successfully: d8ed2c45-ebd6-4e3b-831b-71a581d12bbe
📡 Subscribed to queue booking updates: d8ed2c45-ebd6-4e3b-831b-71a581d12bbe
```

#### Step 2: Provider Accepts (Customer receives update)

```javascript
📡 Queue booking status updated: pending → confirmed
✅ Toast notification: "ไรเดอร์รับงานแล้ว! กำลังเดินทางมา"
```

#### Step 3: Provider Arrives (Customer receives update)

```javascript
📡 Queue booking status updated: confirmed → pickup
📍 Toast notification: "ไรเดอร์ถึงจุดรับแล้ว"
```

#### Step 4: Provider Starts (Customer receives update)

```javascript
📡 Queue booking status updated: pickup → in_progress
🚗 Toast notification: "ไรเดอร์กำลังดำเนินการ"
```

#### Step 5: Provider Completes (Customer receives update)

```javascript
📡 Queue booking status updated: in_progress → completed
🎉 Toast notification: "งานเสร็จสิ้นแล้ว!"
```

#### Step 6: Navigate Away (Cleanup)

```javascript
🔌 Unsubscribed from queue booking updates
```

---

### Provider Browser Console

#### Step 1: See New Booking

```javascript
[ProviderHome] New queue booking received: {
  id: 'd8ed2c45-ebd6-4e3b-831b-71a581d12bbe',
  status: 'pending',
  category: 'hospital',
  place_name: 'โรงพยาบาลรามาธิบดี',
  ...
}
```

#### Step 2: Accept Job

```javascript
[JobDetail] Loading job: d8ed2c45-ebd6-4e3b-831b-71a581d12bbe
[JobDetail] Found as queue_booking
[JobDetail] Updating status: pending → confirmed
✅ Status updated successfully
```

#### Step 3: Update to Pickup

```javascript
[JobDetail] Updating status: confirmed → pickup
[JobDetail] Table: queue_bookings, Job ID: d8ed2c45-..., Type: queue
✅ Status updated successfully
```

#### Step 4: Update to In Progress

```javascript
[JobDetail] Updating status: pickup → in_progress
[JobDetail] Table: queue_bookings, Job ID: d8ed2c45-..., Type: queue
✅ Status updated successfully
```

#### Step 5: Complete Job

```javascript
[JobDetail] Updating status: in_progress → completed
[JobDetail] Table: queue_bookings, Job ID: d8ed2c45-..., Type: queue
✅ Status updated successfully
```

---

## ✅ Test Checklist

### Pre-Test Setup

- [ ] Customer has sufficient wallet balance (≥ ฿50)
- [ ] Provider is approved and online
- [ ] Both browsers have hard refreshed (Cmd+Shift+R)
- [ ] Console is open on both browsers
- [ ] Network tab is open (optional, for debugging)

### Test Steps

#### 1. Customer Creates Booking

- [ ] Navigate to `/queue-booking`
- [ ] Select category (e.g., "โรงพยาบาล")
- [ ] Enter place name
- [ ] Select date and time
- [ ] Click "ยืนยันการจองคิว"
- [ ] Verify success toast appears
- [ ] Verify console shows subscription log
- [ ] Verify redirected to booking detail page

#### 2. Provider Accepts Job

- [ ] Provider sees new booking in list
- [ ] Provider clicks on booking
- [ ] Provider clicks "รับงาน" button
- [ ] Verify provider console shows success
- [ ] **CRITICAL**: Verify customer console shows realtime update
- [ ] **CRITICAL**: Verify customer sees toast "ไรเดอร์รับงานแล้ว!"
- [ ] Verify customer UI updates (status badge, provider info)

#### 3. Provider Updates to Pickup

- [ ] Provider clicks "ถึงจุดรับแล้ว" button
- [ ] Verify provider console shows success
- [ ] **CRITICAL**: Verify customer console shows realtime update
- [ ] **CRITICAL**: Verify customer sees toast "ไรเดอร์ถึงจุดรับแล้ว"
- [ ] Verify customer UI updates

#### 4. Provider Updates to In Progress

- [ ] Provider clicks "เริ่มดำเนินการ" button
- [ ] Verify provider console shows success
- [ ] **CRITICAL**: Verify customer console shows realtime update
- [ ] **CRITICAL**: Verify customer sees toast "ไรเดอร์กำลังดำเนินการ"
- [ ] Verify customer UI updates

#### 5. Provider Completes Job

- [ ] Provider clicks "เสร็จสิ้น" button
- [ ] Verify provider console shows success
- [ ] **CRITICAL**: Verify customer console shows realtime update
- [ ] **CRITICAL**: Verify customer sees toast "งานเสร็จสิ้นแล้ว!"
- [ ] Verify customer UI updates

#### 6. Cleanup Test

- [ ] Customer navigates away from page
- [ ] Verify console shows unsubscribe log
- [ ] No console errors
- [ ] No memory leaks

---

## 🚨 Common Issues & Solutions

### Issue 1: Customer Not Receiving Updates

**Symptoms**:

- Provider updates status successfully
- Customer console shows no realtime logs
- Customer UI doesn't update

**Solution**:

```bash
# Customer browser needs hard refresh
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

**Verification**:

- Check console for subscription log after creating booking
- Should see: "📡 Subscribed to queue booking updates: {id}"

---

### Issue 2: Old JavaScript Running

**Symptoms**:

- Console logs show old format
- Missing detailed logging with table name and job type
- Error: "ไม่สามารถอัพเดทสถานะได้"

**Solution**:

```bash
# Hard refresh browser
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Or clear cache completely
1. Open DevTools
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
```

---

### Issue 3: Subscription Not Established

**Symptoms**:

- No subscription log in console
- Customer doesn't receive any updates

**Debugging**:

```javascript
// Check if subscribeToBooking was called
// Should see in console after booking created:
📡 Subscribed to queue booking updates: {booking_id}

// If not, check:
1. Is booking created successfully?
2. Is result.id valid?
3. Is subscribeToBooking function imported?
```

---

### Issue 4: Multiple Subscriptions

**Symptoms**:

- Duplicate toast notifications
- Multiple console logs for same event

**Solution**:

```javascript
// Ensure cleanup is working
// Should see on unmount:
🔌 Unsubscribed from queue booking updates

// If not, check:
1. Is onUnmounted hook registered?
2. Is unsubscribe function called?
```

---

## 📊 Success Criteria

### Must Pass All

- [x] Customer creates booking successfully
- [x] Subscription established (console log appears)
- [x] Provider accepts job
- [x] Customer receives realtime update (< 1 second)
- [x] Toast notification appears
- [x] UI updates automatically
- [x] All status transitions work (confirmed → pickup → in_progress → completed)
- [x] Cleanup on unmount (unsubscribe log appears)
- [x] No console errors
- [x] No memory leaks

---

## 🎯 Performance Metrics

### Expected Timings

| Event                   | Expected Time | Acceptable | Poor   |
| ----------------------- | ------------- | ---------- | ------ |
| Booking Creation        | < 2s          | < 3s       | > 5s   |
| Subscription Setup      | < 0.5s        | < 1s       | > 2s   |
| Realtime Update Latency | < 0.5s        | < 1s       | > 2s   |
| Toast Display           | Instant       | < 0.2s     | > 0.5s |
| UI Update               | Instant       | < 0.2s     | > 0.5s |
| Cleanup                 | Instant       | < 0.1s     | > 0.5s |

---

## 🔧 Debug Tools

### Network Tab

```
Filter: WS (WebSocket)
Look for: realtime-v1.supabase.co

Expected:
- Status: 101 Switching Protocols
- Type: websocket
- Messages: Should see UPDATE events
```

### Supabase Realtime Inspector

```javascript
// Add to console for debugging
supabase.getChannels().forEach((channel) => {
  console.log("Channel:", channel.topic, "State:", channel.state);
});

// Expected output:
// Channel: realtime:queue_booking_{id} State: joined
```

---

## 📝 Test Report Template

```markdown
## Test Report: Customer Queue Booking Realtime

**Date**: 2026-01-27
**Tester**: [Your Name]
**Environment**: Production / Staging

### Test Results

- [ ] Booking Creation: PASS / FAIL
- [ ] Subscription Setup: PASS / FAIL
- [ ] Realtime Updates: PASS / FAIL
- [ ] Toast Notifications: PASS / FAIL
- [ ] UI Updates: PASS / FAIL
- [ ] Cleanup: PASS / FAIL

### Issues Found

1. [Issue description]
   - Severity: Critical / High / Medium / Low
   - Steps to reproduce:
   - Expected behavior:
   - Actual behavior:
   - Screenshots/Logs:

### Performance

- Booking creation time: [X]s
- Realtime update latency: [X]ms
- Toast display time: [X]ms

### Notes

[Any additional observations]

### Conclusion

Overall Status: ✅ PASS / ❌ FAIL
```

---

## 🎉 Expected Final State

### Customer View

```
✅ Booking created
✅ Realtime subscription active
✅ Received all status updates
✅ Saw all toast notifications
✅ UI updated automatically
✅ No manual refresh needed
✅ Clean unsubscribe on exit
✅ No console errors
```

### Provider View

```
✅ Saw new booking appear
✅ Accepted job successfully
✅ Updated status multiple times
✅ All updates successful
✅ No console errors
```

### Admin View

```
✅ Saw booking in real-time
✅ Saw all status changes
✅ Can monitor complete flow
✅ No console errors
```

---

**Status**: ✅ READY FOR TESTING

**Next Steps**:

1. Hard refresh both browsers (Cmd+Shift+R)
2. Follow test checklist step by step
3. Verify all console logs appear as expected
4. Confirm all toast notifications appear
5. Document any issues found
