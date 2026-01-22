# 🧪 System Settings - Testing Instructions (Production)

**Date**: 2026-01-19  
**Environment**: Production Database  
**URL**: http://localhost:5173/admin/settings/system

---

## 🎯 Prerequisites

### 1. Admin Account

คุณต้องมี admin account ที่มี:

- ✅ `role = 'admin'` ใน users table
- ✅ Email: `admin@gobear.app` (หรือ admin account อื่นๆ)

### 2. Development Server

```bash
npm run dev
```

### 3. Database Connection

- ✅ Production Database: `onsflqhkgqhydeupiqyt`
- ✅ MCP Power: `supabase-hosted`

---

## 📋 Test Scenarios

### Scenario 1: Load Settings (Basic)

#### Steps:

1. เข้าสู่ระบบด้วย admin account
2. ไปที่ `/admin/settings`
3. คลิก "การตั้งค่าระบบ" หรือไปที่ `/admin/settings/system`

#### Expected Results:

- ✅ แสดง loading state ชั่วคราว
- ✅ โหลดข้อมูลจาก database สำเร็จ
- ✅ แสดงฟอร์มการตั้งค่าทั้งหมด
- ✅ ข้อมูลถูกต้องตามที่บันทึกไว้

#### What to Check:

```
✅ ชื่อเว็บไซต์: "Thai Ride App"
✅ คำอธิบายเว็บไซต์: "แพลตฟอร์มเรียกรถและจัดส่งสินค้าในประเทศไทย"
✅ อีเมลติดต่อ: "support@thairideapp.com"
✅ เบอร์โทร: "02-xxx-xxxx"
✅ Meta Title: "Thai Ride App - บริการเรียกรถและจัดส่งสินค้า"
✅ Meta Description: "แพลตฟอร์มเรียกรถและจัดส่งสินค้าที่ดีที่สุดในประเทศไทย"
✅ Meta Keywords: "เรียกรถ, จัดส่งสินค้า, ไทย"
✅ Timezone: "Asia/Bangkok"
✅ Currency: "THB"
✅ Maintenance Mode: unchecked
```

---

### Scenario 2: Edit and Save Settings

#### Steps:

1. แก้ไข "ชื่อเว็บไซต์" เป็น "Thai Ride App - Test"
2. แก้ไข "อีเมลติดต่อ" เป็น "test@thairideapp.com"
3. คลิกปุ่ม "บันทึกการเปลี่ยนแปลง"

#### Expected Results:

- ✅ แสดง loading state บนปุ่ม
- ✅ บันทึกข้อมูลสำเร็จ
- ✅ แสดง toast notification "บันทึกการตั้งค่าสำเร็จ"
- ✅ ปุ่ม "บันทึก" กลับเป็น disabled (ไม่มีการเปลี่ยนแปลง)

#### Verify in Database:

```sql
-- Check updated values
SELECT setting_key, setting_value, updated_at
FROM system_settings
WHERE setting_key IN ('site_name', 'contact_email')
  AND category = 'general';

-- Check audit log
SELECT *
FROM settings_audit_log
ORDER BY changed_at DESC
LIMIT 5;
```

---

### Scenario 3: Validation - Empty Required Fields

#### Steps:

1. ลบข้อความใน "ชื่อเว็บไซต์" (ทำให้ว่าง)
2. คลิกปุ่ม "บันทึกการเปลี่ยนแปลง"

#### Expected Results:

- ✅ แสดง error message "กรุณากรอกชื่อเว็บไซต์"
- ✅ ไม่ส่งข้อมูลไปยัง database
- ✅ Focus ไปที่ field ที่มี error

---

### Scenario 4: Validation - Invalid Email

#### Steps:

1. แก้ไข "อีเมลติดต่อ" เป็น "invalid-email"
2. คลิกปุ่ม "บันทึกการเปลี่ยนแปลง"

#### Expected Results:

- ✅ แสดง error message "รูปแบบอีเมลไม่ถูกต้อง"
- ✅ ไม่ส่งข้อมูลไปยัง database

---

### Scenario 5: Unsaved Changes Warning

#### Steps:

1. แก้ไขข้อมูลใดๆ
2. คลิกปุ่ม "ยกเลิก" หรือ "กลับ"

#### Expected Results:

- ✅ แสดง confirm dialog "คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการยกเลิกหรือไม่?"
- ✅ ถ้ากด OK → กลับไปหน้า settings
- ✅ ถ้ากด Cancel → อยู่ที่หน้าเดิม

---

### Scenario 6: Reset to Original Values

#### Steps:

1. แก้ไขข้อมูลหลายๆ field
2. คลิกปุ่ม "รีเซ็ต"

#### Expected Results:

- ✅ แสดง confirm dialog "ต้องการรีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นหรือไม่?"
- ✅ ถ้ากด OK → ข้อมูลกลับเป็นค่าเดิม (ก่อนแก้ไข)
- ✅ ปุ่ม "บันทึก" กลับเป็น disabled

---

### Scenario 7: Character Count (Meta Fields)

#### Steps:

1. พิมพ์ข้อความใน "Meta Title"
2. สังเกต character counter

#### Expected Results:

- ✅ แสดง "X/60 ตัวอักษร" ด้านล่าง field
- ✅ อัพเดท real-time ตามที่พิมพ์
- ✅ ไม่ให้พิมพ์เกิน 60 ตัวอักษร

