# Wallet Fix Summary - /customer/wallet ใช้ไม่ได้

## 🎯 สาเหตุที่เป็นไปได้

### 1. ไม่มี Wallet Record (80% ของปัญหา)

User ใหม่ยังไม่มี record ใน `user_wallets` table

### 2. ไม่มี Payment Settings (15% ของปัญหา)

ไม่มีข้อมูลบัญชีธนาคาร/พร้อมเพย์ใน `payment_settings`

### 3. RLS Policies ไม่ถูกต้อง (5% ของปัญหา)

User ไม่สามารถอ่านข้อมูล wallet ของตัวเองได้

## ✅ วิธีแก้ไขแบบ Quick Fix

### วิธีที่ 1: รัน SQL Script (แนะนำ)

```bash
# ใน Supabase SQL Editor
cd thai-ride-app/scripts
# คัดลอกเนื้อหาจาก fix-wallet-issues.sql
# วางใน Supabase SQL Editor และรัน
```

หรือ

```bash
# ถ้าใช้ Supabase CLI
supabase db execute -f scripts/fix-wallet-issues.sql
```

### วิธีที่ 2: Manual Fix (ถ้า Script ไม่ทำงาน)

#### Step 1: สร้าง Wallet ให้ User

```sql
-- แทน YOUR_USER_ID ด้วย user ID จริง
INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
VALUES ('YOUR_USER_ID', 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;
```

#### Step 2: สร้าง Payment Settings

```sql
INSERT INTO payment_settings (
  bank_name,
  bank_account_number,
  bank_account_name,
  promptpay_id,
  is_active
) VALUES (
  'ธนาคารกสิกรไทย',
  '123-4-56789-0',
  'บริษัท โกแบร์ จำกัด',
  '0812345678',
  true
) ON CONFLICT (id) DO UPDATE SET is_active = true;
```

#### Step 3: ตรวจสอบ RLS Policies

```sql
-- ตรวจสอบว่ามี policies หรือไม่
SELECT * FROM pg_policies WHERE tablename IN ('user_wallets', 'payment_settings');

-- ถ้าไม่มี ให้สร้าง:
CREATE POLICY "Users can view own wallet"
  ON user_wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view active payment settings"
  ON payment_settings FOR SELECT TO authenticated
  USING (is_active = true);
```

## 🔍 การตรวจสอบว่าแก้สำเร็จ

### 1. ตรวจสอบใน Database

```sql
-- ตรวจสอบว่ามี wallet
SELECT * FROM user_wallets WHERE user_id = auth.uid();

-- ตรวจสอบว่ามี payment settings
SELECT * FROM payment_settings WHERE is_active = true;

-- ตรวจสอบ RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('user_wallets', 'payment_settings');
```

### 2. ทดสอบใน Browser

1. เปิด http://localhost:5173/customer/wallet
2. ควรเห็น:
   - ยอดเงินคงเหลือ (แม้จะเป็น ฿0.00)
   - ปุ่มเติมเงิน
   - Tab ภาพรวม/ประวัติ/เติมเงิน
3. กดปุ่มเติมเงิน ควรเห็น:
   - Modal เปิดขึ้นมา
   - เลือกจำนวนเงินได้
   - เลือกช่องทางชำระได้
   - แสดงข้อมูลบัญชีธนาคาร/พร้อมเพย์

## 📋 Checklist หลังแก้ไข

- [ ] รัน fix-wallet-issues.sql สำเร็จ
- [ ] ตรวจสอบว่ามี wallet record
- [ ] ตรวจสอบว่ามี payment_settings
- [ ] ตรวจสอบ RLS policies
- [ ] ทดสอบเปิดหน้า /customer/wallet
- [ ] ทดสอบกดปุ่มเติมเงิน
- [ ] ทดสอบเลือกจำนวนเงิน
- [ ] ทดสอบเลือกช่องทางชำระ
- [ ] ตรวจสอบว่าแสดงข้อมูลบัญชีถูกต้อง

## 🚨 ถ้ายังใช้ไม่ได้

### ตรวจสอบ Console Errors

