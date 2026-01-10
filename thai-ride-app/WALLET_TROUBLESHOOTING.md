# 🔧 Wallet Troubleshooting Guide

## ปัญหา: ไม่แสดงประวัติ / ไม่มียอดเงิน / ข้อมูลไม่ตรง

---

## 🔍 Step 1: ตรวจสอบข้อมูลในฐานข้อมูล

### รัน Debug Script

1. เปิด **Supabase SQL Editor**
2. Copy script จาก `scripts/debug-wallet-data.sql`
3. กด **Run**

### ดูผลลัพธ์

ตรวจสอบ output ในส่วน **"DEBUG SUMMARY"**:

```
================================================
           DEBUG SUMMARY
================================================
User ID: bc1a3546-ee13-47d6-804a-6be9055509b4

Wallet Records: 1
Transactions: 6
Topup Requests: 2
Current Balance: ฿1250.00
================================================
```

### แปลผล

#### ✅ กรณีที่ 1: มีข้อมูลในฐานข้อมูล

```
Wallet Records: 1
Transactions: 6
Current Balance: ฿1250.00
```

**ปัญหา:** ข้อมูลมีแต่ไม่แสดงใน UI
**ไปที่:** Step 2 (ตรวจสอบ Frontend)

#### ❌ กรณีที่ 2: ไม่มีข้อมูล

```
Wallet Records: 0
Transactions: 0
Current Balance: ฿0.00
```

**ปัญหา:** ไม่มีข้อมูลในฐานข้อมูล
**แก้ไข:** รัน `scripts/quick-wallet-fix.sql` (ไปที่ Step 3)

#### ⚠️ กรณีที่ 3: มี Wallet แต่ไม่มี Transactions

```
Wallet Records: 1
Transactions: 0
Current Balance: ฿0.00
```

**ปัญหา:** Wallet ว่างเปล่า
**แก้ไข:** รัน `scripts/quick-wallet-fix.sql` (ไปที่ Step 3)

---

## 🖥️ Step 2: ตรวจสอบ Frontend (ถ้ามีข้อมูลในฐานข้อมูล)

### 2.1 เปิด Browser Console

กด `F12` หรือ `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

### 2.2 ตรวจสอบ Logs

ดู console logs ควรเห็น:

```javascript
[WalletView] Mounting...
[WalletView] Data loaded successfully
[WalletView] Balance: ฿1,250.00  // ✅ ถ้าเห็นตัวเลข = ดี
[WalletView] Transactions: 6      // ✅ ถ้าเห็นตัวเลข = ดี
```

### 2.3 ตรวจสอบ Errors

ถ้าเห็น error แบบนี้:

#### Error 1: "permission denied"

```
Error: permission denied for table user_wallets
```

**แก้ไข:**

```sql
-- Run in Supabase SQL Editor
GRANT SELECT ON user_wallets TO authenticated;
GRANT SELECT ON wallet_transactions TO authenticated;
GRANT SELECT ON topup_requests TO authenticated;
```

#### Error 2: "function does not exist"

```
Error: function get_customer_wallet does not exist
```

**แก้ไข:**

```bash
# Run migrations
cd supabase
supabase db push
```

#### Error 3: "RLS policy violation"

```
Error: new row violates row-level security policy
```

**แก้ไข:** ตรวจสอบ RLS policies ใน debug script output

### 2.4 ตรวจสอบ Network Tab

1. เปิด **Network** tab ใน DevTools
2. Refresh หน้าเว็บ
3. Filter: `XHR` หรือ `Fetch`
4. ดู requests ไปที่ Supabase:
   - `get_customer_wallet` - ควร return ข้อมูล
   - `wallet_transactions` - ควร return array
   - `topup_requests` - ควร return array

### 2.5 ตรวจสอบ Vue DevTools

1. ติดตั้ง Vue DevTools extension
2. เปิด Vue DevTools
3. ไปที่ **Pinia** tab
4. เลือก **wallet** store
5. ตรวจสอบ state:
   ```javascript
   balance: { balance: 1250, total_earned: 1650, total_spent: 400 }
   transactions: Array(6)
   topupRequests: Array(2)
   ```

---

## 🔧 Step 3: แก้ไขปัญหา "ไม่มีข้อมูล"

### 3.1 รัน Quick Fix Script

1. เปิด **Supabase SQL Editor**
2. Copy script จาก `scripts/quick-wallet-fix.sql`
3. กด **Run**
4. ดู output:
   ```
   ✅ WALLET FIX COMPLETED
   💰 ยอดเงินคงเหลือ: ฿1250.00
   📈 รายรับทั้งหมด: ฿1650.00
   📉 รายจ่ายทั้งหมด: ฿400.00
   📝 จำนวนธุรกรรม: 6 รายการ
   ```

### 3.2 Refresh Browser

กด **`Cmd+Shift+R`** (Mac) หรือ **`Ctrl+Shift+R`** (Windows)

### 3.3 ตรวจสอบอีกครั้ง

ควรเห็น:

- 💰 ยอดเงิน: ฿1,250.00
- 📝 ประวัติ: 6 รายการ
- 💳 เติมเงิน: 2 รายการ

---

## 🐛 Step 4: ปัญหาเฉพาะ

### ปัญหา: "ข้อมูลไม่ตรงกับฐานข้อมูล"

#### สาเหตุที่เป็นไปได้:

1. **Cache ใน Browser**

   ```bash
   # แก้ไข: Hard refresh
   Cmd+Shift+R (Mac)
   Ctrl+Shift+R (Windows)
   ```

2. **Realtime Subscription ไม่ทำงาน**

   ```javascript
   // ตรวจสอบ console
   [WalletView] Mounting...
   // ควรเห็น subscription logs
   ```

3. **Balance Mismatch**

   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM verify_wallet_balance(auth.uid());

   -- ถ้า is_valid = false, run:
   SELECT * FROM reconcile_wallet_balance(auth.uid());
   ```

