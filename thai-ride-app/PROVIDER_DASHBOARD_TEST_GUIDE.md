# Provider Dashboard Testing Guide

## Quick Test Scenarios

### Scenario 1: Provider Goes Online and Accepts Ride

#### Step 1: Setup
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:5173/provider`
3. Login as provider (or use demo mode)

#### Step 2: Go Online
1. Click the toggle switch to go online
2. Allow location permission when prompted
3. Verify status changes to "ออนไลน์" (Online)
4. Verify "พร้อมรับงาน" message appears

#### Step 3: Create Test Ride (Different Browser/Tab)
1. Open another browser/tab
2. Navigate to `http://localhost:5173/customer/ride`
3. Login as customer
4. Create a ride request:
   - Pickup: "สยามพารากอน"
   - Destination: "เซ็นทรัลเวิลด์"
   - Click "จองเลย"

#### Step 4: Accept Ride (Provider Tab)
1. Wait for ride to appear in provider dashboard (should be instant)
2. Verify sound notification plays
3. Verify ride card shows:
   - ✅ Pickup address
   - ✅ Destination address
   - ✅ Estimated fare
   - ✅ Customer name
4. Click "รับงาน" button
5. Verify:
   - ✅ Button shows loading state
   - ✅ Ride moves to "Active Job" view
   - ✅ Customer details displayed
   - ✅ Route shown with pickup/destination
   - ✅ Call button available

#### Step 5: Update Status
1. Click "ใกล้ถึงแล้ว" (Arriving)
2. Verify status updates
3. Click "ถึงจุดรับ" (Arrived)
4. Click "รับผู้โดยสาร" (Picked Up)
5. Click "เริ่มเดินทาง" (In Progress)
6. Click "จบงาน" (Complete)
7. Verify:
   - ✅ Earnings update
   - ✅ Trip count increases
   - ✅ Returns to available rides view

#### Step 6: Verify Customer Side
1. Switch to customer tab
2. Verify status updates in real-time:
   - ✅ "พบคนขับแล้ว" notification
   - ✅ Provider details shown
   - ✅ Status changes reflected
   - ✅ Rating modal appears after completion

### Scenario 2: Race Condition Test (Multiple Providers)

#### Setup
1. Open 3 browser windows/tabs
2. Login as different providers in each
3. All go online

#### Test
1. Create one ride request
2. All 3 providers should see the ride
3. Click "รับงาน" on all 3 simultaneously
4. Expected result:
   - ✅ Only ONE provider succeeds
   - ✅ Other two get error: "งานนี้ถูกรับไปแล้ว"
   - ✅ Ride disappears from other providers' lists
   - ✅ No duplicate acceptance in database

### Scenario 3: Network Recovery Test

#### Test
1. Provider goes online
2. Disconnect internet
3. Create ride request (from another device)
4. Reconnect internet
5. Expected result:
   - ✅ "กำลังเชื่อมต่อใหม่..." banner appears
   - ✅ Rides load automatically after reconnection
   - ✅ No data loss

### Scenario 4: Pull-to-Refresh

#### Test
1. Provider online with some pending rides
2. Pull down on the screen (mobile gesture)
3. Expected result:
   - ✅ Pull indicator appears
   - ✅ "ดึงลงเพื่อรีเฟรช" message
   - ✅ Release to refresh
   - ✅ Rides reload
   - ✅ Earnings update

## Demo Mode Testing

### Enable Demo Mode
```javascript
localStorage.setItem('demo_mode', 'true')
localStorage.setItem('demo_user', JSON.stringify({
  id: 'demo-provider-1',
  role: 'driver',
  email: 'demo@provider.com'
}))
```

### Demo Mode Features
- ✅ No real database calls
- ✅ Simulated rides appear every 15-30 seconds
- ✅ Instant acceptance
- ✅ Mock earnings
- ✅ No location permission required

## Error Scenarios to Test