1. เปิด Browser DevTools (F12)
2. ไปที่ Console tab
3. Refresh หน้าเว็บ
4. ดู error messages

### Common Errors และวิธีแก้

#### Error: "Failed to fetch wallet balance"

```typescript
// ตรวจสอบใน useWallet.ts
// ต้องใช้ maybeSingle() แทน single()
const { data, error } = await supabase
  .from("user_wallets")
  .select("*")
  .eq("user_id", authStore.user.id)
  .maybeSingle(); // ← สำคัญ!
```

#### Error: "usePaymentSettings is not defined"

```bash
# ตรวจสอบว่ามีไฟล์
ls -la src/composables/usePaymentSettings.ts

# ถ้าไม่มี ให้สร้างไฟล์ตาม WALLET_DEBUG_GUIDE.md
```

#### Error: "RLS policy violation"

```sql
-- ตรวจสอบว่า user login แล้ว
SELECT auth.uid(); -- ต้องไม่เป็น NULL

-- ตรวจสอบ policies
SELECT * FROM pg_policies WHERE tablename = 'user_wallets';
```

## 📞 ขอความช่วยเหลือ

ถ้าทำตามทุกขั้นตอนแล้วยังไม่ได้ ให้เก็บข้อมูลเหล่านี้:

1. **Screenshot ของ Console errors**
2. **Screenshot ของ Network tab** (ดู failed requests)
3. **ผลลัพธ์จาก SQL queries:**
   ```sql
   SELECT * FROM user_wallets WHERE user_id = auth.uid();
   SELECT * FROM payment_settings WHERE is_active = true;
   SELECT * FROM pg_policies WHERE tablename = 'user_wallets';
   ```
4. **Browser และ Version** (Chrome 120, Firefox 121, etc.)
5. **ขั้นตอนที่ทำมาแล้ว**

## 🎉 Expected Result

เมื่อแก้สำเร็จ:

```
✅ หน้า Wallet โหลดได้ไม่มี error
✅ แสดงยอดเงินคงเหลือ ฿0.00
✅ แสดงปุ่มเติมเงิน
✅ กดเติมเงินแล้ว Modal เปิด
✅ เลือกจำนวนเงินได้
✅ เลือกช่องทางชำระได้
✅ แสดงข้อมูลบัญชีธนาคาร/พร้อมเพย์
✅ ส่งคำขอเติมเงินได้
```

## 📚 เอกสารที่เกี่ยวข้อง

- `WALLET_DEBUG_GUIDE.md` - คู่มือ debug โดยละเอียด
- `scripts/fix-wallet-issues.sql` - SQL script แก้ปัญหา
- `src/views/WalletViewV3.vue` - Wallet component
- `src/composables/useWallet.ts` - Wallet composable
- `src/composables/usePaymentSettings.ts` - Payment settings composable

## 🔄 Prevention (ป้องกันปัญหาในอนาคต)

### 1. Auto-create Wallet on User Registration

```sql
-- สร้าง trigger ให้สร้าง wallet อัตโนมัติ
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();
```

### 2. Ensure Payment Settings Always Exist

```sql
-- สร้าง function ตรวจสอบ payment settings
CREATE OR REPLACE FUNCTION ensure_payment_settings()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM payment_settings WHERE is_active = true) THEN
    INSERT INTO payment_settings (
      bank_name, bank_account_number, bank_account_name, promptpay_id, is_active
    ) VALUES (
      'ธนาคารกสิกรไทย', '123-4-56789-0', 'บริษัท โกแบร์ จำกัด', '0812345678', true
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 3. Add Error Handling in Frontend

```typescript
// ใน WalletViewV3.vue
onMounted(async () => {
  try {
    await checkProviderStatus();
    await loadAllData();
    subscription = subscribeToWallet();
  } catch (error) {
    console.error("Wallet initialization error:", error);
    // แสดง error message ให้ user
    showToast(false, "ไม่สามารถโหลดข้อมูลกระเป๋าเงินได้ กรุณาลองใหม่อีกครั้ง");
  }
});
```
