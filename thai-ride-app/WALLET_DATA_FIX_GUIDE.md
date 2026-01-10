# 🔧 Wallet Data Fix Guide

## ปัญหา

ข้อมูล wallet ไม่แสดงเพราะ:

1. ✅ Code ทำงานถูกต้อง
2. ✅ API calls สำเร็จ
3. ❌ **แต่ user ยังไม่มี wallet record หรือไม่มี transactions**

จาก console logs:

```
[WalletView] Balance: ฿0.00
[WalletView] Transactions: 0
```

## 🚀 Quick Fix (แนะนำ)

### วิธีที่เร็วที่สุด - รัน 1 ไฟล์เดียว

1. **เปิด Supabase SQL Editor**

   - ไปที่ https://supabase.com/dashboard
   - เลือก project ของคุณ
   - คลิก "SQL Editor" ในเมนูซ้าย

2. **Copy & Paste ไฟล์นี้:**

   ```bash
   scripts/quick-wallet-fix.sql
   ```

3. **กด Run (หรือ Cmd+Enter)**

   - รอ 2-3 วินาที
   - ดู output ที่แสดง:

   ```
   ✅ WALLET FIX COMPLETED
   💰 ยอดเงินคงเหลือ: ฿1,250.00
   📈 รายรับทั้งหมด: ฿1,650.00
   📉 รายจ่ายทั้งหมด: ฿400.00
   📝 จำนวนธุรกรรม: 6 รายการ
   💳 คำขอเติมเงิน: 3 รายการ
   ```

4. **Refresh หน้าเว็บ**
   - กด `Cmd+Shift+R` (Mac) หรือ `Ctrl+Shift+R` (Windows)
   - ข้อมูลจะแสดงทันที ✨

---

## 🔍 ตรวจสอบระบบ (Optional)

ถ้าต้องการตรวจสอบว่าระบบทำงานถูกต้อง:

```bash
scripts/verify-wallet-system.sql
```

จะได้ report ครบถ้วน:

- ✅ User & Wallet Status
- ✅ Functions Check
- ✅ Constraints Check
- ✅ RLS Policies
- ✅ Balance Verification
- ✅ Payment Accounts
- ✅ Recent Transactions

---

## วิธีแก้ไขแบบละเอียด

### Option 1: รัน Migration (แนะนำ)

1. **เปิด Supabase Dashboard**

   - ไปที่ https://supabase.com/dashboard
   - เลือก project ของคุณ
   - ไปที่ SQL Editor

2. **รัน Migration**

   ```bash
   # ใน terminal
   cd supabase
   supabase db push
   ```

   หรือ copy เนื้อหาจาก `supabase/migrations/224_fix_wallet_initialization.sql` ไปรันใน SQL Editor

3. **Refresh หน้าเว็บ**
   - กด `Cmd+Shift+R` (Mac) หรือ `Ctrl+Shift+R` (Windows)
   - Wallet จะถูกสร้างอัตโนมัติ

### Option 2: สร้าง Test Data (สำหรับ Development)

1. **เปิด Supabase SQL Editor**

2. **Copy & Paste script นี้:**

   ```sql
   -- สร้าง wallet และ test data
   -- Copy จาก scripts/fix-wallet-and-create-test-data.sql
   ```

3. **Run Script**

   - กด "Run" หรือ `Cmd+Enter`
   - ควรเห็น output:
     ```
     Summary | Wallet Balance | 1400.00
     Summary | Total Earned   | 1550.00
     Summary | Total Spent    | 150.00
     Counts  | Transactions   | 4
     Counts  | Topup Requests | 2
     Counts  | Pending Topups | 1
     ```

4. **Refresh หน้าเว็บ**
   - ข้อมูลจะแสดงทันที

### Option 3: Manual Fix (ถ้า Option 1-2 ไม่ได้)

1. **เปิด Supabase Table Editor**

2. **ไปที่ table `user_wallets`**

3. **Insert New Row:**

   ```
   user_id: [your-user-id]
   balance: 1000.00
   total_earned: 1000.00
   total_spent: 0.00
   ```

