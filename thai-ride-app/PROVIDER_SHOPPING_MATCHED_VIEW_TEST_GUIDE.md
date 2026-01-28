# 🧪 Provider Shopping Order - Matched View Testing Guide

**Date**: 2026-01-27  
**Component**: JobMatchedViewClean.vue  
**Status**: Ready for Testing

---

## 🎯 What to Test

Testing the shopping order display when provider accepts a shopping order and views the job detail.

---

## 📋 Test Scenarios

### Scenario 1: Accept Shopping Order

**Steps:**

1. Login as Provider
2. Go to `/provider/orders`
3. Find a shopping order (status = `pending`)
4. Click "รับงาน" button
5. Verify navigation to `/provider/job/{id}`

**Expected Results:**

- ✅ Status changes to `matched`
- ✅ `matched_at` timestamp is set
- ✅ Navigate to job detail page
- ✅ Page loads without errors

---

### Scenario 2: View Shopping Order Details

**Steps:**

1. After accepting shopping order (Scenario 1)
2. Observe the job detail page

**Expected Results:**

#### Header

- ✅ Shows "กำลังไปซื้อของ" (not "กำลังไปรับลูกค้า")
- ✅ Back button works

#### Fare Card

- ✅ Shows "รายได้ที่คุณจะได้รับ"
- ✅ Displays correct fare amount

#### Customer Card

- ✅ Shows customer name
- ✅ Shows customer phone
- ✅ "โทร" button works
- ✅ "แชท" button works

#### Store Location (🏪)

- ✅ Shows store emoji 🏪 with warm background color
- ✅ Shows "ร้านค้า" label
- ✅ Shows store name or pickup address
- ✅ "เปิดแผนที่นำทาง" button works

#### Items List (📦)

- ✅ Shows items icon 📦
- ✅ Shows "รายการสินค้า (X รายการ)" header
- ✅ Lists all items with names
- ✅ Shows quantities (x1, x2, etc.)
- ✅ Items display in gray boxes

#### Delivery Address (🏠)

- ✅ Shows home icon
- ✅ Shows "ที่อยู่จัดส่ง" label
- ✅ Shows delivery address
- ✅ Slightly faded appearance (opacity: 0.6)

#### Budget Display (💵)

- ✅ Shows money emoji 💵
- ✅ Shows "งบประมาณ" label
- ✅ Shows budget amount
- ✅ Green background color
- ✅ Only shows if budget_limit exists

#### Notes (if any)

- ✅ Shows notes icon
- ✅ Shows "หมายเหตุจากลูกค้า" header
- ✅ Shows notes content

#### Action Buttons

- ✅ "ยกเลิก" button on left
- ✅ "เริ่มซื้อของ" button on right (not "ถึงจุดรับแล้ว")
- ✅ Buttons are touch-friendly (min 52px height)
- ✅ Loading state shows spinner

---

### Scenario 3: Start Shopping

**Steps:**

1. On shopping order matched view
2. Click "เริ่มซื้อของ" button

**Expected Results:**

- ✅ Button shows loading spinner
- ✅ Status updates to `shopping`
- ✅ Navigate to shopping view (or show appropriate UI)
- ✅ No errors in console

---

### Scenario 4: Cancel Order

**Steps:**

1. On shopping order matched view
2. Click "ยกเลิก" button

**Expected Results:**

- ✅ Shows cancellation confirmation
- ✅ Order is cancelled
- ✅ Navigate back to orders list
- ✅ No errors in console

---

## 🎨 Visual Checks

### Design System Compliance

- [ ] All text is readable (good contrast)
- [ ] Touch targets are ≥ 44px
- [ ] Spacing is consistent (16px, 12px, 8px)
- [ ] Border radius is consistent (8px)
- [ ] Colors match design system:
  - Black: #000000
  - White: #FFFFFF
  - Gray: #F5F5F5, #E5E5E5, #666666
  - Store background: #FFF3E0
  - Budget background: #E8F5E9

### Mobile Responsiveness

- [ ] Works on iPhone SE (375px)
- [ ] Works on iPhone 14 Pro (393px)
- [ ] Works on Android (360px)
- [ ] Safe area insets respected
- [ ] No horizontal scroll

### Animations

- [ ] Buttons have active state (scale 0.95-0.98)
- [ ] Transitions are smooth (0.2s)
- [ ] Loading spinner animates correctly

---

## 🐛 Edge Cases to Test

### Empty/Missing Data

1. **No Items**
   - Items list should not show if empty
   - No errors in console

2. **No Budget**
   - Budget card should not show
   - No errors in console

3. **No Notes**
   - Notes card should not show
   - No errors in console

4. **No Store Name**
   - Should fallback to pickup_address
   - No errors in console

### Data Format Issues

1. **Items as JSON String**
   - Should parse correctly
   - Should handle parse errors gracefully

2. **Items as Array**
   - Should display correctly
   - No errors in console

3. **Invalid Item Structure**
   - Should handle missing name/quantity
   - No errors in console

---

## 📱 Device Testing

### iOS

- [ ] iPhone SE (2nd gen) - iOS 15+
- [ ] iPhone 14 Pro - iOS 17+
- [ ] Safari browser

### Android

- [ ] Samsung Galaxy S21 - Android 12+
- [ ] Google Pixel 6 - Android 13+
- [ ] Chrome browser

---

## 🔍 Console Checks

**Should NOT see:**

- ❌ TypeScript errors
- ❌ Vue warnings
- ❌ Network errors (except expected)
- ❌ Undefined variable errors

**Should see:**

- ✅ Clean console (or only expected logs)

---

## ✅ Acceptance Criteria

All of these must pass:

1. ✅ Shopping order displays correctly with all sections
2. ✅ Store location shows with 🏪 emoji
3. ✅ Items list displays all items with quantities
4. ✅ Delivery address shows correctly
5. ✅ Budget displays if available
6. ✅ Button text is "เริ่มซื้อของ" (not ride text)
7. ✅ Header text is "กำลังไปซื้อของ"
8. ✅ All buttons work correctly
9. ✅ No TypeScript errors
10. ✅ No console errors
11. ✅ Mobile responsive
12. ✅ Touch-friendly (≥ 44px targets)

---

## 🚀 Next Steps After Testing

If all tests pass:

1. Mark Phase 1 as complete ✅
2. Begin Phase 2: Shopping view (status = `shopping`)
3. Begin Phase 3: Delivering view (status = `delivering`)

If tests fail:

1. Document the issue
2. Fix the bug
3. Re-test
4. Update documentation

---

## 📝 Test Results Template

```markdown
## Test Results - [Date]

**Tester**: [Name]
**Device**: [Device/Browser]
**Build**: [Version]

### Scenario 1: Accept Shopping Order

- [ ] Pass / [ ] Fail
- Notes:

### Scenario 2: View Shopping Order Details

- [ ] Pass / [ ] Fail
- Notes:

### Scenario 3: Start Shopping

- [ ] Pass / [ ] Fail
- Notes:

### Scenario 4: Cancel Order

- [ ] Pass / [ ] Fail
- Notes:

### Visual Checks

- [ ] Pass / [ ] Fail
- Notes:

### Edge Cases

- [ ] Pass / [ ] Fail
- Notes:

### Overall Result

- [ ] All tests passed ✅
- [ ] Some tests failed ❌

### Issues Found

1.
2.
3.

### Screenshots

[Attach screenshots here]
```

---

**Created**: 2026-01-27 09:30:00  
**Ready for QA**: Yes ✅
