# 🔧 Column Name Fix - total_fare → final_fare

**Date**: 2026-01-19  
**Status**: ✅ Fixed  
**Priority**: 🔥 CRITICAL

---

## 🚨 Problem

Error ใน Admin Payments View:
```
column ride_requests.total_fare does not exist
```

### Root Cause

Code ใช้ column name `total_fare` แต่ใน database จริงมีเฉพาะ:
- `actual_fare` - ค่าโดยสารจริง
- `estimated_fare` - ค่าโดยสารประมาณการ  
- `final_fare` - ค่าโดยสารสุดท้าย (ที่ควรใช้)

---

## ✅ Solution

แก้ไขทุกไฟล์ที่ใช้ `total_fare` เป็น `final_fare` เมื่ออ่านจาก database

---

## 📁 Files Fixed

### 1. src/admin/views/PaymentsView.vue
**Changes**: 3 occurrences
- Query: `total_fare` → `final_fare`
- Filter: `.not('total_fare')` → `.not('final_fare')`
- Mapping: `p.total_fare` → `p.final_fare`

### 2. src/admin/views/RevenueView.vue
**Changes**: 4 occurrences
- Query: `total_fare` → `final_fare`
- 3x reduce calculations

### 3. src/composables/useReceipt.ts
**Changes**: 1 occurrence
- Receipt total calculation

### 4. src/composables/useCancellation.ts
**Changes**: 4 occurrences
- Query, calculations, refund logic

---

## 📊 Summary

| File | Occurrences | Status |
|------|-------------|--------|
| PaymentsView.vue | 3 | ✅ Fixed |
| RevenueView.vue | 4 | ✅ Fixed |
| useReceipt.ts | 1 | ✅ Fixed |
| useCancellation.ts | 4 | ✅ Fixed |
| **Total** | **12** | ✅ Complete |

---

**Fixed By**: Kiro AI  
**Date**: 2026-01-19 15:30  
**Status**: ✅ Ready for Testing
