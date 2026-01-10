# 🚀 Wallet System - Quick Start Guide

## ปัญหาที่พบ

จาก console logs:

```
[WalletView] Balance: ฿0.00
[WalletView] Transactions: 0
```

**สาเหตุ:** User ยังไม่มีข้อมูล wallet และ transactions ในฐานข้อมูล

---

## ✅ วิธีแก้ไข (ใช้เวลา 1 นาที)

### Step 1: เปิด Supabase SQL Editor

1. ไปที่ https://supabase.com/dashboard
2. เลือก Project ของคุณ
3. คลิก **"SQL Editor"** ในเมนูซ้าย
4. คลิก **"New query"**

### Step 2: Copy & Paste Script

Copy ทั้งหมดจากไฟล์นี้:

```
scripts/quick-wallet-fix.sql
```

หรือ copy จากด้านล่าง:

<details>
<summary>📋 คลิกเพื่อดู Script (Copy ทั้งหมด)</summary>

```sql
-- =====================================================
-- Quick Wallet Fix - One-Click Solution
-- รันไฟล์นี้เพื่อแก้ไขปัญหา Wallet ทันที
-- =====================================================

-- STEP 1: Ensure Wallet Exists
DO $$
DECLARE
  v_user_id UUID;
  v_wallet_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ กรุณา Login ก่อนรันสคริปต์นี้';
  END IF;

  SELECT id INTO v_wallet_id
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_wallet_id IS NULL THEN
    INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
    VALUES (v_user_id, 0, 0, 0)
    RETURNING id INTO v_wallet_id;

    RAISE NOTICE '✅ สร้าง Wallet สำเร็จ: %', v_wallet_id;
  ELSE
    RAISE NOTICE '✅ Wallet มีอยู่แล้ว: %', v_wallet_id;
  END IF;
END $$;

-- STEP 2: Create Test Transactions
INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
SELECT auth.uid(), 'topup', 1000.00, 0.00, 1000.00, '💰 เติมเงินเริ่มต้น', 'completed', NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid() AND description = '💰 เติมเงินเริ่มต้น');

INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
SELECT auth.uid(), 'payment', -250.00, 1000.00, 750.00, '🚗 ชำระค่าบริการ Ride #12345', 'completed', NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid() AND description = '🚗 ชำระค่าบริการ Ride #12345');

INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
SELECT auth.uid(), 'topup', 500.00, 750.00, 1250.00, '💰 เติมเงินครั้งที่ 2', 'completed', NOW() - INTERVAL '3 days'
WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid() AND description = '💰 เติมเงินครั้งที่ 2');

INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
SELECT auth.uid(), 'cashback', 50.00, 1250.00, 1300.00, '🎁 เงินคืนจากโปรโมชั่น', 'completed', NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid() AND description = '🎁 เงินคืนจากโปรโมชั่น');

INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
SELECT auth.uid(), 'payment', -150.00, 1300.00, 1150.00, '🚗 ชำระค่าบริการ Ride #12346', 'completed', NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid() AND description = '🚗 ชำระค่าบริการ Ride #12346');

INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, status, created_at)
SELECT auth.uid(), 'referral', 100.00, 1150.00, 1250.00, '👥 โบนัสแนะนำเพื่อน', 'completed', NOW() - INTERVAL '12 hours'
WHERE NOT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = auth.uid() AND description = '👥 โบนัสแนะนำเพื่อน');

-- STEP 3: Update Wallet Balance
UPDATE user_wallets
SET balance = 1250.00, total_earned = 1650.00, total_spent = 400.00, updated_at = NOW()
WHERE user_id = auth.uid();

-- STEP 4: Create Topup Requests
INSERT INTO topup_requests (user_id, tracking_id, amount, payment_method, status, admin_note, created_at, updated_at)
SELECT auth.uid(), 'TOP-' || TO_CHAR(NOW() - INTERVAL '7 days', 'YYYYMMDDHH24MISS') || '-001', 1000.00, 'promptpay', 'approved', 'อนุมัติแล้ว - ตรวจสอบสลิปเรียบร้อย', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
WHERE NOT EXISTS (SELECT 1 FROM topup_requests WHERE user_id = auth.uid() AND amount = 1000.00 AND status = 'approved');

INSERT INTO topup_requests (user_id, tracking_id, amount, payment_method, status, created_at)
SELECT auth.uid(), 'TOP-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-002', 300.00, 'bank_transfer', 'pending', NOW() - INTERVAL '30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM topup_requests WHERE user_id = auth.uid() AND amount = 300.00 AND status = 'pending');

-- STEP 5: Verify Results
DO $$
DECLARE
  v_balance DECIMAL(12,2);
  v_total_earned DECIMAL(12,2);
  v_total_spent DECIMAL(12,2);
  v_txn_count INTEGER;
  v_topup_count INTEGER;
BEGIN
  SELECT balance, total_earned, total_spent INTO v_balance, v_total_earned, v_total_spent
  FROM user_wallets WHERE user_id = auth.uid();

  SELECT COUNT(*) INTO v_txn_count FROM wallet_transactions WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO v_topup_count FROM topup_requests WHERE user_id = auth.uid();

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '           ✅ WALLET FIX COMPLETED';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '💰 ยอดเงินคงเหลือ: ฿%', v_balance;
  RAISE NOTICE '📈 รายรับทั้งหมด: ฿%', v_total_earned;
  RAISE NOTICE '📉 รายจ่ายทั้งหมด: ฿%', v_total_spent;
  RAISE NOTICE '📝 จำนวนธุรกรรม: % รายการ', v_txn_count;
  RAISE NOTICE '💳 คำขอเติมเงิน: % รายการ', v_topup_count;
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '🎉 กรุณา Refresh หน้าเว็บ (Cmd+Shift+R)';
  RAISE NOTICE '================================================';
END $$;
```