4. **Stale Data**
   ```javascript
   // ใน console, force refresh:
   location.reload(true);
   ```

### ปัญหา: "แสดงบางส่วน"

#### ตรวจสอบแต่ละส่วน:

1. **Balance แสดง แต่ Transactions ไม่แสดง**

   ```sql
   -- Check transactions
   SELECT COUNT(*) FROM wallet_transactions WHERE user_id = auth.uid();
   ```

2. **Transactions แสดง แต่ Balance ไม่แสดง**

   ```sql
   -- Check wallet
   SELECT * FROM user_wallets WHERE user_id = auth.uid();
   ```

3. **ทุกอย่างแสดง แต่ตัวเลขผิด**
   ```sql
   -- Reconcile balance
   SELECT * FROM reconcile_wallet_balance(auth.uid());
   ```

---

## 📋 Checklist

ใช้ checklist นี้เพื่อตรวจสอบทีละขั้นตอน:

### Database

- [ ] รัน `scripts/debug-wallet-data.sql`
- [ ] ตรวจสอบ Wallet Records > 0
- [ ] ตรวจสอบ Transactions > 0
- [ ] ตรวจสอบ Balance > 0
- [ ] ตรวจสอบ RLS Policies

### Frontend

- [ ] เปิด Browser Console
- [ ] ตรวจสอบ logs: `[WalletView] Balance: ฿...`
- [ ] ตรวจสอบ logs: `[WalletView] Transactions: ...`
- [ ] ไม่มี errors ใน console
- [ ] Network requests สำเร็จ (200 OK)

### Fix

- [ ] รัน `scripts/quick-wallet-fix.sql` (ถ้าไม่มีข้อมูล)
- [ ] Hard refresh browser (`Cmd+Shift+R`)
- [ ] Clear cache (ถ้าจำเป็น)
- [ ] Reconcile balance (ถ้าตัวเลขผิด)

---

## 🆘 ยังแก้ไม่ได้?

### ส่งข้อมูลเหล่านี้:

1. **Output จาก debug script:**

   ```
   รัน scripts/debug-wallet-data.sql
   Copy ทั้งหมดมาส่ง
   ```

2. **Console logs:**

   ```
   เปิด Console (F12)
   Copy errors ทั้งหมด
   ```

3. **Network errors:**

   ```
   เปิด Network tab
   Screenshot requests ที่ fail
   ```

4. **Vue DevTools state:**
   ```
   เปิด Vue DevTools > Pinia > wallet
   Screenshot state
   ```

---

## 🎯 Quick Commands

### ตรวจสอบข้อมูล

```sql
-- Copy จาก scripts/debug-wallet-data.sql
```

### สร้างข้อมูลทดสอบ

```sql
-- Copy จาก scripts/quick-wallet-fix.sql
```

### Verify Balance

```sql
SELECT * FROM verify_wallet_balance(auth.uid());
```

### Reconcile Balance

```sql
SELECT * FROM reconcile_wallet_balance(auth.uid());
```

### Check User

```sql
SELECT auth.uid(), email FROM auth.users WHERE id = auth.uid();
```

---

## 📚 Related Files

- `scripts/debug-wallet-data.sql` - Debug script
- `scripts/quick-wallet-fix.sql` - Quick fix
- `scripts/verify-wallet-system.sql` - System verification
- `WALLET_QUICK_START.md` - Quick start guide
- `WALLET_SYSTEM_COMPLETE_SUMMARY.md` - Complete documentation

---

**Last Updated:** 2025-01-10
**Status:** Ready to use
