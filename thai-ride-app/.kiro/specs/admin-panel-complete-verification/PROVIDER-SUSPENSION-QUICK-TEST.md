# Provider Suspension - Quick Test Guide

**Status**: ✅ Ready for Testing  
**Time Required**: 5 minutes

---

## 🚀 Quick Start

### 1. Start Dev Server (if not running)

```bash
npm run dev
```

### 2. Navigate to Admin Providers

```
http://localhost:5173/admin/providers
```

### 3. Login as Admin

```
Email: superadmin@gobear.app
Password: [your admin password]
```

---

## ✅ Test Checklist

### Test 1: View Providers List

- [ ] Page loads without errors
- [ ] Providers list displays
- [ ] Status badges show correctly
- [ ] Real-time indicator shows "Live"

### Test 2: Open Provider Detail

- [ ] Click on any provider
- [ ] Detail modal opens
- [ ] All information displays correctly
- [ ] Commission section shows

### Test 3: Suspend Provider (Main Test)

- [ ] Find provider with status "approved" or "active"
- [ ] Click "ระงับ" (Suspend) button
- [ ] Suspension modal opens
- [ ] Enter reason: "Test suspension"
- [ ] Click "ยืนยัน" (Confirm)
- [ ] Success toast appears: "ระงับผู้ให้บริการสำเร็จ"
- [ ] Modal closes automatically
- [ ] Provider status changes to "suspended"
- [ ] Provider list refreshes

### Test 4: Verify in Database

```sql
-- Replace <provider_id> with actual ID
SELECT
  id,
  status,
  suspended_at,
  suspension_reason,
  is_online,
  is_available
FROM providers_v2
WHERE id = '<provider_id>';
```

**Expected Results:**

- `status` = 'suspended'
- `suspended_at` = recent timestamp
- `suspension_reason` = 'Test suspension'
- `is_online` = false
- `is_available` = false

---

## 🐛 Common Issues & Solutions

### Issue: "ไม่สามารถระงับผู้ให้บริการได้"

**Solution:**

1. Check browser console for errors
2. Verify admin permissions
3. Check if provider is already suspended

### Issue: Modal doesn't close

**Solution:**

1. Check browser console
2. Verify toast notifications work
3. Refresh page and try again

### Issue: Status doesn't update

**Solution:**

1. Check real-time connection (should show "Live")
2. Manually refresh page
3. Verify database was updated

---

## 🔍 Debug Commands

### Check Admin Role

```sql
SELECT id, email, role
FROM users
WHERE email = 'superadmin@gobear.app';
```

**Expected:** `role` = 'admin'

### Check RPC Function

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'suspend_provider_v2_enhanced';
```

**Expected:** 1 row returned

### Check Recent Suspensions

```sql
SELECT * FROM status_audit_log
WHERE action = 'provider_suspended'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Provider Status

```sql
SELECT id, first_name, last_name, status, suspended_at
FROM providers_v2
WHERE status = 'suspended'
ORDER BY suspended_at DESC
LIMIT 5;
```

---

## ✅ Success Indicators

1. **No Console Errors** - Browser console is clean
2. **Toast Appears** - Success message shows
3. **Status Updates** - Provider status changes to 'suspended'
4. **Database Updated** - All fields set correctly
5. **Audit Log Created** - Suspension logged
6. **Notification Sent** - Provider notified (check notifications table)

---

## 📊 Test Results Template

````markdown
## Test Results - [Date]

### Environment

- Browser: [Chrome/Firefox/Safari]
- Dev Server: [Running/Not Running]
- Database: [Production/Local]

### Test 1: View Providers List

- Status: [✅ Pass / ❌ Fail]
- Notes:

### Test 2: Open Provider Detail

- Status: [✅ Pass / ❌ Fail]
- Notes:

### Test 3: Suspend Provider

- Status: [✅ Pass / ❌ Fail]
- Provider ID:
- Reason:
- Toast Message:
- Notes:

### Test 4: Database Verification

- Status: [✅ Pass / ❌ Fail]
- Query Results:

```sql
-- Paste query results here
```
````

### Overall Result

- [✅ All Tests Pass / ❌ Some Tests Failed]

### Issues Found

1.
2.
3.

### Screenshots

- [Attach screenshots if needed]

```

---

## 🎯 Next Steps After Testing

### If All Tests Pass ✅
1. Mark feature as complete
2. Deploy to production
3. Monitor for issues
4. Update documentation

### If Tests Fail ❌
1. Document exact error messages
2. Check browser console
3. Verify database state
4. Review code changes
5. Contact developer for support

---

## 📞 Need Help?

### Check These First
1. Browser console errors
2. Network tab in DevTools
3. Database connection
4. Admin permissions

### Still Stuck?
- Review: `PROVIDER-SUSPENSION-FIX.md`
- Check: Database logs
- Verify: RPC function exists
- Test: Direct SQL query

---

**Happy Testing!** 🎉
```
