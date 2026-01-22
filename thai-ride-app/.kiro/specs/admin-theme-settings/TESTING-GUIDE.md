# 🧪 Theme Settings - Testing Guide

**Feature**: Admin Theme Settings  
**Date**: 2026-01-19  
**Status**: Ready for Testing

---

## 🎯 Quick Start

### Access the Feature

1. Navigate to: `http://localhost:5173/admin/settings/theme`
2. Or: Admin Panel → Settings → Theme card

---

## ✅ Test Scenarios

### 1. Basic Color Change

**Steps:**

1. Open theme settings page
2. Click on "สีหลัก" (Primary Color) color picker
3. Select a new color
4. Observe live preview updates
5. Click "บันทึกการตั้งค่า"
6. Refresh page
7. Verify color persists

**Expected Result:**

- ✅ Color picker opens
- ✅ Preview updates in real-time
- ✅ Save succeeds with success toast
- ✅ Color persists after refresh

---

### 2. Hex Code Input

**Steps:**

1. Click on any color input field (text input)
2. Type: `FF5733`
3. Observe auto-addition of `#`
4. Type invalid code: `GGGGGG`
5. Observe error message

**Expected Result:**

- ✅ `#` automatically added
- ✅ Valid hex accepted
- ✅ Invalid hex shows error
- ✅ Preview updates for valid colors

---

### 3. Reset Individual Color

**Steps:**

1. Change "สีหลัก" to a custom color
2. Click the 🔄 reset button next to it
3. Observe color reverts to default

**Expected Result:**

- ✅ Color resets to default value
- ✅ Preview updates immediately
- ✅ No confirmation needed

---

### 4. Reset All Theme

**Steps:**

1. Change multiple colors
2. Click "รีเซ็ต" button in header
3. Confirm the dialog
4. Observe all colors reset

**Expected Result:**

- ✅ Confirmation dialog appears
- ✅ All colors reset to defaults
- ✅ Success toast shown
- ✅ Changes saved to database

---

### 5. Export Theme

**Steps:**

1. Click "ส่งออก" button
2. Check downloads folder
3. Open JSON file
4. Verify structure

**Expected Result:**

- ✅ File downloads automatically
- ✅ Filename: `theme-YYYY-MM-DD.json`
- ✅ Valid JSON structure
- ✅ Contains all theme properties

**Expected JSON Structure:**

```json
{
  "version": "1.0",
  "exported_at": "2026-01-19T...",
  "theme": {
    "skinColor": {
      "primary": "#FFFFFF",
      "secondary": "#0671E3"
    },
    "buttonColor": {
      "normal": "#0B1223",
      "hover": "#DEDEDE"
    },
    ...
  }
}
```

---

### 6. Import Theme

**Steps:**

1. Export current theme (for backup)
2. Click "นำเข้า" button
3. Upload the exported JSON file
4. Click "นำเข้าธีม"
5. Observe theme applies

**Expected Result:**

- ✅ Modal opens
- ✅ File upload works
- ✅ JSON validates
- ✅ Theme applies successfully
- ✅ Success toast shown

---

### 7. Import Invalid JSON

**Steps:**

1. Click "นำเข้า"
2. Paste invalid JSON: `{invalid}`
3. Click "นำเข้าธีม"
4. Observe error message

**Expected Result:**

- ✅ Error message: "รูปแบบ JSON ไม่ถูกต้อง"
- ✅ Modal stays open
- ✅ No changes applied

---

### 8. Cancel with Unsaved Changes

**Steps:**

1. Change several colors
2. Click "ยกเลิก" button
3. Confirm dialog
4. Verify navigation back

**Expected Result:**

- ✅ Confirmation dialog appears
- ✅ Warns about unsaved changes
- ✅ Navigates to settings hub
- ✅ Changes not saved

---

### 9. Live Preview

**Steps:**

1. Change "สีหลัก" (Primary)
2. Observe preview header logo color
3. Change "สีปุ่ม" (Button Normal)
4. Observe preview button color
5. Change "Header Background"
6. Observe preview header background

**Expected Result:**

- ✅ All preview elements update in real-time
- ✅ No lag or delay
- ✅ Colors match selections exactly

---

### 10. Mobile Responsive

**Steps:**

1. Open DevTools
2. Toggle device toolbar (mobile view)
3. Test all interactions
4. Verify touch targets

**Expected Result:**

- ✅ Single column layout
- ✅ All buttons ≥ 44px
- ✅ Color pickers work on touch
- ✅ Modal fits screen
- ✅ No horizontal scroll

---

### 11. Keyboard Navigation

**Steps:**

1. Click in first color input
2. Press `Tab` repeatedly
3. Navigate through all fields
4. Press `Enter` on color picker
5. Press `Esc` in modal

**Expected Result:**

