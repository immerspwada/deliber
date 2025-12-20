# 🎯 Agent Hooks Setup Guide

## วิธีสร้าง Agent Hooks สำหรับ Thai Ride App

เนื่องจาก Kiro ต้องการให้สร้าง hooks ผ่าน UI เท่านั้น ให้ทำตามขั้นตอนนี้:

---

## 📝 ขั้นตอนการสร้าง

### 1. เปิด Kiro Hook UI
```
Cmd+Shift+P (Mac) หรือ Ctrl+Shift+P (Windows)
พิมพ์: "Open Kiro Hook UI"
```

หรือคลิกที่ไอคอน Agent Hooks ในแถบด้านข้าง Explorer

---

## 🔄 Hooks ที่แนะนำให้สร้าง

### Hook 1: Auto Diagnostics Check ⚡
**สำหรับ**: ตรวจสอบ errors อัตโนมัติเมื่อบันทึกไฟล์

```
Name: Auto Diagnostics Check
Description: ตรวจสอบ errors และ warnings อัตโนมัติ
Trigger: On File Save
File Pattern: thai-ride-app/**/*.{ts,vue}
Action: Send Message
Message: ตรวจสอบไฟล์ {{filePath}} ด้วย getDiagnostics และแจ้งเตือนถ้ามี errors หรือ warnings
```

---

### Hook 2: Cross-Role Integration Alert 🎯
**สำหรับ**: เตือนให้ทำฟีเจอร์ครบทุก role

```
Name: Cross-Role Integration Alert
Description: เตือนให้ทำฟีเจอร์ครบ Customer + Provider + Admin
Trigger: On File Save
File Pattern: thai-ride-app/src/{views,composables}/**/*.{vue,ts}
Action: Send Message
Message: ตรวจสอบ {{filePath}} - ถ้าเป็นฟีเจอร์ใหม่ที่เกี่ยวข้องกับ Customer/Provider/Admin ให้แจ้งเตือนว่าต้องทำครบทั้ง 3 ฝ่าย ตาม Cross-Role Integration Rules ใน .kiro/steering/admin-rules.md
```

---

### Hook 3: Migration RLS Check 🔒
**สำหรับ**: ตรวจสอบ RLS policies ใน migrations

```
Name: Migration RLS Check
Description: ตรวจสอบ RLS policies และ Realtime
Trigger: On File Save
File Pattern: thai-ride-app/supabase/migrations/*.sql
Action: Send Message
Message: ตรวจสอบ migration {{filePath}} ว่ามี RLS policies ครบถ้วนสำหรับทุก role (admin, provider, customer) และเปิด Realtime ถ้าจำเป็น
```

---

### Hook 4: Project Summary on Start 📊
**สำหรับ**: แสดงสรุปโปรเจกต์เมื่อเริ่ม session

```
Name: Project Summary on Start
Description: แสดงสรุปโปรเจกต์และ TODO
Trigger: On Session Start
Action: Send Message
Message: สรุปสถานะโปรเจกต์ Thai Ride App: 1) ตรวจสอบ migrations ล่าสุด 2) ตรวจสอบ features ที่ยังไม่สมบูรณ์ 3) แสดง TODO items จาก .md files 4) ตรวจสอบ diagnostics ใน key files
```

---

### Hook 5: Admin Dashboard Update Alert 🔔
**สำหรับ**: เตือนให้อัพเดท Admin Dashboard

```
Name: Admin Dashboard Update Alert
Description: เตือนให้อัพเดท Admin เมื่อแก้ไข composables
Trigger: On File Save
File Pattern: thai-ride-app/src/composables/use{Services,Provider,Delivery,Shopping,Queue,Moving,Laundry}*.ts
Action: Send Message
Message: ตรวจสอบว่า useAdmin.ts และ Admin*View.vue ต้องอัพเดทตามการเปลี่ยนแปลงใน {{filePath}} หรือไม่ เพื่อให้ Admin สามารถจัดการข้อมูลได้ ตาม Admin Rules
```

---

### Hook 6: Manual Code Review 🔍
**สำหรับ**: รีวิวโค้ดตามมาตรฐาน (คลิกเพื่อรัน)

