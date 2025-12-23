# Debug Verification Queue

## ขั้นตอนการแก้ไข

### 1. เปิด Browser Console
กด F12 หรือ Cmd+Option+I แล้วดูที่ Console tab

### 2. Refresh หน้า /admin/verification-queue
ดู console logs:
- `[VerificationQueue] Loading queue...`
- `[VerificationQueue] Result:` - ดูว่าได้ข้อมูลอะไรกลับมา
- ถ้ามี error จะแสดงที่นี่

### 3. ตรวจสอบใน Supabase Dashboard

ไปที่ SQL Editor และ run:

```sql
-- ตรวจสอบว่ามี pending providers
SELECT COUNT(*) FROM service_providers WHERE status = 'pending';

-- ดูรายละเอียด
SELECT 
  sp.*,
  u.email,
  u.first_name,
  u.last_name
FROM service_providers sp
LEFT JOIN users u ON sp.user_id = u.id
WHERE sp.status = 'pending';
```

### 4. ถ้าไม่มี pending providers - สร้างทดสอบ

```sql
-- สร้าง test pending provider
INSERT INTO service_providers (
  user_id,
  provider_type,
  status
)
SELECT 
  id,
  'driver',
  'pending'
FROM users
WHERE email = 'customer@demo.com'
LIMIT 1;
```

### 5. ตรวจสอบ RPC Functions

```sql
-- ดูว่ามี functions อะไรบ้าง
SELECT proname FROM pg_proc 
WHERE proname LIKE '%verification%' 
OR proname LIKE '%pending%provider%';

-- ทดสอบเรียก function
SELECT * FROM admin_get_pending_providers();
```

### 6. ถ้า RPC ไม่มี - Run Migration 166

```bash
# ใน terminal
cd thai-ride-app
supabase db push
```

หรือ copy SQL จาก `supabase/migrations/166_fix_verification_queue_complete.sql` 
ไป run ใน Supabase SQL Editor

### 7. Common Issues

**Issue: "function does not exist"**
- Run migration 166
- Grant permissions:
```sql
GRANT EXECUTE ON FUNCTION admin_get_pending_providers() TO authenticated;
```

**Issue: "permission denied"**
- ตรวจสอบว่า login ด้วย admin@demo.com
- ตรวจสอบ RLS policies

**Issue: "empty array returned"**
- ไม่มี pending providers จริงๆ
- สร้าง test provider ตามขั้นตอนที่ 4

### 8. Quick Fix - ใช้ Providers View แทน

ถ้ายังไม่ได้ ให้ไปที่:
`/admin/providers` แล้วกรองด้วย status = "pending"