</details>

### Step 3: Run Script

1. Paste script ลงใน SQL Editor
2. กด **"Run"** หรือกด `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)
3. รอ 2-3 วินาที

### Step 4: ตรวจสอบผลลัพธ์

ควรเห็น output แบบนี้:

```
✅ WALLET FIX COMPLETED
================================================
💰 ยอดเงินคงเหลือ: ฿1250.00
📈 รายรับทั้งหมด: ฿1650.00
📉 รายจ่ายทั้งหมด: ฿400.00
📝 จำนวนธุรกรรม: 6 รายการ
💳 คำขอเติมเงิน: 2 รายการ
================================================
🎉 กรุณา Refresh หน้าเว็บ (Cmd+Shift+R)
```

### Step 5: Refresh Browser

กด **`Cmd+Shift+R`** (Mac) หรือ **`Ctrl+Shift+R`** (Windows)

---

## ✅ ผลลัพธ์ที่ได้

หลังจาก refresh หน้าเว็บ คุณจะเห็น:

### หน้า Wallet

- 💰 **ยอดเงินคงเหลือ:** ฿1,250.00
- 📈 **รายรับทั้งหมด:** ฿1,650.00
- 📉 **รายจ่ายทั้งหมด:** ฿400.00

### Tab ประวัติ (6 รายการ)

1. 👥 โบนัสแนะนำเพื่อน +฿100.00
2. 🚗 ชำระค่าบริการ Ride #12346 -฿150.00
3. 🎁 เงินคืนจากโปรโมชั่น +฿50.00
4. 💰 เติมเงินครั้งที่ 2 +฿500.00
5. 🚗 ชำระค่าบริการ Ride #12345 -฿250.00
6. 💰 เติมเงินเริ่มต้น +฿1,000.00

### Tab เติมเงิน (2 รายการ)

1. ฿300.00 - รอดำเนินการ (Pending)
2. ฿1,000.00 - อนุมัติแล้ว (Approved)

---

## 🔧 Troubleshooting

### ปัญหา: "No authenticated user"

**แก้ไข:** กรุณา Login ก่อนรัน script

### ปัญหา: "Permission denied"

**แก้ไข:** ตรวจสอบว่า Login ด้วย user ที่ถูกต้อง

### ปัญหา: ข้อมูลยังไม่แสดง

**แก้ไข:**

1. Hard refresh: `Cmd+Shift+R` (Mac) หรือ `Ctrl+Shift+R` (Windows)
2. Clear cache และ refresh อีกครั้ง
3. ตรวจสอบ console logs มี error หรือไม่

### ปัญหา: Image upload error

**แก้ไข:** ปัญหานี้แก้ไขแล้วใน commit ล่าสุด กรุณา:

```bash
git pull
npm install
npm run dev
```

---

## 📚 เอกสารเพิ่มเติม

- **Complete Guide:** `WALLET_SYSTEM_COMPLETE_SUMMARY.md`
- **Optimization Details:** `WALLET_OPTIMIZATION_SUMMARY.md`
- **Troubleshooting:** `WALLET_DATA_FIX_GUIDE.md`
- **Verification Script:** `scripts/verify-wallet-system.sql`

---

## 🎯 Next Steps

หลังจากแก้ไขแล้ว คุณสามารถ:

1. ✅ ทดสอบเติมเงิน (Upload slip)
2. ✅ ทดสอบถอนเงิน
3. ✅ เพิ่มบัญชีธนาคาร
4. ✅ ดูประวัติธุรกรรม

---

**Status:** ✅ Ready to use
**Last Updated:** 2025-01-10
