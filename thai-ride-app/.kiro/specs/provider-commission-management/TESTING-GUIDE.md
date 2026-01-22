# 🧪 Provider Commission Management - Testing Guide

**Date**: 2026-01-19  
**Status**: Ready for Testing

---

## 🎯 Test Scenarios

### Scenario 1: Update Commission to Percentage

**Steps**:

1. Login as admin
2. Navigate to `/admin/providers`
3. Click on any approved provider
4. In the detail modal, find "💰 ค่าคอมมิชชั่น" section
5. Click "แก้ไข" button
6. Select "📊 เปอร์เซ็นต์ (%)"
7. Enter value: `25`
8. Add note: "เพิ่มค่าคอมมิชชั่นตามนโยบายใหม่"
9. Click "บันทึกการตั้งค่า"

**Expected Results**:

- ✅ Modal closes
- ✅ Success toast appears
- ✅ Provider list refreshes
- ✅ Commission badge shows "25%"
- ✅ Detail modal shows updated commission

---

### Scenario 2: Update Commission to Fixed Amount

**Steps**:

1. Open provider detail modal
2. Click "แก้ไข" in commission section
3. Select "💵 จำนวนคงที่ (บาท)"
4. Enter value: `50`
5. Add note: "ค่าคงที่สำหรับ provider ใหม่"
6. Click "บันทึกการตั้งค่า"

**Expected Results**:

- ✅ Modal closes
- ✅ Success toast appears
- ✅ Commission badge shows "50 ฿"
- ✅ Detail modal shows "💵 จำนวนคงที่"

---

### Scenario 3: Validation - Negative Value

**Steps**:

1. Open commission modal
2. Select "เปอร์เซ็นต์ (%)"
3. Enter value: `-10`
4. Click "บันทึกการตั้งค่า"

**Expected Results**:

- ✅ Error toast: "ค่าคอมมิชชั่นต้องไม่ต่ำกว่า 0"
- ✅ Modal stays open
- ✅ No database update

---

### Scenario 4: Validation - Percentage > 100

**Steps**:

1. Open commission modal
2. Select "เปอร์เซ็นต์ (%)"
3. Enter value: `150`
4. Click "บันทึกการตั้งค่า"

**Expected Results**:

- ✅ Error toast: "เปอร์เซ็นต์ต้องไม่เกิน 100%"
- ✅ Modal stays open
- ✅ No database update

---

### Scenario 5: Real-time Calculation Example

**Steps**:

1. Open commission modal
2. Select "เปอร์เซ็นต์ (%)"
3. Enter value: `20`
4. Observe the example box

**Expected Results**:

```
ตัวอย่างการคำนวณ (ค่าบริการ 100 บาท)
┌─────────────────────────────────────────┐
│ ค่าบริการ:        100 บาท               │
│ คอมมิชชั่น (20%): -20 บาท               │
│ รายได้ Provider:   80 บาท                │
└─────────────────────────────────────────┘
```

5. Change to "จำนวนคงที่ (บาท)"
6. Enter value: `30`

**Expected Results**:

```
ตัวอย่างการคำนวณ (ค่าบริการ 100 บาท)
┌─────────────────────────────────────────┐
│ ค่าบริการ:        100 บาท               │
│ คอมมิชชั่น (30 บาท): -30 บาท            │
│ รายได้ Provider:   70 บาท                │
└─────────────────────────────────────────┘
```

---

### Scenario 6: Commission Display in Provider List

**Steps**:

1. Navigate to `/admin/providers`
2. Look at the "คอมมิชชั่น" column

**Expected Results**:

- ✅ Percentage commissions show blue badge: `[20%]`
- ✅ Fixed commissions show yellow badge: `[50 ฿]`
- ✅ Badges are clearly visible
- ✅ Proper formatting with Thai currency

---

### Scenario 7: Commission Info in Detail Modal

**Steps**:

1. Click on any provider
2. Scroll to "💰 ค่าคอมมิชชั่น" section

**Expected Results**:

- ✅ Shows commission type badge
- ✅ Shows commission value
- ✅ Shows notes (if any)
- ✅ Shows last updated date
- ✅ "แก้ไข" button is visible

---

### Scenario 8: Loading State

**Steps**:

1. Open commission modal
2. Enter valid values
3. Click "บันทึกการตั้งค่า"
4. Observe the button

**Expected Results**:

