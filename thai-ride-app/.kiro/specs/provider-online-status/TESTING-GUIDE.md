# 🧪 Provider Online Status - Testing Guide

**Date**: 2026-01-19  
**Status**: Ready for Testing

---

## 🎯 Quick Test (5 minutes)

### Step 1: Hard Refresh Browser ⚡

**CRITICAL:** You MUST do this first!

**Windows/Linux:**

```
Ctrl + Shift + R
```

**Mac:**

```
Cmd + Shift + R
```

**Why?** Browser has cached the old JavaScript code that calls the wrong function.

---

### Step 2: Login as Provider 👤

1. Go to provider login page
2. Login with your provider account
3. Navigate to Provider Dashboard

---

### Step 3: Toggle Online Status 🔄

1. Find the "เปิดรับงาน" or "ออนไลน์" button
2. Click it to go online
3. **Expected:** Status changes to "ออนไลน์" (green)
4. **Expected:** Button text changes to "ปิดรับงาน" or "ออฟไลน์"

---

### Step 4: Verify in Admin Panel 👑

1. Open a new tab/window
2. Login as Admin: `superadmin@gobear.app`
3. Navigate to `/admin/orders`
4. Click any order's "ย้ายงาน" (Reassign) button
5. **Expected:** You should see yourself in the provider list
6. **Expected:** Your status should show as "ออนไลน์"

---

## ✅ Success Indicators

### In Provider Dashboard

- ✅ Button toggles between "เปิดรับงาน" and "ปิดรับงาน"
- ✅ Status indicator shows green when online
- ✅ No error messages in console
- ✅ Location updates (if GPS enabled)

### In Admin Panel

- ✅ Provider appears in reassignment modal
- ✅ Provider shows as "ออนไลน์"
- ✅ Provider is at the top of the list (online providers first)
- ✅ Location shows on map (if available)

### In Browser Console

Open DevTools (F12) and check:

```javascript
// Should see this when toggling online:
[useProvider] Toggle online: true
[useProvider] RPC call: toggle_provider_online_v2
[useProvider] Success: { success: true, is_online: true, ... }
```

**No errors should appear!**

---

## 🐛 Troubleshooting

### Problem: Still not showing as online

**Solution 1: Clear Cache**

```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

**Solution 2: Check Database**

```sql
SELECT
  id,
  first_name || ' ' || last_name AS name,
  is_online,
  is_available,
  status
FROM providers_v2
WHERE user_id = '<your_user_id>';
```

Expected result:

- `is_online` = `true`
- `is_available` = `true`
- `status` = `'approved'`

**Solution 3: Check Console Errors**

```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Share the error message if you see one
```

---

### Problem: "PROVIDER_NOT_APPROVED" error

**Cause:** Your provider account is not approved yet

**Solution:**

```sql
-- Check your status
SELECT status FROM providers_v2 WHERE user_id = '<your_user_id>';

-- If not 'approved', admin needs to approve you
UPDATE providers_v2
SET status = 'approved'
WHERE user_id = '<your_user_id>';
```

---

### Problem: Cannot go offline

**Cause:** You have active jobs

**Solution:**

```sql
-- Check for active jobs
SELECT * FROM ride_requests
WHERE provider_id = '<your_provider_id>'
AND status IN ('matched', 'arriving', 'arrived', 'picked_up', 'in_progress');
```

You must complete or cancel active jobs before going offline.

---

## 📊 Database Verification

### Check Provider Status

```sql
-- Your current status
SELECT
  id,
  user_id,
  first_name || ' ' || last_name AS name,
  is_online,
  is_available,
  status,
  current_lat,
  current_lng,
  location_updated_at,
  updated_at
FROM providers_v2
WHERE user_id = '<your_user_id>';
```

### Check All Online Providers

```sql
-- All online providers
SELECT
  id,
  first_name || ' ' || last_name AS name,
  phone_number,
  is_online,
  is_available,
  status,
  location_updated_at
FROM providers_v2
WHERE is_online = true
AND status = 'approved'
ORDER BY location_updated_at DESC;
```

### Check Function Calls

```sql
-- Test the function directly
SELECT toggle_provider_online_v2(
  '<your_user_id>'::UUID,
  true,  -- go online
  13.7563,  -- latitude (Bangkok)
  100.5018  -- longitude (Bangkok)
);
```

Expected result:

```json
{
  "success": true,
  "provider_id": "uuid",
  "is_online": true,
  "message": "คุณออนไลน์แล้ว พร้อมรับงาน"
}
```

---

## 🔍 Advanced Testing

### Test Scenario 1: Toggle Multiple Times

1. Go online → Should succeed
2. Go offline → Should succeed
3. Go online again → Should succeed
4. Check database after each toggle

**Expected:** Status changes correctly each time

---

### Test Scenario 2: With Location

1. Enable GPS in browser
2. Go online
3. Check database for location update

**Expected:**

- `current_lat` and `current_lng` updated
- `location_updated_at` is recent

---

### Test Scenario 3: Without Location

1. Disable GPS in browser
2. Go online
3. Check database

**Expected:**

- Status changes to online
- Location remains unchanged (or NULL)
- No errors

---

### Test Scenario 4: With Active Job

1. Accept a job
2. Try to go offline

**Expected:**

- Error message: "ไม่สามารถออฟไลน์ได้ คุณยังมีงานที่กำลังทำอยู่"
- Status remains online

---

### Test Scenario 5: Admin View

1. Provider A goes online
2. Provider B goes online
3. Admin opens reassignment modal

**Expected:**

- Both providers appear in list
- Both show as "ออนไลน์"
- Online providers at top of list

---

## 📝 Test Checklist

### Basic Functionality

- [ ] Hard refresh browser completed
- [ ] Can login as provider
- [ ] Can toggle online status
- [ ] Status shows correctly in UI
- [ ] No console errors

### Admin Panel

- [ ] Can login as admin
- [ ] Can open reassignment modal
- [ ] Provider appears in list
- [ ] Provider shows as online
- [ ] Can select provider for reassignment

### Database

- [ ] `is_online` updates correctly
- [ ] `is_available` updates correctly
- [ ] `location_updated_at` updates when location provided
- [ ] `updated_at` always updates

### Edge Cases

- [ ] Works without GPS/location
- [ ] Prevents offline when has active job
- [ ] Shows error for unapproved providers
- [ ] Handles network errors gracefully

---

## 🎯 Expected Results Summary

| Test                | Expected Result                              |
| ------------------- | -------------------------------------------- |
| Toggle online       | ✅ Status changes, no errors                 |
| Admin sees provider | ✅ Provider in list, shows online            |
| Database check      | ✅ `is_online` = true, `is_available` = true |
| Console check       | ✅ No errors, success messages               |
| With location       | ✅ Location updates, timestamp updates       |
| Without location    | ✅ Status updates, location unchanged        |
| With active job     | ✅ Cannot go offline, shows error            |
| Unapproved provider | ✅ Cannot go online, shows error             |

---

## 📞 Report Issues

If something doesn't work:

1. **Check browser console** - Copy any error messages
2. **Check database** - Run the verification queries above
3. **Check network tab** - Look for failed requests
4. **Share details:**
   - What you did
   - What you expected
   - What actually happened
   - Any error messages
   - Screenshots if possible

---

## 🎉 Success!

If all tests pass:

- ✅ Provider online status is working correctly
- ✅ Admin can see online providers
- ✅ Order reassignment works
- ✅ System is ready for production use

**Congratulations! The fix is complete and working!** 🚀

---

**Last Updated:** 2026-01-19  
**Estimated Test Time:** 5-10 minutes  
**Difficulty:** Easy
