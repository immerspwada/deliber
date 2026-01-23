# Commit and Deploy Guide

**Date**: 2026-01-23  
**Changes**: Admin order status update fix + Enhanced debugging

---

## 📋 Changes Summary

### Files Modified

1. **src/admin/composables/useAdminAPI.ts**
   - Fixed `cancelled_by` to use admin's UUID instead of string 'admin'
   - Added `cancelled_by_role` field for role tracking
   - Added comprehensive logging for debugging
   - Added session verification before updates

### Files Created

1. **ADMIN_ORDER_STATUS_UPDATE_FIXED.md** - Complete fix documentation
2. **ADMIN_ORDERS_TEST_PLAN.md** - Comprehensive test plan
3. **ADMIN_ORDER_404_DEBUG.md** - Debugging guide

---

## 🔧 Git Commands

### Step 1: Check Status

```bash
git status
```

### Step 2: Stage Changes

```bash
# Stage the main fix
git add src/admin/composables/useAdminAPI.ts

# Stage documentation
git add ADMIN_ORDER_STATUS_UPDATE_FIXED.md
git add ADMIN_ORDERS_TEST_PLAN.md
git add ADMIN_ORDER_404_DEBUG.md
```

### Step 3: Commit

```bash
git commit -m "fix(admin): Fix order status update - use UUID for cancelled_by

- Changed cancelled_by from string 'admin' to admin's user UUID
- Added cancelled_by_role field to store role separately
- Added session verification before updates
- Added comprehensive logging for debugging
- Fixed 404 error when admin updates delivery status

Fixes: Admin couldn't update order status due to type mismatch
Tables affected: All *_requests tables (ride, delivery, shopping, queue, moving, laundry)
Breaking changes: None (backward compatible)

Related: #tracking-cancel-fix"
```

---

## 🚀 Deployment Steps

### Option 1: Vercel (Recommended)

#### A. Push to Git

```bash
# Push to main branch (triggers auto-deploy)
git push origin main
```

#### B. Monitor Deployment

1. Go to https://vercel.com/dashboard
2. Check deployment status
3. Wait for build to complete (~2-3 minutes)
4. Verify deployment URL

#### C. Check Deployment Logs

```bash
# If using Vercel CLI
vercel logs
```

### Option 2: Manual Build & Deploy

#### A. Build Locally

```bash
# Install dependencies (if needed)
npm install

# Run type check
npm run type-check

# Build for production
npm run build
```

#### B. Test Build Locally

```bash
# Preview production build
npm run preview
```

#### C. Deploy Build

```bash
# Deploy to Vercel
vercel --prod

# Or deploy to other platform
# (follow your platform's deployment guide)
```

---

## ✅ Pre-Deployment Checklist

### Code Quality

- [x] TypeScript compiles without errors
- [x] No console errors in development
- [x] Code follows project standards
- [x] Changes are backward compatible

### Testing

- [ ] Test admin login
- [ ] Test order status update (all service types)
- [ ] Test cancellation flow
- [ ] Check console logs for debugging info
- [ ] Verify database updates correctly

### Documentation

- [x] Changes documented
- [x] Test plan created
- [x] Debugging guide created
- [x] Commit message is clear

### Database

- [x] Schema changes applied (already done)
- [x] RLS policies verified
- [x] No breaking changes

---

## 🧪 Post-Deployment Testing

### 1. Smoke Test

```bash
# Test the deployed app
curl https://your-app.vercel.app/health
```

### 2. Admin Login Test

1. Go to https://your-app.vercel.app/admin/login
2. Login as superadmin@gobear.app
3. Verify successful login

### 3. Order Status Update Test

1. Navigate to Admin → Orders
2. Find a delivery order with status "pending"
3. Click status dropdown
4. Select "cancelled"
5. **Check browser console** for logs:
   ```
   [Admin API] updateOrderStatus called: {...}
   [Admin API] Current session: {...}
   [Admin API] Updating table: delivery_requests with data: {...}
   [Admin API] Update result: {...}
   ```
6. Verify status updates successfully
7. Check database to confirm:
   - `cancelled_by` = admin's UUID
   - `cancelled_by_role` = 'admin'

### 4. Database Verification