#### Repeat for:

- Meta Description (160 ตัวอักษร)

---

### Scenario 8: Maintenance Mode Toggle

#### Steps:

1. คลิก checkbox "เปิดใช้งานโหมดปิดปรับปรุง"
2. บันทึกการเปลี่ยนแปลง

#### Expected Results:

- ✅ Checkbox เปลี่ยนสถานะ
- ✅ บันทึกค่า "true" ใน database
- ✅ แสดง toast notification

#### Verify in Database:

```sql
SELECT setting_value
FROM system_settings
WHERE setting_key = 'maintenance_mode'
  AND category = 'general';
-- Expected: "true"
```

---

### Scenario 9: Error Handling - Network Error

#### Steps:

1. ปิด internet connection (หรือ stop dev server)
2. แก้ไขข้อมูล
3. คลิกบันทึก

#### Expected Results:

- ✅ แสดง error toast "ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง"
- ✅ ข้อมูลไม่ถูกบันทึก
- ✅ Form ยังคงมีข้อมูลที่แก้ไข (ไม่หาย)

---

### Scenario 10: Refresh After Save

#### Steps:

1. แก้ไขและบันทึกข้อมูล
2. Refresh หน้า (F5)

#### Expected Results:

- ✅ โหลดข้อมูลใหม่จาก database
- ✅ แสดงข้อมูลที่บันทึกไว้ล่าสุด
- ✅ ไม่มี error

---

## 🔍 Database Verification Queries

### Check All Settings

```sql
SELECT
  category,
  setting_key,
  setting_value,
  is_editable,
  is_public,
  updated_at
FROM system_settings
ORDER BY category, display_order;
```

### Check Audit Log

```sql
SELECT
  sal.setting_key,
  sal.category,
  sal.old_value,
  sal.new_value,
  u.email as changed_by_email,
  sal.changed_at
FROM settings_audit_log sal
LEFT JOIN users u ON u.id = sal.changed_by
ORDER BY sal.changed_at DESC
LIMIT 10;
```

### Check RLS Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('system_settings', 'settings_audit_log')
ORDER BY tablename, policyname;
```

### Test RPC Functions (as Admin)

```sql
-- Get all settings
SELECT * FROM get_system_settings();

-- Get categories
SELECT * FROM get_settings_categories();

-- Get settings by category
SELECT * FROM get_settings_by_category('general');
SELECT * FROM get_settings_by_category('seo');
```

---

## 🎨 UI/UX Checks

### Visual Design

- [ ] ปุ่มทั้งหมดมีขนาดอย่างน้อย 44x44px (touch-friendly)
- [ ] สีและ contrast ตามมาตรฐาน accessibility
- [ ] Loading states แสดงชัดเจน
- [ ] Error states แสดงสีแดงและ icon
- [ ] Success notifications แสดงสีเขียว

### Responsive Design

- [ ] ทำงานได้บน desktop (1920x1080)
- [ ] ทำงานได้บน tablet (768x1024)
- [ ] ทำงานได้บน mobile (375x667)

### Accessibility

- [ ] ใช้ keyboard navigation ได้ (Tab, Enter, Esc)
- [ ] Screen reader อ่านได้ถูกต้อง
- [ ] Focus states ชัดเจน
- [ ] ARIA labels ครบถ้วน

---

## 🐛 Known Issues

### None at this time

ระบบทำงานได้ตามที่คาดหวัง

---

## 📊 Performance Benchmarks

### Load Time

- ✅ Initial load: < 1s
- ✅ Settings fetch: < 500ms
- ✅ Save operation: < 1s

### Database Queries

- ✅ get_system_settings(): < 100ms
- ✅ update_setting(): < 200ms
- ✅ Audit log insert: < 50ms

---

## ✅ Test Results Template

```
Date: ___________
Tester: ___________
Environment: Production

Scenario 1: Load Settings          [ ] Pass [ ] Fail
Scenario 2: Edit and Save          [ ] Pass [ ] Fail
Scenario 3: Validation - Empty     [ ] Pass [ ] Fail
Scenario 4: Validation - Email     [ ] Pass [ ] Fail
Scenario 5: Unsaved Changes        [ ] Pass [ ] Fail
Scenario 6: Reset Values           [ ] Pass [ ] Fail
Scenario 7: Character Count        [ ] Pass [ ] Fail
Scenario 8: Maintenance Mode       [ ] Pass [ ] Fail
Scenario 9: Error Handling         [ ] Pass [ ] Fail
Scenario 10: Refresh After Save    [ ] Pass [ ] Fail

UI/UX Checks                       [ ] Pass [ ] Fail
Accessibility                      [ ] Pass [ ] Fail
Performance                        [ ] Pass [ ] Fail

Overall Status: [ ] PASS [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 Quick Test Commands

### Start Dev Server

```bash
npm run dev
```

### Check Database

```bash
# Via Supabase Dashboard
https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt

# Or via SQL Editor
```

### Check Logs

```bash
# Browser Console
# Network Tab
# Vue DevTools
```

---

## 📞 Support

หากพบปัญหา:

1. ตรวจสอบ browser console
2. ตรวจสอบ network tab
3. ตรวจสอบ database logs
4. ติดต่อ dev team

---

**Created**: 2026-01-19  
**Last Updated**: 2026-01-19  
**Status**: Ready for Testing
