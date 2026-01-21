# 🚀 Deploy Migration 306 via Supabase Dashboard

## ปัญหา

Error: `Could not find the function public.get_available_providers`

## สาเหตุ

Migration 306 ยังไม่ได้ deploy ไป production

## วิธีแก้ไข (5 นาที)

### Step 1: เปิด Supabase SQL Editor

```
https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/editor
```

### Step 2: คัดลอก Migration 306

เปิดไฟล์: `supabase/migrations/306_admin_order_reassignment_system.sql`

หรือคัดลอกจากด้านล่าง:

```sql
-- =====================================================
-- Migration: 306_admin_order_reassignment_system.sql
-- Description: Admin Order Reassignment System with Audit Trail
-- =====================================================

BEGIN;

-- 1. Create order_reassignments audit table
CREATE TABLE IF NOT EXISTS public.order_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry')),
  old_provider_id UUID,
  new_provider_id UUID NOT NULL,
  reassigned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_order_reassignments_order ON public.order_reassignments(order_id, order_type);
CREATE INDEX idx_order_reassignments_provider ON public.order_reassignments(new_provider_id);
CREATE INDEX idx_order_reassignments_admin ON public.order_reassignments(reassigned_by, created_at DESC);

-- RLS policies
ALTER TABLE public.order_reassignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_reassignments" ON public.order_reassignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 2. Create reassign_order function
CREATE OR REPLACE FUNCTION public.reassign_order(
  p_order_id UUID,
  p_order_type VARCHAR(20),
  p_new_provider_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_old_provider_id UUID;
  v_order_status TEXT;
  v_table_name TEXT;
  v_provider_exists BOOLEAN;
  v_provider_status TEXT;
  v_result JSON;
BEGIN
  v_admin_id := auth.uid();

  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = v_admin_id;

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can reassign orders';
  END IF;

  IF p_order_type NOT IN ('ride', 'delivery', 'shopping', 'queue', 'moving', 'laundry') THEN
    RAISE EXCEPTION 'Invalid order type: %', p_order_type;
  END IF;

  v_table_name := CASE p_order_type
    WHEN 'ride' THEN 'ride_requests'
    WHEN 'delivery' THEN 'delivery_requests'
    WHEN 'shopping' THEN 'shopping_requests'
    WHEN 'queue' THEN 'queue_requests'
    WHEN 'moving' THEN 'moving_requests'
    WHEN 'laundry' THEN 'laundry_requests'
  END;

  SELECT
    EXISTS(SELECT 1 FROM public.providers_v2 WHERE id = p_new_provider_id),
    (SELECT status FROM public.providers_v2 WHERE id = p_new_provider_id)
  INTO v_provider_exists, v_provider_status;

  IF NOT v_provider_exists THEN
    RAISE EXCEPTION 'Provider not found: %', p_new_provider_id;
  END IF;

  IF v_provider_status != 'approved' THEN
    RAISE EXCEPTION 'Provider is not approved. Status: %', v_provider_status;
  END IF;

  EXECUTE format(
    'SELECT provider_id, status FROM %I WHERE id = $1',
    v_table_name
  ) USING p_order_id
  INTO v_old_provider_id, v_order_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: % in table %', p_order_id, v_table_name;
  END IF;

  IF v_order_status IN ('completed', 'cancelled', 'delivered') THEN
    RAISE EXCEPTION 'Cannot reassign % orders. Current status: %', v_order_status, v_order_status;
  END IF;

  IF v_old_provider_id = p_new_provider_id THEN
    RAISE EXCEPTION 'Order is already assigned to this provider';
  END IF;

  EXECUTE format(
    'UPDATE %I SET provider_id = $1, updated_at = NOW() WHERE id = $2',
    v_table_name
  ) USING p_new_provider_id, p_order_id;

  INSERT INTO public.order_reassignments (
    order_id,
    order_type,
    old_provider_id,
    new_provider_id,
    reassigned_by,
    reason,
    notes
  ) VALUES (
    p_order_id,
    p_order_type,
    v_old_provider_id,
    p_new_provider_id,
    v_admin_id,
    p_reason,
    p_notes
  );

  v_result := json_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_type', p_order_type,
    'old_provider_id', v_old_provider_id,
    'new_provider_id', p_new_provider_id,
    'reassigned_by', v_admin_id,
    'reassigned_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reassign_order TO authenticated;

-- 3. Create get_reassignment_history function
CREATE OR REPLACE FUNCTION public.get_reassignment_history(
  p_order_id UUID DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  order_type VARCHAR(20),
  old_provider_id UUID,
  old_provider_name TEXT,
  new_provider_id UUID,
  new_provider_name TEXT,
  reassigned_by UUID,
  admin_name TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view reassignment history';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.order_id,
    r.order_type,
    r.old_provider_id,
    COALESCE(old_p.full_name, old_p.first_name || ' ' || old_p.last_name) as old_provider_name,
    r.new_provider_id,
    COALESCE(new_p.full_name, new_p.first_name || ' ' || new_p.last_name) as new_provider_name,
    r.reassigned_by,
    COALESCE(admin.full_name, admin.first_name || ' ' || admin.last_name) as admin_name,
    r.reason,
    r.notes,
    r.created_at
  FROM public.order_reassignments r
  LEFT JOIN public.providers_v2 old_p ON old_p.id = r.old_provider_id
  LEFT JOIN public.providers_v2 new_p ON new_p.id = r.new_provider_id
  LEFT JOIN public.profiles admin ON admin.id = r.reassigned_by
  WHERE
    (p_order_id IS NULL OR r.order_id = p_order_id)
    AND (p_provider_id IS NULL OR r.new_provider_id = p_provider_id OR r.old_provider_id = p_provider_id)
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reassignment_history TO authenticated;

-- 4. Create get_available_providers function
CREATE OR REPLACE FUNCTION public.get_available_providers(
  p_service_type VARCHAR(20) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  rating DECIMAL(3,2),
  total_jobs INTEGER,
  status VARCHAR(20),
  is_online BOOLEAN,
  current_location JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can view available providers';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.full_name, p.first_name || ' ' || p.last_name) as full_name,
    p.phone,
    p.vehicle_type,
    p.vehicle_plate,
    p.rating,
    p.total_jobs,
    p.status,
    p.is_online,
    jsonb_build_object(
      'lat', p.current_lat,
      'lng', p.current_lng,
      'updated_at', p.location_updated_at
    ) as current_location
  FROM public.providers_v2 p
  WHERE
    p.status = 'approved'
    AND (p_service_type IS NULL OR p.service_type = p_service_type)
  ORDER BY
    p.is_online DESC,
    p.rating DESC NULLS LAST,
    p.total_jobs DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_providers TO authenticated;

COMMIT;
```

