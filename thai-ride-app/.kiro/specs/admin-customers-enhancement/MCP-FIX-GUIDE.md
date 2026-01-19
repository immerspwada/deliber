# 🔌 MCP Production Fix Guide

## ปัญหา
Admin user ไม่สามารถเข้าถึง `/admin/customers` ได้ เนื่องจาก:
- Migration 314 ยังไม่ได้ apply ไปที่ production database
- Function `admin_get_customers` ตรวจสอบ admin role แล้วไม่ผ่าน

## วิธีแก้ (ใช้ MCP)

### ขั้นตอนที่ 1: เปิด Supabase SQL Editor
```
https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/sql/new
```

### ขั้นตอนที่ 2: รัน MCP Fix Script
1. เปิดไฟล์: `.kiro/specs/admin-customers-enhancement/MCP-PRODUCTION-FIX.sql`
2. Copy ทั้งหมด
3. Paste ใน SQL Editor
4. กด **"Run"**

### ขั้นตอนที่ 3: ตรวจสอบผลลัพธ์
Script จะแสดงผลลัพธ์:
```
============================================
✅ VERIFICATION RESULTS
============================================
1. Admin User:
   Email: superadmin@gobear.app
   Role: admin
2. Function: ✅ EXISTS
3. Function Test: ✅ SUCCESS (X customers found)

============================================
🎉 FIX COMPLETE!
============================================
```

### ขั้นตอนที่ 4: ทดสอบ
Refresh browser: http://localhost:5173/admin/customers

## สิ่งที่ Script ทำ

### 1. ตรวจสอบสถานะปัจจุบัน
- ✅ ตรวจสอบว่า profiles table มีหรือไม่
- ✅ ตรวจสอบว่า users table มีหรือไม่
- ✅ นับจำนวน admin users

### 2. แก้ไข Admin User Role
```sql
-- Ensure admin user has role = 'admin' in profiles
INSERT INTO profiles (id, email, role, ...)
SELECT ... FROM auth.users
WHERE email = 'superadmin@gobear.app'
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### 3. สร้าง/อัพเดท Functions
- ✅ `admin_get_customers` - ดึงรายชื่อ customers
- ✅ `admin_suspend_customer` - ระงับ customer
- ✅ `admin_unsuspend_customer` - ยกเลิกการระงับ
- ✅ `admin_bulk_suspend_customers` - ระงับหลาย customers

### 4. ตรวจสอบอัตโนมัติ
- ✅ ตรวจสอบ admin user มี role ถูกต้อง
- ✅ ตรวจสอบ functions ถูกสร้างแล้ว
- ✅ ทดสอบเรียก function จริง

## คุณสมบัติของ Functions

### Security Features
- ✅ `SECURITY DEFINER` - รันด้วย permissions ของ function owner
- ✅ `SET search_path = public` - ป้องกัน schema injection
- ✅ Dual-role check - ตรวจสอบทั้ง profiles และ users table
- ✅ Explicit error messages - แสดง error ที่ชัดเจน

### Performance Optimizations
- ✅ ใช้ `SELECT EXISTS` แทน `COUNT(*)`
- ✅ ใช้ `COALESCE` สำหรับ default values
- ✅ Index-friendly queries

## Troubleshooting

### ถ้ายังเจอ error "Unauthorized"
1. ตรวจสอบ admin user:
```sql
SELECT id, email, role FROM profiles 
WHERE email = 'superadmin@gobear.app';
```

2. ตรวจสอบ current user:
```sql
SELECT auth.uid(), auth.email();
```

3. ทดสอบ function โดยตรง:
```sql
SELECT * FROM admin_get_customers(NULL, NULL, 10, 0);
```

### ถ้า function ไม่ทำงาน
1. ตรวจสอบว่า function มีอยู่:
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'admin_get_customers';
```

2. ตรวจสอบ permissions:
```sql
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'admin_get_customers';
```

## Rollback (ถ้าจำเป็น)

```sql
-- ลบ functions
DROP FUNCTION IF EXISTS admin_get_customers(TEXT, TEXT[], INTEGER, INTEGER);
DROP FUNCTION IF EXISTS admin_suspend_customer(UUID, TEXT);
DROP FUNCTION IF EXISTS admin_unsuspend_customer(UUID);
DROP FUNCTION IF EXISTS admin_bulk_suspend_customers(UUID[], TEXT);

-- Reset admin role (ถ้าต้องการ)
UPDATE profiles 
SET role = 'customer' 
WHERE email = 'superadmin@gobear.app';
```

## เวลาที่ใช้
- ⏱️ รัน script: ~5 วินาที
- ⏱️ Verification: ~2 วินาที
- ⏱️ รวม: ~7 วินาที

## Downtime
- ✅ Zero downtime
- ✅ Atomic operations
- ✅ Safe to run in production

## Next Steps
1. ✅ ทดสอบ admin customers page
2. ✅ ทดสอบ customer suspension features
3. ✅ ตรวจสอบ logs สำหรับ errors
4. ✅ Monitor performance

---

**สร้างโดย**: MCP Automation System  
**วันที่**: 2026-01-19  
**Status**: ✅ Ready for Production
