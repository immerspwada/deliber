ated` role

The issue you're seeing is just browser caching - the functions are working on the server!
tication
5. All functions are granted to `authentic
```javascript
{
  code: '...',
  message: '...',
  details: '...'
}
```

Share this error message for further debugging.

## ✅ What Was Fixed

1. Created `get_available_providers()` function
2. Created `reassign_order()` function  
3. Created `get_reassignment_history()` function
4. All functions have proper admin authenl error message. The error object should show:
, 'reassign_order', 'get_reassignment_history');
```

Expected result: 3 rows

### Step 4: Test the Feature

1. Navigate to `/admin/orders`
2. Click "ย้ายงาน" on any order
3. Modal should now load with list of providers

## 🔍 Still Not Working?

Check browser console for the actua
  AND routine_name IN ('get_available_providers' Clear Browser Cache (If hard refresh doesn't work)

**Chrome/Edge**:
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"

**Firefox**:
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cache"
3. Click "Clear Now"

### Step 3: Verify Functions (Optional)

Run this in Supabase SQL Editor to confirm functions exist:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' ting 400 Bad Request when clicking "ย้ายงาน" button

## ✅ Solution: Clear Browser Cache

The functions are correctly installed on production, but your browser is caching the old 404 error response.

### Step 1: Hard Refresh (Try this first!)

**Windows/Linux**: `Ctrl + Shift + R`  
**Mac**: `Cmd + Shift + R`

### Step 2:# 🚀 Quick Fix Guide - Order Reassignment 400 Error

**Issue**: Get