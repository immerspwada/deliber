# 🚀 Quick Start - Production Deployment Fixes

## สรุปปัญหา

### ปัญหา 1: Order Reassignment ไม่ทำงานใน Production

- **Error:** `Could not find the function public.get_available_providers`
- **สาเหตุ:** Migration 306 ยังไม่ได้ deploy ไป production
- **ผลกระทบ:** ไม่สามารถย้ายงานให้ไรเดอร์คนอื่นได้

### ปัญหา 2: Customer Suspension ไม่มีปุ่มใน Local

- **สาเหตุ:** Migrations 308-309 ยังไม่ได้ apply ใน local
- **ผลกระทบ:** ไม่เห็นปุ่มระงับลูกค้า

### ปัญหา 3: Docker ไม่ได้เปิด

- **Error:** `Cannot connect to the Docker daemon`
- **ผลกระทบ:** ไม่สามารถ apply migrations ได้

---

## 🎯 แก้ไขทันที (5 นาที)

### ขั้นตอนที่ 1: เปิด Docker

```bash
# เปิด Docker Desktop
open -a Docker

# รอ 10-30 วินาที แล้วตรวจสอบ
docker ps
```

### ขั้นตอนที่ 2: Start Supabase Local

```bash
# Start Supabase
npx supabase start

# ตรวจสอบสถานะ
npx supabase status
```

### ขั้นตอนที่ 3: Apply Migrations (Local)

```bash
# Apply migrations 308-309
npx supabase db push --local

# Generate types
npx supabase gen types --local > src/types/database.ts

# Restart dev server
npm run dev
```

### ขั้นตอนที่ 4: ทดสอบ Local

```bash
# เปิดเบราว์เซอร์
open http://localhost:5173/admin/customers
```

**ตรวจสอบ:**

- ✅ เห็นปุ่มระงับ (🚫) ในตาราง
- ✅ คลิกปุ่มระงับ → modal เปิด
- ✅ กรอกเหตุผล → ยืนยัน → สถานะเปลี่ยน

---

## 🌐 Deploy ไป Production (10 นาที)

### ขั้นตอนที่ 5: Link to Production

```bash
# Link to production project
npx supabase link --project-ref onsflqhkgqhydeupiqyt

# ใส่ database password เมื่อถูกถาม
```

### ขั้นตอนที่ 6: Deploy Migrations

```bash
# Deploy migrations 306, 308, 309
npx supabase db push

# ตรวจสอบว่า apply สำเร็จ
npx supabase migration list
```

### ขั้นตอนที่ 7: Verify Production

```bash
# เปิด Supabase Dashboard
open https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/editor

# รัน SQL เพื่อตรวจสอบ
```

**SQL Verification:**

```sql
-- ตรวจสอบ functions
SELECT proname FROM pg_proc WHERE proname IN (
  'reassign_order',
  'get_available_providers',
  'get_reassignment_history',
  'suspend_customer_account',
  'unsuspend_customer_account'
);
-- ควรได้ 5 rows

-- ตรวจสอบ tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('order_reassignments');
-- ควรได้ 1 row

-- ตรวจสอบ columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'status';
-- ควรได้ 1 row

-- ทดสอบ functions
SELECT * FROM get_available_providers('ride', 5);
SELECT * FROM get_admin_customers(NULL, NULL, 5, 0);
```

### ขั้นตอนที่ 8: Test Production

```bash
# เปิด production admin panel
open https://YOUR_PRODUCTION_URL/admin/orders
```

**ทดสอบ Order Reassignment:**

1. หา order ที่มี provider
2. คลิกปุ่มย้ายงาน (🔄)
3. เลือก provider ใหม่
4. ยืนยัน
5. ตรวจสอบว่า order อัปเดต

**ทดสอบ Customer Suspension:**

1. ไป `/admin/customers`
2. คลิกปุ่มระงับ (🚫)
3. กรอกเหตุผล
4. ยืนยัน
5. ตรวจสอบว่าสถานะเปลี่ยน

---

## 📋 Checklist

### Local Environment

- [ ] Docker running
- [ ] Supabase local running
- [ ] Migrations 308-309 applied
- [ ] Types generated
- [ ] Dev server restarted
- [ ] Suspend button visible
- [ ] Suspend/unsuspend works

### Production Environment

- [ ] Linked to production
- [ ] Migration 306 applied
- [ ] Migrations 308-309 applied
- [ ] All functions exist
- [ ] Order reassignment works
- [ ] Customer suspension works
- [ ] No errors in logs