- ✅ Tab order is logical
- ✅ Focus indicators visible
- ✅ All controls accessible
- ✅ Enter opens color picker
- ✅ Esc closes modal

---

### 12. Database Persistence

**Steps:**

1. Change theme colors
2. Save changes
3. Open browser DevTools → Network
4. Verify RPC calls to `update_setting`
5. Check database directly:
   ```sql
   SELECT setting_key, setting_value
   FROM system_settings
   WHERE category = 'theme'
   ORDER BY setting_key;
   ```

**Expected Result:**

- ✅ RPC calls succeed (200 OK)
- ✅ Database values updated
- ✅ Audit log created
- ✅ No errors in console

---

## 🐛 Known Issues / Edge Cases

### Issue 1: Color Picker Browser Support

**Issue**: Native color picker looks different across browsers  
**Impact**: Low - Functionality works everywhere  
**Workaround**: None needed

### Issue 2: Large JSON Import

**Issue**: Very large JSON files may take time to parse  
**Impact**: Low - Theme JSON is always small  
**Workaround**: None needed

---

## 📊 Performance Testing

### Load Time Test

**Steps:**

1. Open DevTools → Network
2. Navigate to theme settings
3. Check load time

**Expected:**

- ✅ Initial load < 500ms
- ✅ No blocking requests
- ✅ Smooth rendering

### Interaction Test

**Steps:**

1. Open DevTools → Performance
2. Start recording
3. Change 10 colors rapidly
4. Stop recording
5. Check frame rate

**Expected:**

- ✅ 60 FPS maintained
- ✅ No jank or stuttering
- ✅ Preview updates smoothly

---

## ♿ Accessibility Testing

### Screen Reader Test

**Tools**: NVDA (Windows), VoiceOver (Mac)

**Steps:**

1. Enable screen reader
2. Navigate through page
3. Verify all labels read correctly
4. Test form submission

**Expected:**

- ✅ All sections announced
- ✅ Color values read
- ✅ Buttons have labels
- ✅ Errors announced

### Keyboard Only Test

**Steps:**

1. Unplug mouse
2. Navigate entire page with keyboard
3. Complete all actions

**Expected:**

- ✅ All features accessible
- ✅ Focus visible
- ✅ Logical tab order

### Color Contrast Test

**Tools**: WAVE, axe DevTools

**Steps:**

1. Run accessibility checker
2. Verify no contrast issues
3. Check with different themes

**Expected:**

- ✅ No contrast violations
- ✅ WCAG AA compliant
- ✅ Text readable on all backgrounds

---

## 🌐 Browser Compatibility

### Desktop Browsers

- [ ] Chrome 120+ (Windows/Mac/Linux)
- [ ] Firefox 120+ (Windows/Mac/Linux)
- [ ] Safari 17+ (Mac)
- [ ] Edge 120+ (Windows)

### Mobile Browsers

- [ ] Safari iOS 17+
- [ ] Chrome Android 120+
- [ ] Samsung Internet 23+

---

## 🔒 Security Testing

### XSS Prevention

**Steps:**

1. Try to inject script in color input: `<script>alert('xss')</script>`
2. Try in import JSON: `{"theme":{"skinColor":{"primary":"<script>"}}}`

**Expected:**

- ✅ Input sanitized
- ✅ No script execution
- ✅ Error shown for invalid format

### SQL Injection Prevention

**Steps:**

1. Try SQL in color input: `'; DROP TABLE system_settings; --`
2. Verify parameterized queries used

**Expected:**

- ✅ Input validated
- ✅ No SQL execution
- ✅ Parameterized queries only

---

## 📝 Test Report Template

```markdown
## Theme Settings Test Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Production/Staging/Local]
**Browser**: [Browser + Version]

### Test Results

| Test Case          | Status | Notes |
| ------------------ | ------ | ----- |
| Basic Color Change | ✅/❌  |       |
| Hex Code Input     | ✅/❌  |       |
| Reset Individual   | ✅/❌  |       |
| Reset All          | ✅/❌  |       |
| Export Theme       | ✅/❌  |       |
| Import Theme       | ✅/❌  |       |
| Invalid JSON       | ✅/❌  |       |
| Cancel Changes     | ✅/❌  |       |
| Live Preview       | ✅/❌  |       |
| Mobile Responsive  | ✅/❌  |       |
| Keyboard Nav       | ✅/❌  |       |
| Database Persist   | ✅/❌  |       |

### Issues Found

1. [Issue description]
2. [Issue description]

### Overall Status

- [ ] All tests passed
- [ ] Minor issues found
- [ ] Major issues found
- [ ] Blocked

### Recommendations

[Any recommendations for improvements]
```

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Accessibility compliant
- [ ] Mobile tested
- [ ] Database backup taken
- [ ] Rollback plan ready
- [ ] Documentation complete
- [ ] Team trained

---

**Happy Testing! 🎨**