### 1. Ride Already Accepted
**Trigger:** Two providers accept same ride
**Expected:** "งานนี้ถูกรับไปแล้ว"

### 2. Ride Not Found
**Trigger:** Accept deleted ride
**Expected:** "ไม่พบงานนี้"

### 3. Provider Not Found
**Trigger:** Accept ride with invalid provider ID
**Expected:** "ไม่พบข้อมูลผู้ให้บริการ"

### 4. Network Error
**Trigger:** Disconnect during acceptance
**Expected:** Retry with exponential backoff

## Performance Testing

### Load Test
1. Create 20 pending rides
2. Provider goes online
3. Verify:
   - ✅ All rides load within 2 seconds
   - ✅ No UI lag
   - ✅ Smooth scrolling
   - ✅ Memory usage stable

### Memory Leak Test
1. Go online/offline 50 times
2. Accept/decline 50 rides
3. Verify:
   - ✅ Memory usage doesn't grow
   - ✅ No console errors
   - ✅ Subscriptions cleaned up

## Browser Compatibility

Test on:
- [ ] Chrome (Desktop)
- [ ] Safari (Desktop)
- [ ] Firefox (Desktop)
- [ ] Chrome (Mobile)
- [ ] Safari (iOS)
- [ ] Samsung Internet

## Admin Verification

### After Each Test
1. Login to admin at `/admin/rides`
2. Verify:
   - ✅ Ride appears in list
   - ✅ Status changes logged
   - ✅ Provider assignment correct
   - ✅ Timestamps accurate
   - ✅ Audit log entries created

## Database Verification

### Check ride_requests table
```sql
SELECT 
  id,
  tracking_id,
  status,
  provider_id,
  created_at,
  matched_at,
  completed_at
FROM ride_requests
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check status_audit_log
```sql
SELECT 
  entity_type,
  entity_id,
  old_status,
  new_status,
  changed_by_role,
  created_at
FROM status_audit_log
WHERE entity_type = 'ride_request'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Check service_providers
```sql
SELECT 
  id,
  status,
  is_available,
  current_ride_id,
  current_lat,
  current_lng
FROM service_providers
WHERE updated_at > NOW() - INTERVAL '1 hour';
```

## Success Criteria

### Must Pass
- ✅ Provider can go online/offline
- ✅ Provider sees pending rides in real-time
- ✅ Provider can accept rides without errors
- ✅ Race condition prevention works
- ✅ Status updates work correctly
- ✅ Customer receives notifications
- ✅ Admin sees all changes
- ✅ No memory leaks
- ✅ No console errors

### Nice to Have
- ✅ Sound notifications work
- ✅ Haptic feedback works (mobile)
- ✅ Pull-to-refresh works
- ✅ Smooth animations
- ✅ Fast load times (<2s)

## Troubleshooting

### Provider doesn't see rides
1. Check provider is online (toggle switch)
2. Check provider status in database (should be 'approved')
3. Check RLS policies allow provider to read pending rides
4. Check realtime subscription is active
5. Check browser console for errors

### Accept fails with "งานนี้ถูกรับไปแล้ว"
- This is CORRECT behavior for race condition
- Another provider accepted first
- Ride should disappear from list

### Status update fails
1. Check provider_id matches in ride_requests
2. Check provider has permission to update
3. Check status flow is valid
4. Check network connection

### No sound notification
1. Check browser allows audio
2. Check volume is on
3. Check useSoundNotification composable loaded
4. Try clicking page first (browser autoplay policy)

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Network tab (if relevant)
6. Database state (if relevant)

## Next Steps After Testing

1. ✅ Verify all scenarios pass
2. ✅ Document any issues found
3. ✅ Fix critical bugs
4. ✅ Deploy to staging
5. ✅ User acceptance testing
6. ✅ Deploy to production
7. ✅ Monitor for errors
8. ✅ Gather user feedback
