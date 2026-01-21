# 🚀 Apply Migration 302 ทันที - Production

## ปัญหาที่เจอ

หน้า Admin Providers แสดง error:

```
❌ column reference "id" is ambiguous
❌ operator does not exist: provider_status = text
```

## วิธีแก้ - Deploy ไป Production ตอนนี้เลย

### ขั้นตอนที่ 1: เปิด Supabase Dashboard

1. ไปที่: https://supabase.com/dashboard
2. เลือก project: **thai-ride-app**
3. คลิก **SQL Editor** ในเมนูซ้าย

### ขั้นตอนที่ 2: Copy SQL Migration

คัดลอกโค้ดด้านล่างนี้ทั้งหมด:

```sql
-- Fix Admin RPC Functions - Resolve ambiguous column references and type mismatches
-- ==================================================================================
-- Issue 1: Ambiguous "id" column reference in get_admin_providers_v2
-- Issue 2: Type mismatch when comparing provider_status enum with TEXT

-- Drop existing functions
DROP FUNCTION IF EXISTS get_admin_providers_v2(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_admin_providers_v2(TEXT, TEXT) CASCADE;

-- ================================================================
-- get_admin_providers_v2 - FIXED ambiguous column references
-- ================================================================
CREATE OR REPLACE FUNCTION get_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  provider_uid TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  provider_type TEXT,
  status TEXT,
  is_online BOOLEAN,
  is_available BOOLEAN,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating NUMERIC,
  total_trips INT,
  total_earnings NUMERIC,
  wallet_balance NUMERIC,
  documents_verified BOOLEAN,
  verification_notes TEXT,
  created_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  last_active_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_admin_id;

  -- Check if user exists and has admin role
  SELECT u.role INTO v_user_role
  FROM users u
  WHERE u.id = v_admin_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required. Current role: %', v_user_role;
  END IF;

  -- Return provider data with fully qualified column names
  RETURN QUERY
  SELECT
    pv.id,
    pv.user_id,
    pv.provider_uid,
    u.email,
    pv.first_name,
    pv.last_name,
    pv.phone_number,
    pv.provider_type,
    pv.status::TEXT,
    pv.is_online,
    pv.is_available,
    pv.current_lat,
    pv.current_lng,
    pv.rating,
    pv.total_trips,
    COALESCE(pv.total_earnings, 0) as total_earnings,
    COALESCE(w.balance, 0) as wallet_balance,
    pv.documents_verified,
    pv.verification_notes,
    pv.created_at,
    pv.approved_at,
    pv.approved_by,
    pv.last_active_at
  FROM providers_v2 pv
  LEFT JOIN users u ON pv.user_id = u.id
  LEFT JOIN wallets w ON pv.user_id = w.user_id
  WHERE
    (p_status IS NULL OR pv.status::TEXT = p_status)
    AND (p_provider_type IS NULL OR pv.provider_type = p_provider_type)
  ORDER BY pv.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ================================================================
-- count_admin_providers_v2 - FIXED type casting
-- ================================================================
CREATE OR REPLACE FUNCTION count_admin_providers_v2(
  p_status TEXT DEFAULT NULL,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_user_role TEXT;
  v_count INT;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_admin_id;

  -- Check if user exists and has admin role
  SELECT u.role INTO v_user_role
  FROM users u
  WHERE u.id = v_admin_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required. Current role: %', v_user_role;
  END IF;

  -- Count providers with proper type casting
  SELECT COUNT(*)::INT INTO v_count
  FROM providers_v2 pv
  WHERE
    (p_status IS NULL OR pv.status::TEXT = p_status)
    AND (p_provider_type IS NULL OR pv.provider_type = p_provider_type);

  RETURN v_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_providers_v2(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION count_admin_providers_v2(TEXT, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_admin_providers_v2 IS 'Get provider list with filters and pagination - Fixed ambiguous column references';
COMMENT ON FUNCTION count_admin_providers_v2 IS 'Count providers for pagination - Fixed type casting for enum comparison';
```

### ขั้นตอนที่ 3: Paste และ Run

1. Paste โค้ดลงใน SQL Editor
2. คลิกปุ่ม **Run** (หรือกด Cmd+Enter)
3. รอจนเห็นข้อความ **Success**

### ขั้นตอนที่ 4: ทดสอบ

1. Refresh หน้า Admin Providers: http://localhost:5173/admin/providers
2. ตรวจสอบว่าไม่มี error แล้ว
3. ลองกรองตาม status และ provider type

## ผลลัพธ์ที่คาดหวัง

✅ หน้า Admin Providers โหลดได้ปกติ  
✅ แสดงรายชื่อ providers  
✅ Pagination ทำงานได้  
✅ Filter ทำงานได้  
✅ ไม่มี error ใน console

## หากยังมีปัญหา

ตรวจสอบ:

1. User ที่ login มี role เป็น 'admin' หรือ 'super_admin'
2. ตรวจสอบ Console ใน Browser (F12)
3. ตรวจสอบ Logs ใน Supabase Dashboard

## Rollback (ถ้าจำเป็น)

หากต้องการย้อนกลับ ให้รัน migration 301 อีกครั้ง:

```bash
# ดูไฟล์: supabase/migrations/301_fix_admin_rpc_role_check.sql
```
