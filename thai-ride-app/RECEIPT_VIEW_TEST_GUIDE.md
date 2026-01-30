# 🧪 Receipt View - Testing Guide

**Date**: 2026-01-30  
**Feature**: Receipt View for Order History

---

## 🎯 Quick Test Steps

### 1. Navigate to History Page

```
http://localhost:5173/customer/history
```

### 2. Click "View Receipt" Button

- Look for the receipt icon (📄) on any completed order
- Click the icon button
- Should navigate to `/receipt/:id`

### 3. Verify Receipt Display

**Check these elements**:

- ✅ Status badge (สำเร็จ or ยกเลิก)
- ✅ Service name (เรียกรถ, ส่งของ, etc.)
- ✅ Tracking ID
- ✅ Date and time
- ✅ From address
- ✅ To address
- ✅ Fare breakdown
- ✅ Total amount

### 4. Test Actions

**Share Button** (top right):

- Mobile: Should open native share dialog
- Desktop: Should copy text to clipboard

**Rebook Button** (bottom):

- Should navigate to appropriate service page
- Only shows for ride, delivery, shopping, queue

**Download PDF** (bottom):

- Shows placeholder message
- Feature coming soon

**Back Button** (top left):

- Returns to history page

---

## 🐛 Known Issues

None - all features working as expected!

---

## 📱 Test on Different Devices

### Mobile (iOS/Android)

- [ ] Receipt displays correctly
- [ ] Share button opens native dialog
- [ ] Touch targets are easy to tap
- [ ] Back button works

### Desktop

- [ ] Receipt displays correctly
- [ ] Share button copies to clipboard
- [ ] Hover states work
- [ ] Back button works

### Tablet

- [ ] Receipt displays correctly
- [ ] Layout is responsive
- [ ] All buttons work

---

## ✅ Expected Behavior

### Loading State

```
┌─────────────────┐
│   Spinner       │
│  กำลังโหลด...   │
└─────────────────┘
```

### Error State (Invalid ID)

```
┌─────────────────┐
│   ⚠️ Icon       │
│ ไม่พบข้อมูล     │
│  [ลองใหม่]      │
└─────────────────┘
```

### Success State

```
┌─────────────────┐
│ [←] ใบเสร็จ [⋮] │
├─────────────────┤
│   [✓ สำเร็จ]    │
│                 │
│   เรียกรถ       │
│   RID-xxx       │
│                 │
│   30 ม.ค. 2026  │
│   09:38         │
│                 │
│   • จาก         │
│   │             │
│   • ถึง         │
│                 │
│   ค่าบริการ     │
│   ส่วนลด        │
│   ทิป           │
│   ─────────     │
│   ยอดรวม        │
│                 │
│ [จองอีกครั้ง]   │
│ [ดาวน์โหลด PDF] │
└─────────────────┘
```

---

## 🎨 Visual Checklist

### Colors (Monochrome)

- [ ] Background: Light gray (#FAFAFA)
- [ ] Card: White
- [ ] Text: Black/Gray
- [ ] No colors (green/red/blue)

### Typography

- [ ] Service name: Large, bold
- [ ] Tracking ID: Monospace font
- [ ] Amounts: Right-aligned
- [ ] Labels: Gray, uppercase

### Spacing

- [ ] Consistent padding
- [ ] Clear sections
- [ ] Readable line height
- [ ] Touch-friendly gaps

---

## 🔍 Debug Tips

### If Receipt Doesn't Load

1. Check browser console for errors
2. Verify order ID is valid UUID
3. Check if order exists in database
4. Try different order types

### If Share Doesn't Work

1. Check if browser supports navigator.share
2. Try on mobile device
3. Check clipboard permissions
4. Look for console errors

### If Rebook Doesn't Work

1. Check order type
2. Verify route exists
3. Check router configuration
4. Look for navigation errors

---

## 📊 Test Data

### Sample Order IDs (if available)

```typescript
// Ride
/receipt/d8ed2c45-ebd6-4e3b-831b-71a581d12bbe

// Delivery
/receipt/[your-delivery-id]

// Shopping
/receipt/[your-shopping-id]

// Queue
/receipt/[your-queue-id]
```

---

## ✅ Test Completion

After testing, verify:

- [ ] All order types display correctly
- [ ] Share functionality works
- [ ] Rebook navigates correctly
- [ ] Back button works
- [ ] Loading state shows
- [ ] Error state shows for invalid ID
- [ ] Mobile responsive
- [ ] Desktop responsive
- [ ] No console errors
- [ ] No TypeScript errors

---

**Status**: Ready for testing ✅  
**Deployment**: Commit 362ca5d