### Step 3: รัน SQL

1. วาง SQL ทั้งหมดใน SQL Editor
2. คลิก "Run" (หรือกด Ctrl+Enter)
3. รอจนเสร็จ (ประมาณ 2-3 วินาที)

### Step 4: ตรวจสอบว่าสำเร็จ

รัน SQL นี้เพื่อตรวจสอบ:

```sql
-- ตรวจสอบ table
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_name = 'order_reassignments';
-- ควรได้ 1

-- ตรวจสอบ functions
SELECT proname
FROM pg_proc
WHERE proname IN (
  'reassign_order',
  'get_available_providers',
  'get_reassignment_history'
);
-- ควรได้ 3 rows

-- ทดสอบ function
SELECT * FROM get_available_providers('ride', 5);
-- ควรได้ list ของ providers
```

### Step 5: ทดสอบใน Production

1. เปิด https://YOUR_DOMAIN/admin/orders
2. คลิกปุ่มย้ายงาน (🔄) บน order ที่มี provider
3. ควรเห็น modal แสดง provider list
4. เลือก provider ใหม่
5. กรอกเหตุผล (optional)
6. คลิก "ยืนยันการย้ายงาน"
7. ควรเห็นข้อความ "ย้ายงานสำเร็จ"

## ✅ Success Criteria

- ✅ Table `order_reassignments` ถูกสร้าง
- ✅ Function `get_available_providers()` ทำงาน
- ✅ Function `reassign_order()` ทำงาน
- ✅ Function `get_reassignment_history()` ทำงาน
- ✅ Modal เปิดและแสดง provider list
- ✅ ย้ายงานสำเร็จ
- ✅ Audit trail บันทึกถูกต้อง

## 🔍 Troubleshooting

### ถ้ายังมี error "function not found"

1. รอ 1-2 นาที (PostgREST cache)
2. Refresh หน้าเว็บ (Ctrl+Shift+R)
3. ลอง logout/login ใหม่

### ถ้า SQL มี error

1. ตรวจสอบว่า table `profiles` มี column `role`
2. ตรวจสอบว่า table `providers_v2` มีอยู่
3. ดู error message ใน SQL Editor

### ถ้า permission denied

1. ตรวจสอบว่า login เป็น admin
2. รัน: `SELECT role FROM profiles WHERE id = auth.uid();`
3. ถ้าไม่ใช่ 'admin' ให้แก้ไข: `UPDATE profiles SET role = 'admin' WHERE id = auth.uid();`

## 📝 Notes

- Migration นี้ปลอดภัย (ไม่แก้ไขข้อมูลเดิม)
- ใช้ `IF NOT EXISTS` เพื่อป้องกัน error ถ้ารันซ้ำ
- RLS policies ป้องกันให้เฉพาะ admin เข้าถึง
- Audit trail บันทึกทุกการย้ายงาน

## 🎯 Expected Result

หลัง deploy เสร็จ:

- ปุ่มย้ายงานทำงานได้
- Modal แสดง provider list
- สามารถเลือก provider และย้ายงานได้
- ไม่มี error "function not found" อีกต่อไป
