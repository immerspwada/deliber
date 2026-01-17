# Admin Topup Requests - Fix Checklist

## Pre-Deployment

- [x] Identified root cause (schema mismatch)
- [x] Created migration file (305_fix_topup_requests_columns.sql)
- [x] Updated composable (useAdminTopupRequests.ts)
- [x] Created verification script (verify-topup-fix.sql)
- [x] Created deployment guide (TOPUP-FIX-DEPLOYMENT.md)
- [x] Created unit tests (admin-topup-requests.unit.test.ts)

## Deployment Steps

### 1. Database Migration

- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy migration 305 content
- [ ] Execute migration
- [ ] Verify no errors

### 2. Verification

- [ ] Run verification queries
- [ ] Check all 5 columns exist
- [ ] Verify data backfilled
- [ ] Test RPC function
- [ ] Check indexes created

### 3. Frontend Testing

- [ ] Navigate to `/admin/topup-requests`
- [ ] Page loads without errors
- [ ] Stats cards display correctly
- [ ] Table shows topup requests
- [ ] Filter by status works
- [ ] Approve button works
- [ ] Reject button works
- [ ] Image modal works
- [ ] Refresh button works
- [ ] No console errors

## Post-Deployment

### Functional Testing

- [ ] Create test topup request (as customer)
- [ ] View in admin panel
- [ ] Approve request
- [ ] Verify wallet balance updated
- [ ] Verify notification sent
- [ ] Create another test request
- [ ] Reject with reason
- [ ] Verify rejection reason shown
- [ ] Verify notification sent

### Performance Testing

- [ ] Page loads in < 2 seconds
- [ ] Table renders smoothly
- [ ] Filter changes are instant
- [ ] No memory leaks
- [ ] No excessive re-renders

### Security Testing

- [ ] Non-admin cannot access page
- [ ] RPC functions check admin role
- [ ] RLS policies enforced
- [ ] No sensitive data exposed
- [ ] Audit log records actions

### Browser Testing

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] Color contrast sufficient

## Rollback Plan

If issues occur:

### Step 1: Identify Issue

- [ ] Check browser console
- [ ] Check Supabase logs
- [ ] Check network requests
- [ ] Check database queries

### Step 2: Quick Fix

- [ ] Try refreshing page
- [ ] Clear browser cache
- [ ] Check admin role
- [ ] Verify migration applied

### Step 3: Rollback (if needed)

- [ ] Run rollback SQL
- [ ] Revert composable changes
- [ ] Clear application cache
- [ ] Notify team

## Monitoring

### First 24 Hours

- [ ] Monitor error logs
- [ ] Check user reports
- [ ] Verify approve/reject actions
- [ ] Monitor wallet transactions
- [ ] Check notification delivery

### First Week

- [ ] Review performance metrics
- [ ] Check for edge cases
- [ ] Gather user feedback
- [ ] Optimize if needed

## Documentation

- [x] TOPUP-FIX-SUMMARY.md
- [x] TOPUP-FIX-DEPLOYMENT.md
- [x] TOPUP-QUICK-FIX.md
- [x] verify-topup-fix.sql
- [x] admin-topup-requests.unit.test.ts
- [ ] Update main README (if needed)
- [ ] Update API documentation (if needed)

## Success Criteria

✅ All checklist items completed
✅ No errors in production
✅ Admin can approve/reject topups
✅ Wallet balances update correctly
✅ Notifications sent properly
✅ Performance acceptable
✅ Security verified
✅ Tests passing

## Notes

- Migration is backward compatible
- Old columns kept for safety
- Can deprecate old columns later
- Monitor for 1 week before cleanup