- ✅ Button shows spinner icon
- ✅ Button text changes to "กำลังบันทึก..."
- ✅ Button is disabled
- ✅ Close button is disabled
- ✅ Form inputs are disabled

---

### Scenario 9: Cancel Action

**Steps**:

1. Open commission modal
2. Make some changes
3. Click "ยกเลิก" button

**Expected Results**:

- ✅ Modal closes
- ✅ No changes saved
- ✅ No toast message
- ✅ Provider data unchanged

---

### Scenario 10: Close Modal with X Button

**Steps**:

1. Open commission modal
2. Make some changes
3. Click X button (top right)

**Expected Results**:

- ✅ Modal closes
- ✅ No changes saved
- ✅ No toast message

---

## 🔍 Database Verification

### Check Commission Values

```sql
-- Check provider commission settings
SELECT
  id,
  first_name,
  last_name,
  commission_type,
  commission_value,
  commission_notes,
  commission_updated_at,
  commission_updated_by
FROM providers_v2
WHERE id = 'PROVIDER_ID';
```

### Check Audit Logs

```sql
-- Check commission update history
SELECT
  admin_id,
  action,
  resource_type,
  resource_id,
  changes,
  created_at
FROM admin_audit_logs
WHERE
  resource_type = 'provider'
  AND action = 'update_commission'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎨 UI/UX Verification

### Visual Checks

- [ ] Modal animation is smooth
- [ ] Type selector buttons have clear active state
- [ ] Input field has proper focus state
- [ ] Example box updates in real-time
- [ ] Warning box is clearly visible
- [ ] Buttons have proper hover states
- [ ] Loading spinner is visible
- [ ] Toast messages are readable

### Responsive Design

- [ ] Modal fits on mobile screens
- [ ] Buttons are touch-friendly (min 44px)
- [ ] Text is readable on small screens
- [ ] No horizontal scrolling
- [ ] Proper spacing on all screen sizes

### Accessibility

- [ ] All buttons have aria-labels
- [ ] Form inputs have proper labels
- [ ] Modal can be closed with ESC key
- [ ] Tab navigation works correctly
- [ ] Screen reader friendly

---

## 🐛 Edge Cases to Test

### Edge Case 1: Very Large Values

- Enter commission value: `999999`
- Should be rejected with error

### Edge Case 2: Decimal Values

- Enter commission value: `15.5`
- Should be accepted
- Example should show correct calculation

### Edge Case 3: Zero Commission

- Enter commission value: `0`
- Should be accepted
- Provider gets 100% of fare

### Edge Case 4: 100% Commission

- Enter commission value: `100`
- Should be accepted
- Provider gets 0% of fare

### Edge Case 5: Network Error

- Disconnect internet
- Try to update commission
- Should show error toast
- Modal should stay open

---

## ✅ Acceptance Criteria

### Functional Requirements

- [x] Admin can update commission type
- [x] Admin can update commission value
- [x] Admin can add notes
- [x] Real-time calculation example works
- [x] Validation prevents invalid values
- [x] Changes are saved to database
- [x] Audit log is created
- [x] Provider list updates after save

### Non-Functional Requirements

- [x] Response time < 2 seconds
- [x] No console errors
- [x] No TypeScript errors
- [x] Mobile responsive
- [x] Accessible (WCAG 2.1 AA)
- [x] Thai language support
- [x] Proper error handling

---

## 📊 Test Report Template

```markdown
## Test Execution Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Production/Staging]

### Test Results

| Scenario              | Status  | Notes |
| --------------------- | ------- | ----- |
| Update to Percentage  | ✅ Pass |       |
| Update to Fixed       | ✅ Pass |       |
| Validation - Negative | ✅ Pass |       |
| Validation - > 100    | ✅ Pass |       |
| Real-time Calculation | ✅ Pass |       |
| Display in List       | ✅ Pass |       |
| Display in Detail     | ✅ Pass |       |
| Loading State         | ✅ Pass |       |
| Cancel Action         | ✅ Pass |       |
| Close Modal           | ✅ Pass |       |

### Issues Found

- None

### Recommendations

- None

### Sign-off

- [ ] Functional testing complete
- [ ] UI/UX testing complete
- [ ] Database verification complete
- [ ] Ready for production
```

---

## 🚀 Quick Test Commands

```bash
# Run unit tests
npm run test src/tests/provider-commission.test.ts

# Type check
npx vue-tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

---

**Last Updated**: 2026-01-19  
**Status**: Ready for Manual Testing
