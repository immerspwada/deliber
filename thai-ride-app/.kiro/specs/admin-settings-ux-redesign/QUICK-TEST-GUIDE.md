# 🚀 Quick Test Guide - System Settings Fix

**Status**: ✅ Fix Applied - Ready to Test  
**Time to Test**: 2 minutes

---

## ⚡ Quick Test (2 Minutes)

### Step 1: Login (30 seconds)

```
URL: http://localhost:5173/admin/login
Login: admin@gobear.app or superadmin@gobear.app
```

### Step 2: Go to Settings (10 seconds)

```
URL: http://localhost:5173/admin/settings/system
```

### Step 3: Change & Save (1 minute)

1. Find "ชื่อเว็บไซต์" (Site Name) field
2. Change to: `Thai Ride App - Test ${Date.now()}`
3. Click "บันทึกการตั้งค่า" (Save Settings)

### Step 4: Verify (20 seconds)

- ✅ See success message: "บันทึกการตั้งค่าสำเร็จ"
- ✅ No authorization errors
- ✅ Refresh page - changes persist

---

## ✅ Success Criteria

| Check           | Expected Result              |
| --------------- | ---------------------------- |
| Save Button     | ✅ Works without errors      |
| Success Message | ✅ "บันทึกการตั้งค่าสำเร็จ"  |
| No Errors       | ✅ No "Unauthorized" message |
| Changes Persist | ✅ Still there after refresh |
| Audit Log       | ✅ Shows in "📋 ประวัติ"     |

---

## ❌ If Still Failing

### Quick Checks:

1. **Browser Console** (F12):
   - Any red errors?
   - Screenshot and share

2. **Try Different Admin**:
   - Try `admin@gobear.app`
   - Try `superadmin@gobear.app`

3. **Clear & Retry**:
   - Logout
   - Clear cache (Ctrl+Shift+Delete)
   - Login again
   - Try saving

---

## 🔧 What Was Fixed

**Problem**:

- Error: "Unauthorized: Admin access required"
- Couldn't save any settings

**Solution**:

- Updated 4 database functions
- Updated 2 security policies
- Now accepts both `admin` and `super_admin` roles

**Changes**:

- ✅ Database: 6 objects updated
- ✅ Frontend: No changes needed
- ✅ Applied: Live on Production

---

## 📞 Report Results

### If Working ✅

Just reply: "ใช้งานได้แล้ว" (It works)

### If Still Failing ❌

Share:

1. Screenshot of error
2. Browser console logs (F12 → Console tab)
3. Which admin account you used

---

**Fix Applied**: 2026-01-19  
**Confidence**: 🔥 High  
**Test Time**: ⏱️ 2 minutes
