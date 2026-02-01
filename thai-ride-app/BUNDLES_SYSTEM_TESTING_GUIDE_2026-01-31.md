# 🧪 Bundles System - Complete Testing Guide

**Date**: 2026-01-31  
**Status**: ✅ Ready for Testing  
**Priority**: 🔥 Critical - Verify Before Production

---

## 📋 Overview

This guide provides step-by-step instructions for testing the complete Bundles System, including both customer and admin interfaces.

---

## ✅ Pre-Testing Verification

### 1. Database Check ✅ VERIFIED

```sql
-- Check bundle_templates table
SELECT COUNT(*) FROM bundle_templates;
-- Expected: 4 templates

-- Check service_bundles table
SELECT COUNT(*) FROM service_bundles;
-- Expected: 0 (no customer bundles yet)

-- Verify RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('bundle_templates', 'service_bundles');
-- Expected: Multiple policies for both tables
```

### 2. RPC Functions Check ✅ VERIFIED

All three RPC functions exist on production:

- ✅ `get_all_bundle_templates_for_admin()`
- ✅ `get_service_bundles_for_admin(p_status, p_limit, p_offset)`
- ✅ `get_service_bundles_stats_for_admin()`

### 3. Routes Check ✅ VERIFIED

- ✅ Customer: `/customer/bundles` → `BundlesView.vue`
- ✅ Admin: `/admin/service-bundles` → `ServiceBundlesView.vue`

---

## 🎯 Customer Interface Testing

### Test 1: Access Bundles Page

**Steps**:

1. Open browser
2. Navigate to `http://localhost:5173/customer/bundles`
3. Login as customer if needed

**Expected Results**:

- ✅ Page loads without errors
- ✅ Shows "Service Bundles" header
- ✅ Shows "แพ็คเกจบริการ" subtitle
- ✅ Loading state appears briefly
- ✅ Bundle cards appear after loading

**Screenshot Location**: Customer bundles main view

---

### Test 2: View Bundle Templates

**Steps**:

1. On bundles page, scroll through available bundles
2. Count the number of bundles displayed

**Expected Results**:

- ✅ Shows 4 bundle templates
- ✅ Each bundle shows:
  - Name (English)
  - Name (Thai)
  - Description
  - Service type badges
  - Discount percentage
  - "เลือกแพ็คเกจนี้" button
- ✅ Popular bundles show "HOT" badge

**Bundle Details to Verify**:

1. **Moving + Laundry Package**
   - Thai: แพ็คเกจขนย้าย + ซักผ้า
   - Services: Moving, Laundry
   - Discount: 20%
   - Popular: Yes

2. **Shopping + Delivery Combo**
   - Thai: แพ็คเกจซื้อของ + ส่งของ
   - Services: Shopping, Delivery
   - Discount: 15%
   - Popular: No

3. **Ride + Queue Bundle**
   - Thai: แพ็คเกจเรียกรถ + จองคิว
   - Services: Ride, Queue
   - Discount: 10%
   - Popular: No

4. **Complete Service Package**
   - Thai: แพ็คเกจบริการครบวงจร
   - Services: Ride, Delivery, Shopping, Queue
   - Discount: 25%
   - Popular: Yes

---

### Test 3: Responsive Design

**Steps**:

1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different screen sizes:
   - Mobile: 375px width
   - Tablet: 768px width
   - Desktop: 1024px width

**Expected Results**:

- ✅ Mobile: 1 column grid
- ✅ Tablet: 2 column grid
- ✅ Desktop: 3 column grid
- ✅ All buttons remain touch-friendly (≥44px)
- ✅ Text remains readable
- ✅ No horizontal scrolling

---

### Test 4: Empty State

**Steps**:

1. Temporarily disable all templates in database:
   ```sql
   UPDATE bundle_templates SET is_active = false;
   ```
2. Refresh bundles page
3. Re-enable templates:
   ```sql
   UPDATE bundle_templates SET is_active = true;
   ```

**Expected Results**:

- ✅ Shows empty state message
- ✅ Message: "ไม่มีแพ็คเกจบริการในขณะนี้"
- ✅ Subtitle: "กรุณาลองใหม่ภายหลัง"
- ✅ No error messages in console

---

## 👑 Admin Interface Testing

### Test 5: Access Admin Bundles Page

**Steps**:

1. Login as admin user
2. Navigate to `http://localhost:5173/admin/service-bundles`

**Expected Results**:

- ✅ Page loads without errors
- ✅ Shows "Service Bundles" header
- ✅ Shows "Manage multi-service packages and templates" subtitle
- ✅ Shows "Create Bundle Template" button
- ✅ Shows statistics dashboard with 4 cards

---

### Test 6: View Statistics Dashboard

**Steps**:

1. On admin bundles page, check statistics cards

**Expected Results**:

