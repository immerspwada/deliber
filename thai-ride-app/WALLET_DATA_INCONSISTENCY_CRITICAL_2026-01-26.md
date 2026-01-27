# 🚨 CRITICAL: Wallet Data Inconsistency

**Date**: 2026-01-26  
**Severity**: 🔥 CRITICAL - Data Integrity Issue  
**Status**: ⚠️ URGENT FIX REQUIRED

---

## 🎯 Problem Summary

**ระบบมี 2 แหล่งข้อมูลยอดเงินที่ไม่ตรงกัน:**

1. **`users.wallet_balance`** - ใช้โดย `useWalletBalance` composable (Queue Booking)
2. **`user_wallets.balance`** - ใช้โดย `walletStore` (Wallet View)

---

## 📊 Current Data State

### User: immersowada@gmail.com

| Source                 | Balance   | Difference     |
| ---------------------- | --------- | -------------- |
| `users.wallet_balance` | ฿1,000.00 | -              |
| `user_wallets.balance` | ฿929.00   | **-฿71.00** ❌ |

### User: superadmin@gobear.app

| Source                 | Balance | Difference      |
| ---------------------- | ------- | --------------- |
| `users.wallet_balance` | ฿946.00 | -               |
| `user_wallets.balance` | ฿0.00   | **-฿946.00** ❌ |

---

## 🔍 Root Cause Analysis

### Architecture Issue

ระบบออกแบบมาให้มี **2 tables** เก็บข้อมูล wallet:

1. **`users` table**
   - Column: `wallet_balance`
   - Purpose: Quick access, legacy column
   - Used by: Direct queries, `useWalletBalance` composable

2. **`user_wallets` table**
   - Columns: `balance`, `total_earned`, `total_spent`
   - Purpose: Detailed wallet management
   - Used by: `walletStore`, RPC functions

### Sync Mechanism Missing

**ปัญหา**: ไม่มี mechanism ที่ sync ข้อมูลระหว่าง 2 tables อัตโนมัติ

**ผลกระทบ**:

- หน้า Wallet แสดงยอดเงินจาก `user_wallets` (฿929)
- หน้า Queue Booking แสดงยอดเงินจาก `users` (฿1,000)
- **ผู้ใช้เห็นข้อมูลไม่ตรงกัน** → สูญเสียความเชื่อมั่น

---

## 🎯 Solution Options

### Option 1: Use Single Source of Truth (Recommended)

**เลือกใช้ `user_wallets` เป็นแหล่งข้อมูลหลัก**

**Pros**:

- มีข้อมูลครบถ้วน (balance, earned, spent)
- มี RPC function พร้อมใช้
- Architecture ที่ถูกต้อง

**Cons**:

- ต้องแก้ `useWalletBalance` composable
- ต้องแก้ทุกที่ที่ query `users.wallet_balance`

**Implementation**:

```typescript
// useWalletBalance.ts - แก้ไขให้ใช้ user_wallets
const { data, error } = await supabase
  .rpc("get_customer_wallet", { p_user_id: authStore.user.id })
  .single();

if (data) {
  balance.value = parseFloat(data.balance);
}
```

### Option 2: Sync Both Tables (Complex)

**สร้าง trigger ให้ sync อัตโนมัติ**

**Pros**:

- รักษา backward compatibility
- ไม่ต้องแก้โค้ด frontend มาก

**Cons**:

- ซับซ้อน มีโอกาสเกิด race condition
- Performance overhead
- Maintenance ยาก

### Option 3: Deprecate `users.wallet_balance` (Long-term)

**ลบ column `users.wallet_balance` ออก**

**Pros**:

- Single source of truth
- ไม่มีปัญหา sync

**Cons**:

- Breaking change
- ต้อง migrate ข้อมูล
- ต้องแก้โค้ดทั้งหมด

---

## ✅ Immediate Fix (Option 1)

### Step 1: Sync Current Data

```sql
-- Sync user_wallets.balance → users.wallet_balance
UPDATE users u
SET wallet_balance = uw.balance
FROM user_wallets uw
WHERE uw.user_id = u.id
AND u.wallet_balance != uw.balance;
```

### Step 2: Fix `useWalletBalance` Composable

