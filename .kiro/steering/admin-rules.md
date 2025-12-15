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
- Demo credentials: `admin@thairide.app` / `admin123`