- ✅ **Total Bundles**: Shows count (should be 0 initially)
- ✅ **Active Templates**: Shows 4
- ✅ **Customers Using Bundles**: Shows 0
- ✅ **Total Revenue**: Shows ฿0

**Visual Check**:

- ✅ Green icon for Total Bundles
- ✅ Yellow icon for Active Templates
- ✅ Blue icon for Customers
- ✅ Purple icon for Revenue

---

### Test 7: View Templates Tab

**Steps**:

1. Ensure "Bundle Templates" tab is active (default)
2. View template cards

**Expected Results**:

- ✅ Shows 4 template cards in grid
- ✅ Each card shows:
  - Name (English + Thai)
  - Description
  - Service type tags
  - Discount percentage with star icon
  - Status badge (Active/Inactive)
  - Edit button
  - Activate/Deactivate button

---

### Test 8: Create New Bundle Template

**Steps**:

1. Click "Create Bundle Template" button
2. Modal opens
3. Fill in form:
   - Name: "Test Bundle"
   - Name (Thai): "แพ็คเกจทดสอบ"
   - Description: "Test bundle for verification"
   - Description (Thai): "แพ็คเกจสำหรับทดสอบ"
   - Select services: Check "Ride" and "Delivery"
   - Discount: 15
   - Display Order: 5
   - Check "Active"
4. Click "Create Template"

**Expected Results**:

- ✅ Modal opens smoothly
- ✅ Form validation works (requires at least 2 services)
- ✅ Cannot submit with less than 2 services
- ✅ Submit button shows "Saving..." during save
- ✅ Modal closes after successful save
- ✅ New template appears in grid
- ✅ Template count updates to 5
- ✅ No console errors

**Cleanup**:

```sql
DELETE FROM bundle_templates WHERE name = 'Test Bundle';
```

---

### Test 9: Edit Existing Template

**Steps**:

1. Click "Edit" button on any template
2. Modal opens with pre-filled data
3. Change discount percentage to 18
4. Click "Update Template"

**Expected Results**:

- ✅ Modal opens with correct data
- ✅ All fields populated correctly
- ✅ Can modify any field
- ✅ Submit button shows "Saving..." during update
- ✅ Modal closes after successful update
- ✅ Template card shows updated discount (18%)
- ✅ No console errors

---

### Test 10: Toggle Template Status

**Steps**:

1. Find an active template
2. Click "Deactivate" button
3. Wait for update
4. Click "Activate" button

**Expected Results**:

- ✅ Status badge changes from "Active" to "Inactive"
- ✅ Button text changes from "Deactivate" to "Activate"
- ✅ Button color changes (green → red)
- ✅ Template disappears from customer view when inactive
- ✅ Template reappears when reactivated
- ✅ No console errors

---

### Test 11: View Active Bundles Tab

**Steps**:

1. Click "Active Bundles" tab
2. View table

**Expected Results**:

- ✅ Tab switches smoothly
- ✅ Shows table with headers:
  - Bundle ID
  - Customer
  - Services
  - Price
  - Discount
  - Status
  - Progress
  - Created
  - Actions
- ✅ Shows empty table (no customer bundles yet)
- ✅ No console errors

---

### Test 12: View History Tab

**Steps**:

1. Click "History" tab
2. View filters and table

**Expected Results**:

- ✅ Tab switches smoothly
- ✅ Shows search input
- ✅ Shows status filter dropdown
- ✅ Shows empty state message: "No bundles found matching your criteria"
- ✅ No console errors

---

## 🔒 Security Testing

### Test 13: RLS Policy Verification

**Steps**:

1. Logout from admin
2. Try to access `/admin/service-bundles` without login

**Expected Results**:

- ✅ Redirects to login page
- ✅ Cannot access admin interface
- ✅ No data leakage

**Steps**:

1. Login as regular customer
2. Try to access `/admin/service-bundles`

**Expected Results**:

- ✅ Shows "Unauthorized" or redirects
- ✅ Cannot access admin interface

---

### Test 14: API Authorization

**Steps**:

1. Open browser DevTools → Network tab
2. As customer, navigate to `/customer/bundles`
3. Check API calls

**Expected Results**:

- ✅ Can fetch `bundle_templates` (public read)
- ✅ Cannot call admin RPC functions
- ✅ All requests return 200 or proper error codes

---

## 🎨 UI/UX Testing

### Test 15: Loading States

**Steps**:

1. Throttle network in DevTools (Slow 3G)
2. Refresh bundles page
3. Observe loading behavior

**Expected Results**:

- ✅ Shows loading message: "Loading templates..."
- ✅ No flash of empty state
- ✅ Smooth transition to loaded state
- ✅ No layout shift

---

### Test 16: Error Handling

**Steps**:

1. Disconnect internet
2. Refresh bundles page
3. Reconnect internet

**Expected Results**:

- ✅ Shows error message (if implemented)
- ✅ Graceful degradation
- ✅ Can retry after reconnection
- ✅ No app crash