4. **ไปที่ table `wallet_transactions`**

5. **Insert New Row:**

   ```
   user_id: [your-user-id]
   type: topup
   amount: 1000.00
   balance_before: 0.00
   balance_after: 1000.00
   description: เติมเงินทดสอบ
   status: completed
   ```

6. **Refresh หน้าเว็บ**

## ตรวจสอบว่าแก้ไขสำเร็จ

### 1. ดู Browser Console

```
[WalletView] Balance: ฿1,400.00  ✅
[WalletView] Transactions: 4     ✅
```

### 2. ดูหน้าเว็บ

- ยอดเงินคงเหลือแสดง: **฿1,400.00**
- รายรับทั้งหมด: **฿1,550.00**
- รายจ่ายทั้งหมด: **฿150.00**
- ประวัติ: แสดง 4 รายการ
- เติมเงิน: แสดง 2 รายการ
- รอดำเนินการ: 1 รายการ

## ไฟล์ที่เกี่ยวข้อง

### Migrations

- `supabase/migrations/224_fix_wallet_initialization.sql` - แก้ไข wallet initialization
- `supabase/migrations/186_fix_customer_wallet.sql` - function เดิม

### Scripts

- `scripts/fix-wallet-and-create-test-data.sql` - สร้าง test data
- `scripts/test-wallet-data.sql` - ตรวจสอบข้อมูล

## การทำงานของ Auto-Create Wallet

หลังจากรัน migration แล้ว:

1. **Trigger on User Creation**

   - เมื่อมี user ใหม่ → สร้าง wallet อัตโนมัติ

2. **Function ensure_user_wallet**

   - เรียกใช้ทุกครั้งที่ fetch wallet
   - ถ้าไม่มี wallet → สร้างใหม่

3. **Backfill Existing Users**
   - Migration จะสร้าง wallet ให้ user เก่าทั้งหมด

## Troubleshooting

### ปัญหา: "permission denied for table user_wallets"

**แก้ไข:**

```sql
-- Grant permissions
GRANT ALL ON user_wallets TO authenticated;
GRANT ALL ON wallet_transactions TO authenticated;
GRANT ALL ON topup_requests TO authenticated;
```

### ปัญหา: "function get_customer_wallet does not exist"

**แก้ไข:**

```bash
# รัน migrations ทั้งหมด
cd supabase
supabase db push
```

### ปัญหา: "RLS policy violation"

**แก้ไข:**

```sql
-- ตรวจสอบ RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'user_wallets';

-- ถ้าไม่มี policy ให้สร้าง
CREATE POLICY "Users can view own wallet" ON user_wallets
  FOR SELECT
  USING (auth.uid() = user_id);
```

### ปัญหา: ข้อมูลยังไม่แสดงหลังรัน script

**ตรวจสอบ:**

1. **User ID ถูกต้องหรือไม่**

   ```sql
   SELECT auth.uid(); -- ควรได้ UUID กลับมา
   ```

2. **Wallet ถูกสร้างหรือยัง**

   ```sql
   SELECT * FROM user_wallets WHERE user_id = auth.uid();
   ```

3. **Transactions มีหรือไม่**

   ```sql
   SELECT * FROM wallet_transactions WHERE user_id = auth.uid();
   ```

4. **Function ทำงานหรือไม่**
   ```sql
   SELECT * FROM get_customer_wallet(auth.uid());
   ```

## Next Steps

หลังจากแก้ไขแล้ว:

1. ✅ ข้อมูลแสดงถูกต้อง
2. ✅ สามารถเติมเงินได้
3. ✅ สามารถถอนเงินได้
4. ✅ ประวัติแสดงครบถ้วน

ถ้ายังมีปัญหา ให้:

- แจ้ง error message จาก console
- แจ้งผลลัพธ์จากการรัน SQL queries
- Screenshot หน้าจอ

---

**สรุป:** ปัญหาคือ user ไม่มี wallet record. แก้ไขโดยรัน migration หรือ script เพื่อสร้าง wallet และ test data.
