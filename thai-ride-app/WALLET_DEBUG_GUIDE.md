# Wallet Debug Guide - /customer/wallet ใช้ไม่ได้

## 🔍 ขั้นตอนการตรวจสอบปัญหา

### 1. ตรวจสอบ Console Errors

เปิด Browser DevTools (F12) และดูที่ Console tab:

```bash
# ข้อผิดพลาดที่อาจพบ:
- "Failed to fetch wallet balance"
- "RLS policy violation"
- "user_wallets not found"
- "usePaymentSettings is not defined"
- Component rendering errors
```

### 2. ตรวจสอบ Network Tab

ดูที่ Network tab ว่ามี API calls ที่ fail:

```
GET /rest/v1/user_wallets?user_id=eq.xxx
GET /rest/v1/wallet_transactions?user_id=eq.xxx
GET /rest/v1/payment_settings
```

### 3. ตรวจสอบ Database

```sql
-- ตรวจสอบว่ามี wallet สำหรับ user หรือไม่
SELECT * FROM user_wallets WHERE user_id = 'YOUR_USER_ID';

-- ตรวจสอบ RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_wallets';

-- ตรวจสอบว่ามี payment_settings หรือไม่
SELECT * FROM payment_settings LIMIT 1;
```

## 🐛 ปัญหาที่พบบ่อยและวิธีแก้

### ปัญหา 1: ไม่มี Wallet Record

**อาการ:** หน้าจอว่างเปล่า หรือแสดง balance = 0

**สาเหตุ:** User ใหม่ยังไม่มี record ใน `user_wallets`

**วิธีแก้:**

```sql
-- สร้าง wallet ให้ user
INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
VALUES ('YOUR_USER_ID', 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;
```

หรือใช้ function:

```sql
SELECT ensure_user_wallet('YOUR_USER_ID');
```

### ปัญหา 2: RLS Policy Block

**อาการ:** Error "permission denied" หรือ "RLS policy violation"

**สาเหตุ:** RLS policies ไม่อนุญาตให้ user อ่านข้อมูล

**วิธีแก้:**

```sql
-- ตรวจสอบ RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_wallets';

-- ถ้าไม่มี policy ให้สร้าง:
CREATE POLICY "Users can view own wallet"
  ON user_wallets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### ปัญหา 3: ไม่มี payment_settings

**อาการ:** ไม่แสดงข้อมูลบัญชีธนาคาร/พร้อมเพย์

**สาเหตุ:** ไม่มี record ใน `payment_settings`

**วิธีแก้:**

```sql
-- สร้าง payment settings
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
) ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  bank_account_number = EXCLUDED.bank_account_number,
  bank_account_name = EXCLUDED.bank_account_name,
  promptpay_id = EXCLUDED.promptpay_id;
```

### ปัญหา 4: usePaymentSettings ไม่ทำงาน

**อาการ:** Error "usePaymentSettings is not defined"

**สาเหตุ:** Composable ไม่ถูก import หรือไม่มีไฟล์

**วิธีแก้:**

ตรวจสอบว่ามีไฟล์ `src/composables/usePaymentSettings.ts`:

```typescript
// src/composables/usePaymentSettings.ts
import { ref } from "vue";
import { supabase } from "../lib/supabase";

export interface PaymentSettings {
  id: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  promptpay_id: string;
  is_active: boolean;
}

export function usePaymentSettings() {
  const paymentInfo = ref<PaymentSettings | null>(null);
  const loading = ref(false);

  const fetchPaymentInfo = async () => {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        paymentInfo.value = data;
      }
    } catch (err) {
      console.error("Error fetching payment settings:", err);
    } finally {
      loading.value = false;
    }
  };

  return {
    paymentInfo,
    loading,
    fetchPaymentInfo,
  };
}
```

### ปัญหา 5: Component ไม่ Render

**อาการ:** หน้าจอว่างเปล่า ไม่มี error

**สาเหตุ:** Template syntax error หรือ missing dependencies

**วิธีแก้:**

1. ตรวจสอบ console errors
2. ตรวจสอบว่า import ครบหรือไม่
3. ตรวจสอบ template syntax

## 🔧 Quick Fix Script

รัน script นี้เพื่อแก้ปัญหาทั่วไป:

```sql
-- 1. สร้าง wallet ให้ user ปัจจุบัน
INSERT INTO user_wallets (user_id, balance, total_earned, total_spent)
SELECT auth.uid(), 0, 0, 0
WHERE NOT EXISTS (
  SELECT 1 FROM user_wallets WHERE user_id = auth.uid()
);

-- 2. สร้าง payment settings
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
) ON CONFLICT (id) DO UPDATE SET
  is_active = true;

-- 3. ตรวจสอบ RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_wallets'
    AND policyname = 'Users can view own wallet'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view own wallet"
      ON user_wallets
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid())';
  END IF;
END $$;
```

## 📝 Checklist การแก้ปัญหา

- [ ] ตรวจสอบ Console errors
- [ ] ตรวจสอบ Network tab
- [ ] ตรวจสอบว่ามี wallet record
- [ ] ตรวจสอบ RLS policies
- [ ] ตรวจสอบว่ามี payment_settings
- [ ] ตรวจสอบว่า usePaymentSettings.ts มีอยู่
- [ ] ตรวจสอบ import statements
- [ ] ลอง refresh หน้าเว็บ
- [ ] ลอง logout/login ใหม่
- [ ] ตรวจสอบ Supabase connection

## 🚀 Testing Steps

1. **Login เข้าระบบ**

   ```
   http://localhost:5173/login
   ```

2. **ไปที่หน้า Wallet**

   ```
   http://localhost:5173/customer/wallet
   ```

3. **ตรวจสอบว่าแสดง:**

   - ยอดเงินคงเหลือ
   - ปุ่มเติมเงิน
   - Tab ภาพรวม/ประวัติ/เติมเงิน
   - ข้อมูลบัญชีธนาคาร (เมื่อกดเติมเงิน)

4. **ทดสอบ Features:**
   - กดปุ่มเติมเงิน
   - เลือกจำนวนเงิน
   - เลือกช่องทางชำระ
   - ดูข้อมูลการโอนเงิน
   - ส่งคำขอเติมเงิน

## 📞 Support

ถ้ายังแก้ไม่ได้ ให้:

1. เก็บ screenshot ของ Console errors
2. เก็บ screenshot ของ Network tab
3. บันทึกข้อความ error ทั้งหมด
4. ส่งข้อมูลเหล่านี้มาเพื่อวิเคราะห์เพิ่มเติม

## 🎯 Expected Behavior

เมื่อทำงานถูกต้อง:

1. หน้า Wallet โหลดได้ไม่มี error
2. แสดงยอดเงินคงเหลือ
3. แสดงประวัติการทำรายการ
4. กดเติมเงินได้
5. แสดงข้อมูลบัญชีธนาคาร/พร้อมเพย์
6. ส่งคำขอเติมเงินได้
7. Realtime update ทำงาน