---

### Test 17: Accessibility (A11y)

**Steps**:

1. Use keyboard only (Tab, Enter, Escape)
2. Navigate through bundles page
3. Open and close modal

**Expected Results**:

- ✅ Can tab through all interactive elements
- ✅ Focus visible on all elements
- ✅ Can open modal with Enter
- ✅ Can close modal with Escape
- ✅ Focus returns to trigger button after close
- ✅ All buttons have accessible labels

**Screen Reader Test**:

- ✅ All images have alt text
- ✅ Buttons have descriptive labels
- ✅ Form fields have labels
- ✅ Status messages announced

---

## 📊 Performance Testing

### Test 18: Page Load Performance

**Steps**:

1. Open DevTools → Performance tab
2. Record page load
3. Analyze metrics

**Expected Results**:

- ✅ First Contentful Paint < 1.5s
- ✅ Time to Interactive < 3s
- ✅ No layout shifts (CLS < 0.1)
- ✅ No long tasks (> 50ms)

---

### Test 19: Bundle Size

**Steps**:

1. Build production bundle: `npm run build`
2. Check bundle sizes

**Expected Results**:

- ✅ BundlesView.vue chunk < 50KB
- ✅ ServiceBundlesView.vue chunk < 100KB
- ✅ No duplicate dependencies

---

## 🐛 Bug Testing

### Test 20: Edge Cases

**Test Cases**:

1. **Empty Service Types**:
   - Create template with no services
   - Expected: Validation error

2. **Negative Discount**:
   - Try to set discount to -10
   - Expected: Validation error or clamped to 0

3. **Discount > 100%**:
   - Try to set discount to 150
   - Expected: Validation error or clamped to 100

4. **Very Long Names**:
   - Create template with 500 character name
   - Expected: Truncated or validation error

5. **Special Characters**:
   - Use emoji in template name: "🎁 Special Bundle"
   - Expected: Saves correctly, displays correctly

---

## ✅ Testing Checklist Summary

### Customer Interface

- [ ] Page loads correctly
- [ ] Shows 4 bundle templates
- [ ] Responsive design works
- [ ] Empty state displays
- [ ] Loading state displays
- [ ] All bundles show correct data
- [ ] Popular badges display
- [ ] Service badges display
- [ ] Discount percentages correct

### Admin Interface

- [ ] Page loads correctly
- [ ] Statistics dashboard displays
- [ ] Can create new template
- [ ] Can edit existing template
- [ ] Can toggle template status
- [ ] Active bundles tab works
- [ ] History tab works
- [ ] Modal opens/closes correctly
- [ ] Form validation works
- [ ] All tabs switch smoothly

### Security

- [ ] RLS policies enforced
- [ ] Admin routes protected
- [ ] Customer routes protected
- [ ] No data leakage
- [ ] Proper error messages

### UI/UX

- [ ] Loading states work
- [ ] Error handling works
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Touch targets ≥44px
- [ ] No layout shifts

### Performance

- [ ] Page loads fast
- [ ] No performance issues
- [ ] Bundle sizes acceptable
- [ ] No memory leaks

---

## 🚀 Post-Testing Actions

### If All Tests Pass ✅

1. **Document Results**:
   - Create test report
   - Note any minor issues
   - Document workarounds

2. **Deploy to Staging**:
   - Test on staging environment
   - Verify with real data
   - Get stakeholder approval

3. **Deploy to Production**:
   - Schedule deployment
   - Monitor for errors
   - Be ready to rollback

### If Tests Fail ❌

1. **Document Failures**:
   - List all failing tests
   - Capture screenshots
   - Note error messages

2. **Fix Issues**:
   - Prioritize critical bugs
   - Fix and retest
   - Update documentation

3. **Retest**:
   - Run full test suite again
   - Verify fixes work
   - Check for regressions

---

## 📝 Test Report Template

```markdown
# Bundles System Test Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Local/Staging/Production]

## Summary

- Total Tests: 20
- Passed: [X]
- Failed: [Y]
- Skipped: [Z]

## Failed Tests

1. [Test Name]
   - Issue: [Description]
   - Steps to Reproduce: [Steps]
   - Expected: [Expected Result]
   - Actual: [Actual Result]
   - Screenshot: [Link]

## Notes

[Any additional observations]

## Recommendation

[ ] Ready for Production
[ ] Needs Fixes
[ ] Needs More Testing
```

---

## 🎯 Success Criteria

The Bundles System is ready for production when:

- ✅ All 20 tests pass
- ✅ No critical bugs found
- ✅ Performance metrics met
- ✅ Security verified
- ✅ Accessibility compliant
- ✅ Stakeholder approval received

---

**Status**: 📋 Ready for Testing  
**Next Action**: Begin systematic testing following this guide  
**Estimated Time**: 2-3 hours for complete testing

---

**Last Updated**: 2026-01-31  
**Maintained By**: QA Team
