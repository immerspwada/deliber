# ✅ Verify Production Deployment

**Quick guide to verify customer ride realtime is working in production**

---

## 🎯 Quick Test (5 minutes)

### Step 1: Open Customer App

```
URL: https://deliber.vercel.app
Login: Use customer account
```

### Step 2: Book a Test Ride

1. Enter pickup location
2. Enter destination
3. Select ride type
4. Confirm booking
5. **Look for green badge** in top-right corner (realtime connected)

### Step 3: Open Admin Panel (New Tab)

```
URL: https://deliber.vercel.app/admin
Login: superadmin@gobear.app
```

### Step 4: Reassign Provider

1. Go to "Orders" page
2. Find your test ride
3. Click "Reassign Provider" button
4. Select different provider
5. Click "Confirm"

### Step 5: Watch Customer App

**Expected Results**:

- ✅ Toast appears: "ไรเดอร์เปลี่ยนแปลง กำลังโหลดข้อมูลใหม่..."
- ✅ Provider info updates automatically
- ✅ No page refresh needed
- ✅ Green badge stays connected

---

## 🔍 Detailed Verification

### 1. Connection Status Indicator

**Location**: Top-right corner of ride tracking screen

**States**:

- 🟢 **Green**: Connected to realtime
- 🟡 **Yellow**: Connecting/reconnecting
- 🔴 **Red**: Disconnected

**Test**:

1. Open ride tracking
2. Should see green badge immediately
3. Turn off WiFi
4. Should see red badge
5. Turn on WiFi
6. Should reconnect to green within 5-10 seconds

---

### 2. Provider Reassignment

**Test Flow**:

```
Customer App                Admin Panel
------------                -----------
1. Book ride         →      2. See new order
3. Wait for match    ←      4. Assign provider A
5. See provider A    →      6. Reassign to provider B
7. Toast appears!    ←      8. Confirm reassignment
9. See provider B    ✅     10. Done!
```

**Expected Behavior**:

- Customer sees toast notification
- Provider info updates without refresh
- Connection stays green
- No errors in console

---

### 3. Status Changes

**Test Each Status**:

| Status        | Admin Action       | Customer Sees                           |
| ------------- | ------------------ | --------------------------------------- |
| `matched`     | Assign provider    | "พบไรเดอร์แล้ว!"                        |
| `picked_up`   | Provider accepts   | "ไรเดอร์รับงานแล้ว"                     |
| `in_progress` | Provider starts    | "กำลังเดินทาง"                          |
| `completed`   | Provider completes | "เดินทางเสร็จสิ้น" + navigate to rating |
| `cancelled`   | Admin cancels      | "ไรด์ถูกยกเลิก" + reset UI              |

**How to Test**:

1. Use admin panel to change ride status
2. Watch customer app for instant updates
3. Verify toast messages appear
4. Verify UI updates correctly

---

### 4. Cancellation

**Test Flow**:

1. Customer books ride
2. Admin cancels ride
3. Customer should see:
   - ❌ Error toast: "ไรด์ถูกยกเลิก"
   - 🔄 UI resets to booking screen
   - ✅ No errors

---

### 5. Multiple Customers

**Test Isolation**:

1. Open 2 customer accounts (different browsers)
2. Book ride for Customer A
3. Book ride for Customer B
4. Reassign Customer A's ride
5. **Verify**: Only Customer A sees update
6. **Verify**: Customer B sees nothing

---

## 🐛 Troubleshooting

### Issue: Green badge never appears

**Possible Causes**:

1. Supabase Realtime not enabled
2. Network blocked
3. Authentication issue

**Fix**:

```javascript
// Open browser console
// Check for errors
console.log("Realtime status:", realtimeStatus.value);
console.log("Connected:", isRealtimeConnected.value);
```

---

### Issue: Updates not appearing

**Check**:

1. Is green badge showing? (connection active)
2. Is ride ID correct?
3. Are you logged in as correct user?
4. Check browser console for errors

**Debug**:

```javascript
// In browser console
localStorage.getItem("supabase.auth.token");
// Should show valid token
```

---

### Issue: Toast not showing

**Check**:

1. Is `useToast` composable working?
2. Is toast container rendered?
3. Check z-index conflicts

**Test**:

```javascript
// In browser console
import { useToast } from "@/composables/useToast";
const toast = useToast();
toast.success("Test message");
```

---

## 📊 Performance Checks

### 1. Realtime Latency

**Test**:

1. Admin reassigns provider
2. Note timestamp
3. Customer sees update
4. Note timestamp
5. **Target**: < 2 seconds

### 2. Reconnection Speed

**Test**:

1. Disconnect network
2. Wait for red badge
3. Reconnect network
4. Time until green badge
5. **Target**: < 10 seconds

### 3. Memory Leaks

**Test**:

1. Open ride tracking
2. Open browser DevTools → Memory
3. Take heap snapshot
4. Navigate away
5. Take another snapshot
6. **Verify**: Memory released

---

## 🔐 Security Checks

### 1. RLS Policies

**Verify**:

```sql
-- Customer can only see their own rides
SELECT * FROM ride_requests WHERE customer_id != auth.uid();
-- Should return 0 rows

-- Customer cannot see other customers' updates
-- Test by subscribing to another customer's ride
-- Should not receive updates
```

### 2. Authentication

**Verify**:

1. Logout
2. Try to access ride tracking
3. Should redirect to login
4. Realtime should disconnect

---

## 📱 Mobile Testing

### iOS Safari

- ✅ Connection indicator visible
- ✅ Toast notifications work
- ✅ Reconnection works
- ✅ No console errors

### Android Chrome

- ✅ Connection indicator visible
- ✅ Toast notifications work
- ✅ Reconnection works
- ✅ No console errors

### PWA Mode

- ✅ Works in installed PWA
- ✅ Background reconnection
- ✅ Notifications work

---

## 🎓 Advanced Testing

### 1. Stress Test

**Scenario**: Multiple rapid changes

1. Admin reassigns provider 5 times quickly
2. Customer should see all updates
3. No duplicate toasts
4. No memory leaks

### 2. Network Interruption

**Scenario**: Unstable connection

1. Toggle WiFi on/off repeatedly
2. Connection should recover
3. No duplicate subscriptions
4. Updates still work

### 3. Long Session

**Scenario**: Keep app open for 1 hour

1. Connection should stay green
2. Updates still work
3. No memory increase
4. No performance degradation

---

## ✅ Production Checklist

Before marking as "verified":

- [ ] Connection indicator shows green
- [ ] Provider reassignment works instantly
- [ ] Status changes appear in realtime
- [ ] Cancellation works correctly
- [ ] Toast messages in Thai
- [ ] No console errors
- [ ] Mobile works (iOS + Android)
- [ ] Reconnection works
- [ ] Multiple customers isolated
- [ ] Performance acceptable (< 2s latency)
- [ ] Memory stable (no leaks)
- [ ] Security verified (RLS working)

---

## 📞 Report Issues

If any test fails:

1. **Check browser console** for errors
2. **Check Supabase logs** for realtime issues
3. **Check Vercel logs** for deployment issues
4. **Document the issue** with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots/videos
   - Browser/device info

---

## 🎉 Success Criteria

**System is working correctly when**:

- ✅ All tests pass
- ✅ No console errors
- ✅ Latency < 2 seconds
- ✅ Reconnection < 10 seconds
- ✅ Mobile works perfectly
- ✅ Users report positive experience

---

**Last Updated**: 2026-01-19  
**Status**: ✅ Ready for Production Testing  
**Deployment**: Live at https://deliber.vercel.app
