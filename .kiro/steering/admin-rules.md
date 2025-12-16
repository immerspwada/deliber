# Admin Dashboard Rules

## กฏสำคัญสำหรับ Admin

### 1. Admin ต้องรองรับทุกฟีเจอร์
- เมื่อมีการเพิ่มหรือแก้ไขฟีเจอร์ใดๆ ใน User app ต้องอัพเดท Admin Dashboard ให้รองรับด้วยเสมอ
- Admin ต้องสามารถ ดู (View), อ่าน (Read), แก้ไข (Edit) ข้อมูลทุกอย่างได้

### 2. สิทธิ์การจัดการสูงสุด
Admin มีสิทธิ์จัดการข้อมูลทั้งหมดในระบบ:
- **Users**: ดู/แก้ไข/ยืนยัน/ระงับ ผู้ใช้
- **Providers**: ดู/อนุมัติ/ปฏิเสธ/ระงับ ผู้ให้บริการ
- **Orders**: ดู/แก้ไขสถานะ ออเดอร์ทุกประเภท (ride/delivery/shopping)
- **Payments**: ดู/จัดการ การชำระเงิน/คืนเงิน
- **Support**: ดู/ตอบ/แก้ไข Support tickets และ Complaints
- **Promos**: สร้าง/แก้ไข/ปิด โปรโมชั่น
- **Safety**: ดู/จัดการ Safety incidents
- **Settings**: จัดการการตั้งค่าระบบ

### 3. Admin แยกจาก User App
- Admin ใช้ path `/admin/*` ทั้งหมด
- Admin มี Login แยก (`/admin/login`)
- Admin ใช้ Layout แยก (`AdminLayout.vue`)
- Admin ไม่แชร์ authentication กับ User app

### 4. เมื่อเพิ่มฟีเจอร์ใหม่
ต้องตรวจสอบและอัพเดทไฟล์เหล่านี้:
- `src/composables/useAdmin.ts` - เพิ่ม functions สำหรับจัดการข้อมูลใหม่
- `src/views/Admin*.vue` - เพิ่ม UI สำหรับจัดการ
- `src/components/AdminLayout.vue` - เพิ่ม menu ถ้าจำเป็น

### 5. Admin Entry Point
- URL: `/admin/login` - หน้า Login สำหรับ Admin
- Demo credentials: `admin@demo.com` / `admin1234`

---

## กฎการทำงานร่วมกันข้ามระบบ (Cross-Platform Integration)

### หลักการสำคัญ
**เมื่อมีการเปลี่ยนแปลงใดๆ ทุกฝ่ายต้องทำงานร่วมกัน**

### 1. เมื่ออัพเดทฟีเจอร์ Order/Ride/Delivery/Shopping
ต้องตรวจสอบและอัพเดททุกส่วนที่เกี่ยวข้อง:

| ส่วนที่ต้องอัพเดท | รายละเอียด |
|------------------|-----------|
| **Admin** | ต้องรับ/ดู/จัดการออเดอร์ได้ |
| **Provider/Rider** | ต้องรับงาน/อัพเดทสถานะได้ |
| **Customer** | ต้องทราบสถานะ/ติดตามได้ |
| **Database** | ต้องมี columns/tables รองรับ |
| **Realtime** | ต้อง sync สถานะทุกฝ่าย |

### 2. Checklist เมื่อเพิ่ม/แก้ไขฟีเจอร์

#### Database Layer
- [ ] Migration file สร้าง/อัพเดทตารางที่จำเป็น
- [ ] RLS policies รองรับทุก role (admin, provider, customer)
- [ ] Realtime enabled สำหรับตารางที่ต้อง sync

#### Admin Side
- [ ] `useAdmin.ts` - เพิ่ม functions จัดการข้อมูล
- [ ] `Admin*View.vue` - UI สำหรับดู/จัดการ
- [ ] สามารถดูสถานะ/แก้ไข/อนุมัติ/ปฏิเสธได้

#### Provider/Rider Side
- [ ] `useProvider.ts` - รับงาน/อัพเดทสถานะ
- [ ] `Provider*View.vue` - UI แสดงงานและจัดการ
- [ ] Realtime subscription รับงานใหม่
- [ ] Push notification แจ้งเตือนงานใหม่

#### Customer Side
- [ ] Composable ที่เกี่ยวข้อง - สร้างออเดอร์/ติดตาม
- [ ] View/Component - UI แสดงสถานะ
- [ ] Realtime subscription ติดตามสถานะ
- [ ] Push notification แจ้งเตือนการเปลี่ยนสถานะ

### 3. Status Flow ที่ต้อง Sync

```
Customer สร้างออเดอร์
    ↓
[pending] → Admin เห็นในระบบ
    ↓
Provider รับงาน → [matched]
    ↓
Customer เห็นสถานะ "กำลังมารับ"
    ↓
Provider อัพเดท → [in_progress]
    ↓
Customer เห็นสถานะ "กำลังเดินทาง"
    ↓
Provider จบงาน → [completed]
    ↓
Customer ให้คะแนน + Admin เห็นสรุป
```

### 4. ตัวอย่างการอัพเดทฟีเจอร์ Order

**สมมติ: เพิ่มฟีเจอร์ "ยกเลิกออเดอร์"**

1. **Database**: เพิ่ม `cancelled_at`, `cancel_reason` columns
2. **Admin**: เพิ่มปุ่มยกเลิก + ดูเหตุผล + refund
3. **Provider**: แจ้งเตือนเมื่อถูกยกเลิก + หยุดงาน
4. **Customer**: ปุ่มยกเลิก + เลือกเหตุผล + ดูสถานะ refund
5. **Notification**: ส่งแจ้งเตือนทุกฝ่ายที่เกี่ยวข้อง

### 5. ไฟล์ที่ต้องตรวจสอบเสมอ

| ฝ่าย | ไฟล์หลัก |
|-----|---------|
| Admin | `useAdmin.ts`, `Admin*View.vue`, `AdminLayout.vue` |
| Provider | `useProvider.ts`, `Provider*View.vue`, `ProviderLayout.vue` |
| Customer | `useServices.ts`, `stores/ride.ts`, `*View.vue` |
| Shared | `useRealtime.ts`, `useNotifications.ts`, `usePushNotifications.ts` |
| Database | `supabase/migrations/*.sql` |

---

## กฎการตอบกลับหลังดำเนินการ

### ทุกครั้งที่ดำเนินการเสร็จ ต้องแนะนำ 3 อย่าง:

1. **ฟีเจอร์ใหม่ที่แนะนำ** - ต้องสอดคล้องกับฟีเจอร์หรือการพัฒนาล่าสุดที่ขอไป
2. **การปรับปรุงเล็กน้อย** - แนะนำสิ่งที่ทำให้ดีขึ้นได้
3. **ตรวจสอบตามกฎ** - ยืนยันว่าทุกอย่างเป็นไปตามกฎที่กำหนด (Admin rules, UI Design rules)