```
Name: Manual Code Review
Description: รีวิวโค้ดตามมาตรฐานทั้งหมด
Trigger: Manual
Action: Send Message
Message: ทำ Code Review ตามมาตรฐาน:
1. UI Design Guidelines (MUNEEF Style) - .kiro/steering/ui-design.md
2. Database Features Mapping - .kiro/steering/database-features.md
3. Admin Rules Compliance - .kiro/steering/admin-rules.md
4. Cross-Role Integration - ตรวจสอบว่าทำครบทั้ง Customer + Provider + Admin
5. Mock Data Check - ต้องไม่มี mock data
6. Member UID System - ตรวจสอบการใช้งาน Member UID
```

---

### Hook 7: Manual Database Sync Check 🗄️
**สำหรับ**: ตรวจสอบความสอดคล้อง code-database (คลิกเพื่อรัน)

```
Name: Manual Database Sync Check
Description: ตรวจสอบความสอดคล้องระหว่าง code และ database
Trigger: Manual
Action: Send Message
Message: ตรวจสอบ Database Sync:
1. เปรียบเทียบ migrations กับ composables
2. ตรวจสอบ RLS policies ครบถ้วน
3. ตรวจสอบ Realtime subscriptions
4. ตรวจสอบ Functions และ Triggers
5. อัพเดท .kiro/steering/database-features.md ถ้าจำเป็น
```

---

### Hook 8: Manual Pre-Deploy Check ✅
**สำหรับ**: ตรวจสอบก่อน deploy (คลิกเพื่อรัน)

```
Name: Manual Pre-Deploy Check
Description: ตรวจสอบทุกอย่างก่อน deploy
Trigger: Manual
Action: Send Message
Message: Pre-Deploy Checklist:
1. รัน getDiagnostics ใน key files
2. ตรวจสอบ Cross-Role Integration ครบถ้วน
3. ตรวจสอบ RLS policies
4. ตรวจสอบ Realtime subscriptions
5. ตรวจสอบ Admin Dashboard รองรับฟีเจอร์ใหม่
6. ตรวจสอบ UI Design Guidelines
7. ตรวจสอบไม่มี Mock Data
8. ตรวจสอบ Member UID System
```

---

## 🎨 Tips การใช้งาน

### File Pattern Syntax
- `**/*.ts` - ไฟล์ .ts ทั้งหมด (recursive)
- `src/**/*.vue` - ไฟล์ .vue ใน src (recursive)
- `**/*.{ts,vue}` - ไฟล์ .ts และ .vue ทั้งหมด
- `src/{views,composables}/**/*` - ไฟล์ใน views และ composables

### Variables ที่ใช้ได้
- `{{filePath}}` - path ของไฟล์ที่ trigger
- `{{fileName}}` - ชื่อไฟล์
- `{{fileExtension}}` - นามสกุลไฟล์

---

## 🚀 หลังสร้าง Hooks แล้ว

1. **ตรวจสอบ**: ดูว่า hooks ปรากฏใน Agent Hooks panel
2. **ทดสอบ**: บันทึกไฟล์หรือคลิก manual hooks เพื่อทดสอบ
3. **ปรับแต่ง**: แก้ไข message หรือ file pattern ตามต้องการ
4. **เปิด/ปิด**: Toggle เปิด/ปิด hooks ที่ต้องการ

---

## 📚 เอกสารอ้างอิง

- **Admin Rules**: `.kiro/steering/admin-rules.md`
- **Database Features**: `.kiro/steering/database-features.md`
- **UI Design**: `.kiro/steering/ui-design.md`

---

## ❓ Troubleshooting

### Hooks ไม่ปรากฏ
1. ตรวจสอบว่าสร้างผ่าน UI
2. Restart Kiro
3. ตรวจสอบ Command Palette → "Reload Window"

### Hooks ไม่ทำงาน
1. ตรวจสอบ File Pattern ถูกต้อง
2. ตรวจสอบ enabled = true
3. ดู logs ใน Output panel

---

## 🎯 ประโยชน์ของ Hooks

✅ **ป้องกันการลืม** - เตือนให้ทำฟีเจอร์ครบทุก role  
✅ **จับ bugs เร็ว** - ตรวจสอบ errors ทันทีที่บันทึก  
✅ **รักษามาตรฐาน** - Code review อัตโนมัติ  
✅ **ประหยัดเวลา** - ไม่ต้องจำทุกกฎ  
✅ **Deploy มั่นใจ** - Pre-deploy checklist ครบถ้วน

---

**เริ่มสร้าง Hooks เลย!** 🚀

`Cmd+Shift+P` → `Open Kiro Hook UI` → `Create New Hook`
