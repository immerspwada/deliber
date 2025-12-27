# Admin Dashboard Setup Instructions

## ปัญหา: Dashboard ว่างเปล่า

สาเหตุ: ระบบยังใช้ Demo Mode session เก่าอยู่ ต้อง logout และ login ใหม่ด้วย Real Supabase Auth

## วิธีแก้ไข

### ขั้นตอนที่ 1: Clear Session เก่า

เปิด Browser DevTools (F12) → Console แล้วรัน:

```javascript
localStorage.removeItem('admin_v2_session');
localStorage.removeItem('admin_v2_token');
localStorage.removeItem('admin_v2_user');
location.reload();
```

### ขั้นตอนที่ 2: สร้าง Admin User ใน Supabase

1. ไปที่ Supabase Dashboard: https://supabase.com/dashboard/project/onsflqhkqhydeupiqyt

2. ไปที่ **Authentication** → **Users** → **Add User**
   - Email: your-admin@email.com
   - Password: your-secure-password
   - คลิก "Create User"

3. ไปที่ **SQL Editor** แล้วรัน:

```sql
-- เปลี่ยน email เป็นของคุณ
UPDATE users 
SET role = 'super_admin'
WHERE email = 'your-admin@email.com';

-- ตรวจสอบว่าอัพเดทสำเร็จ
SELECT id, email, role FROM users WHERE role IN ('admin', 'super_admin');
```

### ขั้นตอนที่ 3: Login ใหม่

1. ไปที่ http://localhost:5173/admin/login
2. ใส่ email และ password ที่สร้างในขั้นตอนที่ 2
3. Dashboard ควรแสดงข้อมูลได้แล้ว

## ตรวจสอบว่า Login สำเร็จ

เปิด Browser DevTools → Console ควรเห็น:
```
[Admin Auth] Attempting Supabase login for: your-admin@email.com
[Admin Auth] Supabase auth successful, checking admin role...
[Admin Auth] User role: super_admin
[Admin Auth] Login successful for admin: your-admin@email.com
```

## หมายเหตุ

- Demo Mode ถูกลบออกแล้ว - ต้องใช้ Real Supabase Auth เท่านั้น
- Admin user ต้องมี `role = 'admin'` หรือ `role = 'super_admin'` ใน users table
- RPC functions ต้องการ authenticated role จึงจะทำงานได้
