# 🔄 Browser Cache Fix - Hard Refresh Required

**Date**: 2026-01-19  
**Status**: ✅ Code Fixed - Needs Browser Refresh  
**Priority**: 🔥 URGENT

---

## 🎯 Problem

You're seeing this error:

```
TypeError: toast.error is not a function
at handleSubmit (SystemSettingsView.vue:397:11)
```

**Root Cause**: Browser is using **cached old JavaScript** that has the bug. The code has been fixed, but your browser hasn't loaded the new version yet.

---

## ✅ Solution: Hard Refresh

### Method 1: Keyboard Shortcut (Fastest)

**Mac:**

```
Cmd + Shift + R
```

**Windows/Linux:**

```
Ctrl + Shift + R
```

### Method 2: Developer Tools (Most Reliable)

1. Open Developer Tools:
   - Mac: `Cmd + Option + I`
   - Windows/Linux: `F12` or `Ctrl + Shift + I`

2. Right-click the **Refresh button** (next to address bar)

3. Select: **"Empty Cache and Hard Reload"** or **"Hard Reload"**

### Method 3: Clear Cache Manually

1. Open Developer Tools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear storage** or **Clear site data**
4. Check all boxes
5. Click **Clear data**
6. Refresh page (`F5`)

### Method 4: Restart Dev Server (If above doesn't work)

```bash
# Stop server
Ctrl + C

# Start server
npm run dev
```

Then do a hard refresh in browser.

---

## 🔍 How to Verify Fix Worked

After hard refresh, try to save settings again. You should see:

### ✅ Success Indicators:

- No error in console
- Green success toast: **"บันทึกการตั้งค่าสำเร็จ"**
- Settings saved to database

### ❌ If Still Failing:

- Check console for different error
- Verify you're logged in as admin/super_admin
- Try Method 4 (restart dev server)

---

## 📋 What Was Fixed

### Before (Bug):

```typescript
const toast = useToast(); // ❌ Wrong - returns object

toast.success("..."); // ❌ Error: toast.success is not a function
toast.error("..."); // ❌ Error: toast.error is not a function
```

### After (Fixed):

```typescript
const { showSuccess, showError, showWarning } = useToast(); // ✅ Correct

showSuccess("..."); // ✅ Works
showError("..."); // ✅ Works
showWarning("..."); // ✅ Works
```

### Files Fixed:

- ✅ `src/admin/views/SystemSettingsView.vue` (line ~35)
- ✅ All 6 toast calls updated in the file

---

## 🚀 Quick Test After Refresh

1. Go to: `http://localhost:5173/admin/settings/system`
2. Change **"ชื่อเว็บไซต์"** to something new
3. Click **"บันทึก"** button
4. Should see: ✅ **"บันทึกการตั้งค่าสำเร็จ"** (green toast)
5. No errors in console

---

## 💡 Why This Happens

Modern browsers **aggressively cache JavaScript** for performance. When you update code:

1. Vite rebuilds the bundle ✅
2. New bundle is on server ✅
3. But browser still uses old cached version ❌

**Solution**: Hard refresh forces browser to download fresh files.

---

## 🔧 Prevent Future Cache Issues

### Option 1: Disable Cache in DevTools (Recommended for Development)

1. Open DevTools (`F12`)
2. Go to **Network** tab
3. Check: ☑️ **"Disable cache"**
4. Keep DevTools open while developing

### Option 2: Use Incognito/Private Mode

- Mac: `Cmd + Shift + N`
- Windows: `Ctrl + Shift + N`

Incognito mode doesn't use cache, so you always get fresh code.

---

## 📊 Verification Checklist

After hard refresh, verify:

- [ ] No `toast.error is not a function` error
- [ ] Can save settings successfully
- [ ] See success toast message
- [ ] Console shows no errors
- [ ] Settings persist after page reload

---

## 🆘 Still Not Working?

If hard refresh doesn't fix it:

1. **Check you're on the right page**: `http://localhost:5173/admin/settings/system`
2. **Verify dev server is running**: Should see Vite output in terminal
3. **Check console for different error**: Might be a different issue
4. **Restart dev server**: `Ctrl+C` then `npm run dev`
5. **Clear all browser data**: Settings → Privacy → Clear browsing data
6. **Try different browser**: Chrome, Firefox, Safari

---

## 📝 Summary

**Problem**: Browser cache showing old buggy code  
**Solution**: Hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)  
**Expected**: Settings save successfully with success toast  
**Time**: < 5 seconds to fix

---

**Next Steps**:

1. Do hard refresh now
2. Test saving settings
3. Confirm success toast appears
4. Continue development! 🚀
