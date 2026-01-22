# 🧪 Quick Verification Guide

**Date**: 2026-01-19  
**Purpose**: Verify commission data is now visible in admin panel

---

## ✅ What Was Fixed

The RPC function `get_admin_providers_v2` now returns commission fields, so the admin providers page will display commission information.

---

## 🔍 How to Verify

### Step 1: Open Admin Providers Page

```
http://localhost:5173/admin/providers
```

### Step 2: Check Table View

You should now see a **"คอมมิชชั่น"** column in the providers table with badges:

```
┌────────────────────────────────────────────────────┐
│ ชื่อ    │ ประเภท │ คอมมิชชั่น │ สถานะ   │ รายได้  │
├────────────────────────────────────────────────────┤
│ สมชาย   │ Ride   │ [20%]      │ อนุมัติ │ 5,000฿ │
│ สมหญิง  │ Delivery│ [20%]     │ อนุมัติ │ 3,200฿ │
└────────────────────────────────────────────────────┘
```

**Expected**:

- ✅ Blue badge for percentage: `20%`
- ✅ Yellow badge for fixed: `20 ฿`

### Step 3: Click on a Provider

Click on any provider row to open the detail modal.

### Step 4: Check Commission Section

Scroll down to the **"💰 ค่าคอมมิชชั่น"** section.

**Expected to see**:

```
┌─────────────────────────────────────────────┐
│ 💰 ค่าคอมมิชชั่น              [แก้ไข]     │
├─────────────────────────────────────────────┤
│ ประเภท:        📊 เปอร์เซ็นต์              │
│ ค่าคอมมิชชั่น:  20%                        │
│ หมายเหตุ:      -                           │
│ อัพเดทล่าสุด:   -                          │
└─────────────────────────────────────────────┘
```

### Step 5: Test Edit Functionality

1. Click the **"แก้ไข"** button
2. Modal should open with current commission values
3. Change commission type or value
4. Click **"บันทึกการตั้งค่า"**
5. Modal closes and data refreshes

**Expected**:

- ✅ Modal opens
- ✅ Current values pre-filled
- ✅ Can change type (percentage/fixed)
- ✅ Can change value
- ✅ Real-time calculation example updates
- ✅ Save button works
- ✅ Success toast appears
- ✅ Table updates with new values

---

## 🐛 If Something's Wrong

### Issue: Commission column not showing

**Check**:

1. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for errors

### Issue: Commission section empty in detail modal

**Check**:

1. Verify you're logged in as admin
2. Check network tab for RPC call errors
3. Verify database has commission data

### Issue: Edit button doesn't work

**Check**:

1. Check browser console for errors
2. Verify `ProviderCommissionModal.vue` is imported
3. Check if modal is registered in components

---

## 🔧 Database Verification

If UI still doesn't show data, verify database directly:

```sql
-- Check if columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'providers_v2'
AND column_name LIKE 'commission%';

-- Check if data exists
SELECT id, first_name, last_name,
       commission_type, commission_value, commission_notes
FROM providers_v2
LIMIT 5;

-- Test RPC function
SELECT id, first_name, last_name,
       commission_type, commission_value
FROM get_admin_providers_v2(NULL, NULL, 5, 0);
```

**Expected Results**:

- ✅ 5 commission columns exist
- ✅ Providers have commission_type = 'percentage'
- ✅ Providers have commission_value = 20.00
- ✅ RPC function returns commission fields

---

## ✅ Success Criteria

- [ ] Commission column visible in table
- [ ] Commission badges display correctly
- [ ] Detail modal shows commission section
- [ ] Edit button opens modal
- [ ] Can update commission values
- [ ] Changes save successfully
- [ ] Table refreshes with new data

---

## 📞 Need Help?

If verification fails, check:

1. `.kiro/specs/provider-commission-management/RPC-FUNCTION-FIX.md` - Technical details
2. `.kiro/specs/provider-commission-management/TESTING-GUIDE.md` - Full testing guide
3. Browser console for JavaScript errors
4. Network tab for API errors

---

**Status**: Ready for verification  
**Expected Time**: 2-3 minutes
