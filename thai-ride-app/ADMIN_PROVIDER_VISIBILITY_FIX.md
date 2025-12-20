# Admin Provider Visibility Fix

## ปัญหา
customer@demo.com สมัครเป็น provider สำเร็จแล้ว แต่ไม่ปรากฏในหน้า `/admin/providers`

## สาเหตุที่เป็นไปได้

### 1. RLS Policy Issues
- RLS policies อาจบล็อกการ query จาก Admin
- Join กับตาราง `users` อาจถูก RLS บล็อก

### 2. Query Performance
- Direct query อาจช้าหรือ timeout
- ไม่มี index ที่เหมาะสม

### 3. Data Consistency
- Default values ไม่ถูกต้อง (status, is_verified)
- User data ไม่ถูก join มาด้วย

## การแก้ไข

### 1. Migration: `100_fix_admin_provider_visibility.sql`

#### เพิ่ม Indexes
```sql
CREATE INDEX idx_service_providers_status ON service_providers(status);
CREATE INDEX idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX idx_service_providers_provider_type ON service_providers(provider_type);
CREATE INDEX idx_service_providers_created_at ON service_providers(created_at DESC);
```

#### แก้ไข Default Values
```sql
ALTER TABLE service_providers 
  ALTER COLUMN status SET DEFAULT 'pending';
  
ALTER TABLE service_providers 
  ALTER COLUMN is_verified SET DEFAULT false;
```

#### สร้าง RPC Functions (Bypass RLS)
```sql
-- get_all_providers_for_admin: ดึงข้อมูล providers พร้อม user data
-- count_providers_for_admin: นับจำนวน providers
```

### 2. อัพเดท `useAdmin.ts`

#### ใช้ RPC Function แทน Direct Query
```typescript
// ลำดับการ query:
1. ลอง RPC function (get_all_providers_for_admin) - bypass RLS
2. ถ้าล้มเหลว ลอง direct query with join
3. ถ้ายังล้มเหลว ลอง query แยก (providers + users)
```

#### เพิ่ม Logging
- Log ทุก step ของการ query
- แสดงข้อมูล error ที่ชัดเจน
- Debug mode สำหรับ development

## วิธีทดสอบ

### 1. ตรวจสอบว่า customer@demo.com สมัครแล้ว
```sql
-- Run: thai-ride-app/debug-provider-check.sql
SELECT sp.*, u.email
FROM service_providers sp
LEFT JOIN users u ON sp.user_id = u.id
WHERE u.email = 'customer@demo.com';
```

### 2. ทดสอบ RPC Function
```sql
SELECT * FROM get_all_providers_for_admin(
  p_status := 'pending',
  p_provider_type := NULL,
  p_limit := 50,
  p_offset := 0
);
```

### 3. ทดสอบใน Admin Dashboard
1. Login ที่ `/admin/login` (admin@demo.com / admin1234)
2. ไปที่ `/admin/providers`
3. ตรวจสอบว่าเห็น customer@demo.com ในรายการ pending
4. ดู Console logs สำหรับ debug info

## Expected Results

### ก่อนแก้ไข
- ❌ Admin ไม่เห็น customer@demo.com ใน providers list
- ❌ Query อาจ error หรือ return empty array
- ❌ ไม่มี error message ที่ชัดเจน

### หลังแก้ไข
- ✅ Admin เห็น customer@demo.com ใน pending providers
- ✅ Query ใช้ RPC function (เร็วกว่า, bypass RLS)
- ✅ มี fallback mechanism หลายระดับ
- ✅ มี logging ที่ชัดเจนสำหรับ debugging

## Rollback Plan

ถ้าเกิดปัญหา สามารถ rollback ได้โดย:

```sql
-- 1. Drop RPC functions
DROP FUNCTION IF EXISTS get_all_providers_for_admin;
DROP FUNCTION IF EXISTS count_providers_for_admin;

-- 2. Revert RLS policies
DROP POLICY IF EXISTS "Admin full access to service_providers" ON service_providers;
DROP POLICY IF EXISTS "Providers can manage own profile" ON service_providers;
DROP POLICY IF EXISTS "Users can view available providers" ON service_providers;

-- 3. Restore old policy
CREATE POLICY "Allow all service_providers" ON service_providers 
  FOR ALL USING (true) WITH CHECK (true);
```

## Next Steps

### 1. ตรวจสอบ Provider Registration Flow
- ✅ Customer สามารถสมัครเป็น provider ได้
- ⏳ Admin เห็น provider ใหม่ทันที
- ⏳ Notification ส่งถึง admin เมื่อมี provider ใหม่

### 2. ปรับปรุง Admin Dashboard
- เพิ่ม real-time updates เมื่อมี provider ใหม่
- เพิ่ม filter และ search ที่ดีขึ้น
- เพิ่ม bulk actions (อนุมัติหลายรายการพร้อมกัน)

### 3. เพิ่ม Monitoring
- Track provider registration rate
- Alert เมื่อมี pending providers นานเกิน 24 ชม.
- Dashboard สำหรับ provider verification metrics

## Related Files

- `thai-ride-app/supabase/migrations/100_fix_admin_provider_visibility.sql` - Migration
- `thai-ride-app/src/composables/useAdmin.ts` - Admin composable
- `thai-ride-app/src/views/AdminProvidersView.vue` - Admin UI
- `thai-ride-app/src/composables/useRoleSwitch.ts` - Provider registration
- `thai-ride-app/debug-provider-check.sql` - Debug queries

## References

- Feature: F14 - Provider Dashboard
- Feature: F23 - Admin Dashboard
- Migration: 057_provider_verification_workflow.sql
- Migration: 095_upgrade_customer_to_provider.sql
