# 🧪 Moving Service Test Guide

**Date**: 2026-01-31  
**Feature**: Moving Service (`/customer/moving`)  
**Status**: Ready for Testing

---

## 🎯 Quick Test Checklist

### **Pre-Test Setup**

1. **Start Development Server**:

   ```bash
   npm run dev
   ```

2. **Login as Customer**:
   - Navigate to `http://localhost:5173/login`
   - Login with customer account
   - Ensure wallet has sufficient balance (≥ ฿150)

3. **Navigate to Moving Service**:
   - Go to `http://localhost:5173/customer/moving`
   - Or click "ขนย้าย" from services menu

---

## 📱 Test Scenarios

### **Scenario 1: Complete Happy Path** ✅

**Steps**:

1. **Step 1 - Pickup**:
   - Click "ตำแหน่งปัจจุบัน" button
   - Wait for location to load
   - Verify location displays correctly
   - Click "ไปเลือกจุดส่ง"

2. **Step 2 - Destination**:
   - Click "บ้าน" or "ที่ทำงาน" (if available)
   - Or click "เลือกจากแผนที่"
   - Verify destination displays correctly
   - Click "ไปกรอกรายละเอียด"

3. **Step 3 - Details**:
   - Select service type (Small/Medium/Large)
   - Adjust helper count (try +/- buttons)
   - Verify price updates correctly
   - Add item description (optional)
   - Add special instructions (optional)
   - Click "ดูสรุปและยืนยัน"

4. **Step 4 - Confirm**:
   - Verify route summary is correct
   - Verify service info is correct
   - Verify price breakdown is correct
   - Check wallet balance display
   - Click "ยืนยันและเรียกไรเดอร์"

5. **Result**:
   - Should redirect to `/tracking/{tracking_id}`
   - Verify tracking page loads
   - Verify moving request details display

**Expected Results**:

- ✅ All steps complete without errors
- ✅ Wallet balance deducted correctly
- ✅ Moving request created in database
- ✅ Tracking page shows correct information

---

### **Scenario 2: Insufficient Balance** ⚠️

**Steps**:

1. Complete Steps 1-3 normally
2. At Step 4 (Confirm):
   - Verify wallet balance is less than total price
   - Verify warning message displays
   - Verify "เติมเงิน" button appears
   - Verify confirm button is disabled

**Expected Results**:

- ✅ Warning message: "ยอดเงินไม่เพียงพอ"
- ✅ Confirm button is disabled
- ✅ Top-up link works

---

### **Scenario 3: Exit Confirmation** 🚪

**Steps**:

1. Start filling out form (enter pickup location)
2. Click home button (top right)
3. Verify exit confirmation dialog appears
4. Click "ยกเลิก" - should stay on page
5. Click home button again
6. Click "ออก" - should navigate to customer home

**Expected Results**:

- ✅ Exit confirmation shows when data entered
- ✅ "ยกเลิก" keeps user on page
- ✅ "ออก" navigates away

---

### **Scenario 4: Swipe Gestures** 👆

**Steps** (on mobile or touch device):

