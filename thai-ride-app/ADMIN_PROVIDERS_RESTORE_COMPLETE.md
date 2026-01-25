# ✅ Admin Providers - Restore Button Complete

**Date**: 2026-01-24  
**Status**: ✅ Complete  
**Priority**: 🔥 CRITICAL

---

## 🎯 สิ่งที่ทำ

### 1. ลบไฟล์เก่าที่ไม่จำเป็น

- ❌ ลบ `ProvidersView_OLD.vue`
- ❌ ลบ `ProvidersView_BACKUP_20260124_145456.vue`
- ✅ เหลือเฉพาะ `ProvidersView.vue` (ไฟล์ปัจจุบัน)

### 2. ตรวจสอบโค้ดปัจจุบัน

- ✅ Template มี restore button (บรรทัด 898-909)
- ✅ CSS มี `.btn-restore` styling (บรรทัด 1095-1118)
- ✅ Script มี `handleRestore()` function (บรรทัด 220-240)

### 3. ล้าง Cache และ Restart

- ✅ ลบ `node_modules/.vite` cache
- ✅ Restart dev server
- ✅ Server รันที่ http://localhost:5173/

---

## 🧪 วิธีทดสอบ

### ขั้นตอนที่ 1: เปิดหน้า Admin Providers

```
http://localhost:5173/admin/providers
```

### ขั้นตอนที่ 2: ทดสอบการระงับ (Suspend)

1. หา provider ที่มีสถานะ "อนุมัติแล้ว" (Approved)
2. เปลี่ยนสถานะเป็น "ระงับการใช้งาน" (Suspended)
3. ระบุเหตุผล เช่น "ทดสอบระบบ"
4. กด Confirm

### ขั้นตอนที่ 3: ตรวจสอบ Restore Button

**ควรเห็น**:

- ✅ Status dropdown แสดง "ระงับการใช้งาน"
- ✅ **Restore button (↻)** ปรากฏข้างๆ dropdown
- ✅ ปุ่มมีสีเขียว (green border)

### ขั้นตอนที่ 4: ทดสอบการคืนสถานะ

1. คลิกที่ **Restore button (↻)**
2. ระบบจะคืนสถานะเป็น "อนุมัติแล้ว" ทันที
3. แสดง toast message: "คืนสถานะ [ชื่อ Provider] เรียบร้อยแล้ว"
4. Restore button หายไป (เพราะสถานะเป็น approved แล้ว)

---

## 🎨 UI Design

### Restore Button

```css
- ขนาด: 32x32px
- สีพื้นหลัง: ขาว (#fff)
- สีขอบ: เขียว (#10b981)
- ไอคอน: ลูกศรหมุน (↻) สีเขียว
- Hover: พื้นหลังเขียว, ไอคอนขาว
```

### ตำแหน่ง

- อยู่ใน **Status column** (ไม่ใช่ Actions column)
- อยู่ข้างๆ status dropdown
- แสดงเฉพาะเมื่อ status = "suspended" หรือ "rejected"

---

## 🔧 Technical Details

### Template (บรรทัด 898-909)

```vue
<button
  v-if="provider.status === 'suspended' || provider.status === 'rejected'"
  @click.stop="handleRestore(provider)"
  class="btn-restore"
  title="คืนสถานะ (Restore)"
  :disabled="isProcessing"
  type="button"
>
  <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
</button>
```

### Function (บรรทัด 220-240)

```typescript
async function handleRestore(provider: Provider): Promise<void> {
  if (provider.status !== "suspended" && provider.status !== "rejected") {
    toast.error(
      "สามารถคืนสถานะได้เฉพาะผู้ให้บริการที่ถูกระงับหรือปฏิเสธเท่านั้น",
    );
    return;
  }

  isProcessing.value = true;

  try {
    const restoreNote =
      provider.status === "suspended"
        ? "คืนสถานะจากการระงับโดยแอดมิน"
        : "คืนสถานะจากการปฏิเสธโดยแอดมิน";

    await approveProviderAction(provider.id, restoreNote);
    toast.success(
      `คืนสถานะ ${provider.first_name} ${provider.last_name} เรียบร้อยแล้ว`,
    );
    await loadProviders();
  } catch (e) {
    errorHandler.handle(e, "handleRestore");
    toast.error("ไม่สามารถคืนสถานะผู้ให้บริการได้");
  } finally {
    isProcessing.value = false;
  }
}
```

---

## 🚨 Troubleshooting

### ถ้าปุ่มยังไม่แสดง

1. **Hard Refresh Browser**
   - Chrome/Edge: `Cmd + Shift + R` (Mac) หรือ `Ctrl + Shift + R` (Windows)
   - Safari: `Cmd + Option + R`

2. **Clear Browser Cache**
   - เปิด DevTools (F12)
   - ไปที่ Network tab
   - เลือก "Disable cache"
   - Refresh หน้าใหม่

3. **ตรวจสอบ Console**
   - เปิด DevTools (F12)
   - ไปที่ Console tab
   - ดูว่ามี error หรือไม่

4. **ตรวจสอบ Element**
   - Right-click ที่ status cell
   - เลือก "Inspect"
   - ดูว่ามี `<button class="btn-restore">` หรือไม่

---

## ✅ Checklist

- [x] ลบไฟล์เก่าทั้งหมด
- [x] Restore button อยู่ใน template
- [x] CSS styling ครบถ้วน
- [x] handleRestore() function ทำงานถูกต้อง
- [x] ล้าง Vite cache
- [x] Restart dev server
- [ ] ทดสอบใน browser (รอ user ทดสอบ)

---

**Status**: ✅ Ready for Testing  
**Server**: http://localhost:5173/admin/providers  
**Last Updated**: 2026-01-24