```typescript
// src/composables/useWalletBalance.ts
export function useWalletBalance() {
  const authStore = useAuthStore();
  const balance = ref<number>(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchBalance = async (): Promise<void> => {
    if (!authStore.user?.id) {
      balance.value = 0;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      // ✅ ใช้ RPC function เหมือน walletStore
      const { data, error: rpcError } = await supabase
        .rpc("get_customer_wallet", {
          p_user_id: authStore.user.id,
        })
        .single();

      if (rpcError) throw rpcError;

      if (data) {
        balance.value = parseFloat(data.balance || "0");
      } else {
        balance.value = 0;
      }
    } catch (err: any) {
      console.error("❌ [useWalletBalance] Error:", err);
      error.value = err.message;
      balance.value = 0;
    } finally {
      loading.value = false;
    }
  };

  // ... rest of composable
}
```

### Step 3: Create Sync Trigger (Optional)

```sql
-- Create trigger to keep both tables in sync
CREATE OR REPLACE FUNCTION sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update users.wallet_balance when user_wallets.balance changes
  UPDATE users
  SET wallet_balance = NEW.balance
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_wallet_balance
AFTER INSERT OR UPDATE OF balance ON user_wallets
FOR EACH ROW
EXECUTE FUNCTION sync_wallet_balance();
```

---

## 🧪 Testing Plan

### 1. Verify Data Sync

```sql
-- Check if data is synced
SELECT
  u.email,
  u.wallet_balance as users_balance,
  uw.balance as wallets_balance,
  (u.wallet_balance - uw.balance) as difference
FROM users u
LEFT JOIN user_wallets uw ON uw.user_id = u.id
WHERE u.wallet_balance != uw.balance
OR uw.balance IS NULL;
```

### 2. Test Both Pages

1. Login as `immersowada@gmail.com`
2. Check `/customer/wallet` → Should show ฿929.00
3. Check `/customer/queue-booking` → Should show ฿929.00
4. **Both must match!**

### 3. Test Transaction

1. Create a queue booking (฿50)
2. Check both pages again
3. Both should show ฿879.00

---

## 📝 Migration Plan

### Phase 1: Immediate (Today)

- [x] Identify data inconsistency
- [ ] Sync current data
- [ ] Fix `useWalletBalance` to use RPC
- [ ] Test on both pages
- [ ] Deploy fix

### Phase 2: Short-term (This Week)

- [ ] Add sync trigger
- [ ] Monitor for sync issues
- [ ] Add alerts for data mismatch

### Phase 3: Long-term (Next Sprint)

- [ ] Deprecate `users.wallet_balance`
- [ ] Migrate all code to use `user_wallets`
- [ ] Remove legacy column

---

## 🚨 Impact Assessment

### Current Impact

- **User Confusion**: ผู้ใช้เห็นยอดเงินไม่ตรงกัน
- **Trust Issue**: สูญเสียความเชื่อมั่นในระบบ
- **Business Risk**: อาจมีการ dispute เรื่องยอดเงิน

### Affected Features

- ✅ Wallet View (`/customer/wallet`)
- ✅ Queue Booking (`/customer/queue-booking`)
- ⚠️ Ride Booking (ถ้าใช้ `useWalletBalance`)
- ⚠️ Shopping (ถ้าใช้ `useWalletBalance`)
- ⚠️ Delivery (ถ้าใช้ `useWalletBalance`)

---

## 💡 Prevention

### Code Review Checklist

- [ ] ตรวจสอบว่าใช้ single source of truth
- [ ] ไม่มี duplicate data storage
- [ ] มี sync mechanism ถ้าจำเป็น
- [ ] Test data consistency

### Architecture Guidelines

1. **Single Source of Truth**: เลือกใช้ 1 table เป็นหลัก
2. **Computed Values**: ถ้าต้องการ denormalize ให้ใช้ computed column หรือ view
3. **Sync Triggers**: ถ้าจำเป็นต้อง duplicate ให้มี trigger sync
4. **Monitoring**: ตรวจสอบ data consistency เป็นประจำ

---

## 🎯 Action Items

### Immediate (Now)

1. ✅ Document the issue
2. ⏳ Sync data in database
3. ⏳ Fix `useWalletBalance` composable
4. ⏳ Test both pages
5. ⏳ Deploy fix

### Follow-up (This Week)

1. ⏳ Add sync trigger
2. ⏳ Add monitoring
3. ⏳ Create alert system
4. ⏳ Update documentation

### Long-term (Next Sprint)

1. ⏳ Plan deprecation of `users.wallet_balance`
2. ⏳ Migrate all code
3. ⏳ Remove legacy column
4. ⏳ Update database schema

---

**Created**: 2026-01-26  
**Priority**: 🔥 CRITICAL  
**Assigned To**: Development Team  
**Status**: ⚠️ URGENT - Requires Immediate Action