1. At Step 1, swipe left → should do nothing (can't go forward without selection)
2. Select pickup location
3. Swipe left → should go to Step 2
4. Swipe right → should go back to Step 1
5. Continue through all steps testing swipe navigation

**Expected Results**:

- ✅ Swipe left advances to next step (if valid)
- ✅ Swipe right goes back to previous step
- ✅ Swipe indicator shows during gesture
- ✅ Haptic feedback triggers (on supported devices)

---

### **Scenario 5: Price Calculations** 💰

**Test Cases**:

| Service Type | Helpers | Expected Price | Calculation |
| ------------ | ------- | -------------- | ----------- |
| Small        | 1       | ฿150           | 150 + 0     |
| Small        | 2       | ฿250           | 150 + 100   |
| Medium       | 1       | ฿350           | 350 + 0     |
| Medium       | 3       | ฿550           | 350 + 200   |
| Large        | 1       | ฿1,500         | 1500 + 0    |
| Large        | 5       | ฿1,900         | 1500 + 400  |

**Steps**:

1. For each test case:
   - Select service type
   - Set helper count
   - Verify price at Step 3
   - Verify price at Step 4 (confirm)

**Expected Results**:

- ✅ All prices calculate correctly
- ✅ Helper fee shows: "฿100/คน (คนแรกฟรี)"
- ✅ Price breakdown at Step 4 is accurate

---

### **Scenario 6: Map Picker** 🗺️

**Steps**:

1. At Step 1, click "เลือกจากแผนที่"
2. Verify map modal opens
3. Move map to select location
4. Click confirm
5. Verify location displays correctly
6. Repeat for Step 2 (destination)

**Expected Results**:

- ✅ Map picker opens correctly
- ✅ Location selection works
- ✅ Confirm updates location
- ✅ Cancel closes modal without changes

---

### **Scenario 7: Saved Places** ⭐

**Steps**:

1. At Step 1:
   - Verify "บ้าน" button shows (if home place saved)
   - Verify "ที่ทำงาน" button shows (if work place saved)
   - Click saved place button
   - Verify location sets correctly

2. At Step 2:
   - Verify favorite places list shows
   - Verify recent places list shows
   - Click a saved place
   - Verify location sets correctly

**Expected Results**:

- ✅ Saved places load correctly
- ✅ Clicking saved place sets location
- ✅ Recent places show previous destinations

---

### **Scenario 8: Validation** ✋

**Test Cases**:

1. **Try to continue without pickup**:
   - At Step 1, click continue without selecting location
   - Should show validation hint

2. **Try to continue without destination**:
   - At Step 2, click continue without selecting location
   - Should show validation hint

3. **Try to submit without required data**:
   - Skip to Step 4 (if possible)
   - Try to submit
   - Should show validation error

**Expected Results**:

- ✅ Validation hints display correctly
- ✅ Continue buttons disabled when invalid
- ✅ Error messages are clear and helpful

---

### **Scenario 9: Loading States** ⏳

**Steps**:

1. Click "ตำแหน่งปัจจุบัน"
   - Verify loading spinner shows
   - Verify button is disabled during load

2. At Step 4, click "ยืนยันและเรียกไรเดอร์"
   - Verify button shows loading state
   - Verify button text changes to "กำลังสร้างคำสั่ง..."
   - Verify button is disabled during submission

**Expected Results**:

- ✅ Loading states display correctly
- ✅ Buttons disabled during operations
- ✅ User cannot double-submit

---

### **Scenario 10: Error Handling** ❌

**Test Cases**:

1. **Network Error**:
   - Disconnect internet
   - Try to submit form
   - Verify error message displays

2. **Invalid Location**:
   - Try to select location outside service area (if applicable)
   - Verify error handling

**Expected Results**:

- ✅ Error messages display clearly
- ✅ User can retry after error
- ✅ Form data is preserved after error

---

## 🎨 Visual/UX Checks

### **Design System Compliance**

- [ ] Colors match minimal theme (white-black-gray)
- [ ] Typography is consistent
- [ ] Spacing is consistent with other views
- [ ] Buttons have proper hover/active states
- [ ] Cards have proper shadows and borders
- [ ] Icons are clear and recognizable

### **Responsive Design**

- [ ] Works on mobile (< 640px)
- [ ] Works on tablet (640px - 1024px)
- [ ] Works on desktop (> 1024px)
- [ ] Touch targets are ≥ 44px
- [ ] Text is readable at all sizes

### **Animations**

- [ ] Step transitions are smooth
- [ ] Swipe gestures feel natural
- [ ] Loading states animate correctly
- [ ] Modal transitions are smooth
- [ ] Success states animate nicely

---

## 🔍 Technical Checks

### **Console Errors**

Open browser console and check for:

- [ ] No JavaScript errors
- [ ] No TypeScript errors
- [ ] No Vue warnings
- [ ] No network errors (except expected ones)

### **Network Requests**

Check Network tab for:

- [ ] Wallet balance fetch on mount
- [ ] Saved places fetch on mount
- [ ] Recent places fetch on mount
- [ ] Moving request creation on submit
- [ ] Proper error handling for failed requests

### **Database Verification**

After creating a moving request:

```sql
-- Check moving_requests table
SELECT * FROM moving_requests
WHERE user_id = '{your_user_id}'
ORDER BY created_at DESC
LIMIT 1;

-- Verify wallet transaction
SELECT * FROM wallet_transactions
WHERE user_id = '{your_user_id}'
AND type = 'deduct'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**:

- ✅ Moving request created with correct data
- ✅ Wallet transaction recorded
- ✅ Balance deducted correctly

---

## 📊 Performance Checks

### **Load Time**

- [ ] Initial page load < 2s
- [ ] Step transitions < 300ms
- [ ] Map picker opens < 500ms
- [ ] Form submission < 3s

### **Memory Usage**

- [ ] No memory leaks on navigation
- [ ] No excessive re-renders
- [ ] Proper cleanup on unmount

---

## ♿ Accessibility Checks

### **Keyboard Navigation**

- [ ] Can tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Can submit form with Enter key
- [ ] Can close modals with Escape key

### **Screen Reader**

- [ ] All buttons have accessible labels
- [ ] Form fields have proper labels
- [ ] Error messages are announced
- [ ] Success messages are announced

### **Color Contrast**

- [ ] Text has sufficient contrast (WCAG AA)
- [ ] Interactive elements are distinguishable
- [ ] Error states are clear

---

## 🐛 Known Issues / Edge Cases

### **To Test**:

1. **Rapid clicking**:
   - Try clicking buttons rapidly
   - Verify no duplicate submissions

2. **Back button**:
   - Use browser back button
   - Verify proper navigation

3. **Refresh during flow**:
   - Refresh page mid-flow
   - Verify data is lost (expected)

4. **Multiple tabs**:
   - Open moving service in multiple tabs
   - Verify wallet balance syncs

---

## ✅ Sign-Off Checklist

Before marking as production-ready:

- [ ] All happy path scenarios pass
- [ ] All error scenarios handled correctly
- [ ] All validation works as expected
- [ ] All price calculations are accurate
- [ ] Design matches specifications
- [ ] Responsive on all devices
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Accessibility requirements met
- [ ] Performance targets met
- [ ] Database integration works
- [ ] Wallet integration works
- [ ] Tracking page integration works

---

## 🚀 Production Deployment

Once all tests pass:

1. **Commit changes**:

   ```bash
   git add src/views/MovingView.vue src/router/index.ts
   git commit -m "feat: implement moving service feature"
   ```

2. **Deploy to production**:

   ```bash
   npm run build
   # Deploy to Vercel/hosting platform
   ```

3. **Monitor**:
   - Check error logs
   - Monitor user feedback
   - Track completion rates

---

## 📞 Support

**Issues?** Check:

- Console for errors
- Network tab for failed requests
- Database for data integrity
- Wallet balance for deductions

**Questions?** Refer to:

- `MOVING_SERVICE_COMPLETE_2026-01-31.md` - Implementation details
- `src/composables/useMoving.ts` - Business logic
- `src/views/DeliveryView.vue` - Reference implementation

---

**Test Status**: ⏳ Pending Manual Testing  
**Last Updated**: 2026-01-31  
**Tester**: ******\_******  
**Date Tested**: ******\_******

---

_"Test thoroughly, deploy confidently."_