---

## 🔍 Troubleshooting

### Docker ไม่เปิด

```bash
# ตรวจสอบว่า Docker Desktop ติดตั้งแล้ว
which docker

# ถ้ายังไม่มี ให้ติดตั้ง
brew install --cask docker
```

### Supabase ไม่ start

```bash
# ลอง reset
npx supabase stop
npx supabase start

# ดู logs
npx supabase logs --local
```

### Migration ไม่ apply

```bash
# ตรวจสอบ migration files
ls -la supabase/migrations/

# ดู diff
npx supabase db diff --local

# Force push
npx supabase db push --local --include-all
```

### Function ไม่เจอใน Production

```bash
# ตรวจสอบว่า migration apply แล้ว
npx supabase migration list

# ถ้ายังไม่ apply ให้ push อีกครั้ง
npx supabase db push
```

### RLS Policy Error

```sql
-- ตรวจสอบ policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- ตรวจสอบ admin role
SELECT id, email, role FROM profiles WHERE email = 'your-admin@email.com';

-- ถ้า role ไม่ใช่ admin ให้แก้ไข
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

---

## 📊 Verification Queries

### ตรวจสอบ Order Reassignments

```sql
-- ดู history
SELECT * FROM order_reassignments
ORDER BY created_at DESC LIMIT 10;

-- นับจำนวน
SELECT COUNT(*) FROM order_reassignments;

-- ดู admin ที่ใช้งาน
SELECT
  p.full_name,
  COUNT(*) as total_reassignments
FROM order_reassignments r
JOIN profiles p ON p.id = r.reassigned_by
GROUP BY p.full_name;
```

### ตรวจสอบ Customer Suspensions

```sql
-- ดูลูกค้าที่ถูกระงับ
SELECT
  id,
  full_name,
  email,
  status,
  suspension_reason,
  suspended_at
FROM profiles
WHERE status = 'suspended'
ORDER BY suspended_at DESC;

-- นับจำนวน
SELECT
  status,
  COUNT(*) as total
FROM profiles
WHERE role = 'customer'
GROUP BY status;
```

---

## 🎯 Expected Results

### Local

- ✅ ปุ่มระงับแสดงที่ http://localhost:5173/admin/customers
- ✅ Modal ระงับทำงาน
- ✅ สถานะอัปเดตทันที
- ✅ RLS policies ทำงาน

### Production

- ✅ ปุ่มย้ายงานทำงานที่ `/admin/orders`
- ✅ Modal แสดง provider list
- ✅ ย้ายงานสำเร็จ
- ✅ Audit trail บันทึก
- ✅ ปุ่มระงับทำงานที่ `/admin/customers`

---

## 📞 Support

### Logs

```bash
# Supabase logs
npx supabase logs --local

# Browser console
# เปิด DevTools → Console

# Network tab
# เปิด DevTools → Network
```

### Dashboard

- Local: http://localhost:54323
- Production: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt

### Documentation

- `.kiro/specs/admin-order-reassignment/`
- `.kiro/specs/admin-customer-suspension/`
- `.kiro/specs/production-deployment-fixes/`

---

## ⏱️ Timeline

| Task                   | Time       | Status |
| ---------------------- | ---------- | ------ |
| Start Docker           | 1 min      | ⏳     |
| Start Supabase         | 2 min      | ⏳     |
| Apply local migrations | 2 min      | ⏳     |
| Test locally           | 5 min      | ⏳     |
| Link to production     | 1 min      | ⏳     |
| Deploy migrations      | 3 min      | ⏳     |
| Test production        | 10 min     | ⏳     |
| **Total**              | **24 min** |        |

---

## ✅ Success Criteria

เมื่อทำสำเร็จจะได้:

1. **Local:**
   - ปุ่มระงับแสดงและทำงาน
   - สามารถระงับ/ปลดระงับลูกค้าได้
   - RLS policies ป้องกันลูกค้าที่ถูกระงับ

2. **Production:**
   - ปุ่มย้ายงานทำงาน
   - สามารถย้ายงานให้ไรเดอร์คนอื่นได้
   - Audit trail บันทึกครบถ้วน
   - ปุ่มระงับทำงาน

3. **System:**
   - ไม่มี errors ใน logs
   - Performance ดี
   - Security policies ทำงาน
   - Audit trail ครบถ้วน
