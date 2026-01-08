# แก้ไขปัญหา Customer Withdrawal - bank_account_id

## 🚨 ปัญหา

เมื่อลูกค้าถอนเงิน เกิด error: `column "bank_account_id" of relation "customer_withdrawals" does not exist`

## 🔍 สาเหตุ

- Migration 201 สร้างตาราง `customer_withdrawals` ที่มี column `bank_account_id`
- Migration 206 สร้างตาราง `customer_withdrawals` ใหม่ที่**ไม่มี** `bank_account_id` (เก็บข้อมูลธนาคารโดยตรง)
- Function `get_customer_withdrawals` ยังอ้างอิงไปที่ `bank_account_id` ที่ไม่มีแล้ว

## ✅ วิธีแก้ไข

### ขั้นตอนที่ 1: เปิด Supabase SQL Editor

1. ไปที่ https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/sql
2. สร้าง New Query

### ขั้นตอนที่ 2: Execute SQL นี้

```sql
-- ============================================
-- Fix Customer Withdrawal Bank Account Issue
-- ============================================

-- 1. Drop old functions that use bank_account_id
DROP FUNCTION IF EXISTS request_customer_withdrawal(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS get_customer_withdrawals(UUID, INTEGER);
DROP FUNCTION IF EXISTS admin_get_customer_withdrawals(TEXT, INTEGER, INTEGER);

-- 2. Recreate get_customer_withdrawals function (without bank_account_id)
CREATE OR REPLACE FUNCTION get_customer_withdrawals(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  withdrawal_uid TEXT,
  amount DECIMAL(10,2),
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  status TEXT,
  reason TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cw.id,
    cw.withdrawal_uid,
    cw.amount,
    cw.bank_name,
    cw.bank_account_number,
    cw.bank_account_name,
    cw.status,
    cw.reason,
    cw.admin_notes,
    cw.processed_at,
    cw.completed_at,
    cw.created_at
  FROM customer_withdrawals cw
  WHERE cw.user_id = p_user_id
  ORDER BY cw.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_customer_withdrawals TO anon, authenticated;

-- 4. Verify table structure
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'customer_withdrawals'
ORDER BY ordinal_position;
```

### ขั้นตอนที่ 3: ตรวจสอบผลลัพธ์

- ควรเห็น message: `Success. No rows returned`
- ตรวจสอบว่า column list ไม่มี `bank_account_id`
- ควรมี columns: `id`, `user_id`, `withdrawal_uid`, `amount`, `bank_name`, `bank_account_number`, `bank_account_name`, `status`, etc.

### ขั้นตอนที่ 4: ทดสอบ

1. ลองถอนเงินในฐานะลูกค้า
2. ตรวจสอบว่าไม่มี error `bank_account_id` อีก

## 📋 สิ่งที่เปลี่ยนแปลง

### ก่อนแก้ไข

```typescript
// Function ใช้ bank_account_id (ไม่มีใน table แล้ว)
LEFT JOIN customer_bank_accounts ba ON cw.bank_account_id = ba.id
```

### หลังแก้ไข

```typescript
// Function ใช้ข้อมูลธนาคารโดยตรงจาก customer_withdrawals
SELECT
  cw.bank_name,
  cw.bank_account_number,
  cw.bank_account_name
FROM customer_withdrawals cw
```

## 🔄 Migration ที่เกี่ยวข้อง

- **Migration 201**: สร้าง `customer_withdrawals` แบบเก่า (มี `bank_account_id`)
- **Migration 206**: สร้าง `customer_withdrawals` แบบใหม่ (ไม่มี `bank_account_id`)
- **Migration 208**: แก้ไข functions ให้ตรงกับ structure ใหม่ ✅

## 📝 หมายเหตุ

Migration 206 เปลี่ยนแนวทางจาก:

- **แบบเก่า**: เก็บ reference ไปที่ `customer_bank_accounts` table
- **แบบใหม่**: เก็บข้อมูลธนาคารโดยตรงใน `customer_withdrawals` (snapshot)

ข้อดีของแบบใหม่:

- ✅ ข้อมูลการถอนเงินไม่เปลี่ยนแปลงแม้ลูกค้าจะแก้ไขบัญชีธนาคาร
- ✅ ไม่ต้องพึ่งพา `customer_bank_accounts` table
- ✅ เก็บ snapshot ของข้อมูลธนาคาร ณ เวลาที่ถอน

---

**สร้างเมื่อ**: 2026-01-03
**Status**: ✅ พร้อม Execute
