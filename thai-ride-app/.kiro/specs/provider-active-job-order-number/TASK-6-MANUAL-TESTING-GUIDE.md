# Task 6: Manual Testing Guide

## Overview

This document provides a comprehensive manual testing checklist for the Provider Active Job Order Number feature across different devices and browsers.

## Testing Environment Setup

### Prerequisites

- Access to the application in development/staging environment
- Test provider account with active jobs
- Multiple devices/browsers for testing

### Test Data

- Provider account with active job
- Sample order ID: `550e8400-e29b-41d4-a716-446655440000`
- Expected display: `#550E8400`

---

## 6.1 iOS Safari Testing

### Device Requirements

- iPhone (iOS 15.4+)
- Safari browser

### Test Cases

#### Display Test

- [ ] Navigate to Provider Home
- [ ] Verify active job card is visible
- [ ] Verify order number badge displays `#XXXXXXXX` format
- [ ] Verify order number is clearly visible and readable
- [ ] Verify monospace font renders correctly

#### Copy Functionality

- [ ] Tap on order number badge
- [ ] Verify green background appears (copied state)
- [ ] Verify pulse animation plays
- [ ] Verify toast notification appears: "คัดลอกหมายเลขออเดอร์แล้ว"
- [ ] Open Notes app and paste - verify full UUID is copied

#### Touch Target

- [ ] Measure touch target size (should be ≥ 44x44px)
- [ ] Verify badge is easy to tap without mis-taps
- [ ] Test with different finger sizes

#### Layout

- [ ] Verify badge fits between status and fare
- [ ] Verify no text overflow or truncation
- [ ] Verify responsive layout on different iPhone models
- [ ] Test in portrait and landscape orientations

### Expected Results

✅ All tests pass
✅ No layout issues
✅ Copy works reliably
✅ Touch target is adequate

---

## 6.2 Android Chrome Testing

### Device Requirements

- Android device (Android 10+)
- Chrome browser

### Test Cases

#### Display Test

- [ ] Navigate to Provider Home
- [ ] Verify active job card is visible
- [ ] Verify order number badge displays correctly
- [ ] Verify colors match design (gray background, dark text)

#### Copy Functionality

- [ ] Tap on order number badge
- [ ] Verify visual feedback (green background)
- [ ] Verify toast notification appears
- [ ] Open any text app and paste - verify UUID is copied
- [ ] Test multiple copy operations in succession

#### Touch Target

- [ ] Verify badge is easy to tap
- [ ] Test with different screen sizes
- [ ] Verify no accidental taps on nearby elements

#### Layout

- [ ] Test on different Android screen sizes
- [ ] Verify responsive behavior
- [ ] Check for any rendering issues

### Expected Results

✅ All tests pass
✅ Copy works reliably
✅ No layout issues
✅ Touch target is adequate

---

## 6.3 Desktop Chrome Testing

### Requirements

- Chrome browser (latest version)
- Desktop/laptop computer

### Test Cases

#### Display Test

- [ ] Navigate to Provider Home
- [ ] Verify order number badge displays
- [ ] Verify font size is appropriate for desktop (14px)
- [ ] Verify padding is correct (6px 12px)

#### Copy Functionality

- [ ] Click on order number badge
- [ ] Verify copied state animation
- [ ] Verify toast notification
- [ ] Paste in text editor - verify full UUID

#### Hover States

- [ ] Hover over order number badge
- [ ] Verify background color changes to #E5E7EB
- [ ] Verify copy icon opacity increases to 1
- [ ] Verify smooth transition

#### Keyboard Navigation

- [ ] Tab to order number badge
- [ ] Verify focus indicator appears (2px blue outline)
- [ ] Press Enter key - verify copy works
- [ ] Tab away and back, press Space key - verify copy works
- [ ] Verify no page scroll on Space key

### Expected Results

✅ All tests pass
✅ Hover states work correctly
✅ Keyboard navigation works
✅ Copy works reliably

---

## 6.4 Desktop Firefox Testing

### Requirements

- Firefox browser (latest version)
- Desktop/laptop computer

### Test Cases

#### Display Test

- [ ] Navigate to Provider Home
- [ ] Verify order number badge renders correctly
- [ ] Verify fonts and colors match design

#### Copy Functionality