```sql
-- Check the cancelled order
SELECT
  id,
  tracking_id,
  status,
  cancelled_by,
  cancelled_by_role,
  cancelled_at,
  cancel_reason
FROM delivery_requests
WHERE status = 'cancelled'
ORDER BY cancelled_at DESC
LIMIT 5;
```

Expected result:

```
cancelled_by: <admin_uuid>
cancelled_by_role: 'admin'
cancelled_at: <timestamp>
cancel_reason: 'ยกเลิกโดย Admin'
```

---

## 🐛 Rollback Plan

### If Issues Occur

#### Option 1: Revert Commit

```bash
# Revert the last commit
git revert HEAD

# Push revert
git push origin main
```

#### Option 2: Rollback in Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Go to Deployments
4. Find previous working deployment
5. Click "..." → "Promote to Production"

#### Option 3: Manual Fix

If the issue is minor:

1. Fix the code
2. Commit and push
3. Wait for auto-deploy

---

## 📊 Monitoring

### What to Monitor

1. **Error Logs**
   - Check Vercel logs for errors
   - Monitor Sentry (if configured)
   - Check browser console errors

2. **Database**
   - Monitor for failed updates
   - Check RLS policy violations
   - Verify data integrity

3. **User Reports**
   - Admin feedback on order updates
   - Any 404 errors reported
   - Performance issues

### Monitoring Commands

```bash
# Vercel logs (real-time)
vercel logs --follow

# Check recent errors
vercel logs --since 1h

# Check specific deployment
vercel logs <deployment-url>
```

---

## 🔍 Debugging in Production

### If 404 Error Still Occurs

1. **Check Console Logs**
   - Open DevTools in production
   - Look for `[Admin API]` logs
   - Check session information

2. **Verify Session**

   ```javascript
   // In browser console (production)
   const {
     data: { session },
   } = await supabase.auth.getSession();
   console.log("Session:", session);
   ```

3. **Check Auth State**

   ```javascript
   // In browser console (production)
   const {
     data: { user },
   } = await supabase.auth.getUser();
   console.log("User:", user);
   ```

4. **Test Direct Update**
   ```javascript
   // In browser console (production)
   const { data, error } = await supabase
     .from("delivery_requests")
     .update({ status: "in_progress" })
     .eq("id", "<order_id>")
     .select();
   console.log("Result:", { data, error });
   ```

---

## 📝 Environment Variables

### Required Variables

Verify these are set in Vercel:

```bash
VITE_SUPABASE_URL=https://onsflqhkgqhydeupiqyt.supabase.co
VITE_SUPABASE_ANON_KEY=<your_anon_key>
VITE_GOOGLE_MAPS_API_KEY=<your_maps_key>
```

### Check in Vercel

1. Go to Project Settings
2. Click "Environment Variables"
3. Verify all required variables are set
4. Check they're enabled for Production

---

## 🎯 Success Criteria

### Deployment is Successful When:

- ✅ Build completes without errors
- ✅ App loads in production
- ✅ Admin can login
- ✅ Admin can update order status
- ✅ No 404 errors in console
- ✅ Database updates correctly
- ✅ Logs show proper session info
- ✅ All service types work (ride, delivery, shopping, etc.)

---

## 📞 Support

### If You Need Help

1. **Check Logs First**
   - Browser console
   - Vercel deployment logs
   - Database logs

2. **Review Documentation**
   - ADMIN_ORDER_STATUS_UPDATE_FIXED.md
   - ADMIN_ORDER_404_DEBUG.md
   - ADMIN_ORDERS_TEST_PLAN.md

3. **Common Issues**
   - Session expired → Re-login
   - 404 error → Check console logs
   - RLS error → Verify admin role in database

---

## 🚀 Quick Deploy Commands

```bash
# Full deployment workflow
git status
git add src/admin/composables/useAdminAPI.ts ADMIN_*.md
git commit -m "fix(admin): Fix order status update - use UUID for cancelled_by"
git push origin main

# Monitor deployment
vercel logs --follow

# If issues, rollback
git revert HEAD
git push origin main
```

---

**Last Updated**: 2026-01-23  
**Status**: Ready for deployment  
**Estimated Deploy Time**: 2-3 minutes