- [ ] Click on order number badge
- [ ] Verify copy works (test clipboard API)
- [ ] If clipboard API fails, verify fallback method works
- [ ] Verify toast notification appears

#### Fallback Copy Method

- [ ] Test in private browsing mode (may restrict clipboard)
- [ ] Verify fallback copy method (document.execCommand) works
- [ ] Verify user experience is smooth

#### Keyboard Navigation

- [ ] Test Tab, Enter, Space keys
- [ ] Verify focus indicator
- [ ] Verify keyboard shortcuts work

### Expected Results

✅ All tests pass
✅ Copy works (with fallback if needed)
✅ No compatibility issues

---

## 6.5 Desktop Safari Testing

### Requirements

- Safari browser (latest version)
- macOS computer

### Test Cases

#### Display Test

- [ ] Navigate to Provider Home
- [ ] Verify order number badge displays
- [ ] Verify rendering is correct

#### Copy Functionality

- [ ] Click on order number badge
- [ ] Verify copy works
- [ ] Verify toast notification
- [ ] Paste in text editor - verify UUID

#### Compatibility

- [ ] Verify CSS animations work
- [ ] Verify :focus-visible works (or falls back to :focus)
- [ ] Verify no console errors

### Expected Results

✅ All tests pass
✅ Copy works reliably
✅ No compatibility issues

---

## Performance Testing

### Metrics to Check

#### Rendering Performance

- [ ] Order number badge renders without delay
- [ ] No layout shift when badge appears
- [ ] Animations are smooth (60fps)

#### Copy Performance

- [ ] Copy operation completes in < 100ms
- [ ] Toast appears immediately
- [ ] No UI freezing or lag

#### Memory Usage

- [ ] No memory leaks after multiple copy operations
- [ ] Component cleanup works correctly

---

## Accessibility Testing

### Screen Reader Testing

#### VoiceOver (iOS/macOS)

- [ ] Enable VoiceOver
- [ ] Navigate to order number badge
- [ ] Verify announcement: "หมายเลขออเดอร์ #XXXXXXXX แตะเพื่อคัดลอก"
- [ ] Activate badge
- [ ] Verify announcement: "คัดลอกหมายเลขออเดอร์แล้ว"

#### TalkBack (Android)

- [ ] Enable TalkBack
- [ ] Navigate to order number badge
- [ ] Verify proper announcement
- [ ] Activate badge
- [ ] Verify success announcement

#### NVDA (Windows)

- [ ] Enable NVDA
- [ ] Navigate to order number badge
- [ ] Verify proper announcement
- [ ] Test keyboard activation

### Keyboard Navigation

- [ ] Tab through page - verify order number badge is reachable
- [ ] Verify focus indicator is visible
- [ ] Verify Enter and Space keys work
- [ ] Verify no keyboard traps

---

## Bug Reporting Template

If issues are found, use this template:

```markdown
### Bug Report

**Title:** [Brief description]

**Environment:**

- Device: [iPhone 13, Samsung Galaxy S21, etc.]
- OS: [iOS 16.2, Android 12, etc.]
- Browser: [Safari, Chrome, Firefox]
- App Version: [1.0.0]

**Steps to Reproduce:**

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots/Video:**
[Attach if available]

**Severity:**

- [ ] Critical (feature doesn't work)
- [ ] High (major usability issue)
- [ ] Medium (minor issue)
- [ ] Low (cosmetic issue)
```

---

## Test Results Summary

### Overall Status

| Platform        | Status     | Notes |
| --------------- | ---------- | ----- |
| iOS Safari      | ⏳ Pending |       |
| Android Chrome  | ⏳ Pending |       |
| Desktop Chrome  | ⏳ Pending |       |
| Desktop Firefox | ⏳ Pending |       |
| Desktop Safari  | ⏳ Pending |       |

### Issues Found

[List any issues discovered during testing]

### Sign-off

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Known issues documented
- [ ] Feature approved for production

**Tested by:** ********\_********  
**Date:** ********\_********  
**Signature:** ********\_********

---

## Next Steps

After manual testing is complete:

1. Document all findings
2. Fix any critical/high-priority bugs
3. Re-test fixed issues
4. Update documentation (Task 7)
5. Proceed to code review (Task 8)
