# Wallet Add Bank Account - Debug Guide

## Problem

User reports: "ไม่สามารถเพิ่มบัญชีได้" (Cannot add bank account)

## Status

✅ Button disabled issue FIXED
🔍 Backend error investigation IN PROGRESS

## What Was Fixed

1. **Button Disabled Issue** - RESOLVED
   - Created `isDev` constant from `import.meta.env.DEV`
   - Created `isAddBankDisabled` computed property
   - Fixed template to use computed instead of inline expression
   - Button now clickable when all fields filled

## Current Issue

- Button is now clickable (disabled=false)
- Debug shows: `code=KTB, number=12121212121111, name=dfsdfds dfsdfdsf, disabled=false`
- When clicked, shows error: "ไม่สามารถเพิ่มบัญชีได้"
- This is a **backend/database error**, not frontend validation

## Enhanced Logging Added

### In `src/views/WalletView.vue` - `handleAddBank()`:

```typescript
- Logs starting state with all input values
- Logs validation checks
- Logs store call and result
- Logs success/failure with detailed messages
- Logs exceptions with full error details
```

### In `src/stores/wallet.ts` - `addBankAccount()`:

```typescript
- Logs input parameters
- Logs auth check and user ID
- Logs bank name resolution
- Logs complete RPC parameters
- Logs RPC response (data and error)
- Logs error details (message, details, hint, code)
- Logs success/failure states
- Logs exceptions with stack traces
```

## How to Debug

1. **Open Browser Console** (F12)
2. **Fill in the form**:
   - Select bank: KTB (ธนาคารกรุงไทย)
   - Account number: 12121212121111
   - Account name: Test User
3. **Click "บันทึก" (Save)**
4. **Check Console Logs** - Look for:
   ```
   [WalletView] handleAddBank: Starting...
   [WalletView] handleAddBank: Values: {...}
   [WalletView] handleAddBank: Calling walletStore.addBankAccount...
   [WalletStore] addBankAccount: Starting...
   [WalletStore] addBankAccount: Input: {...}
   [WalletStore] addBankAccount: User ID: ...
   [WalletStore] addBankAccount: RPC params: {...}
   [WalletStore] addBankAccount: RPC response: {...}
   ```

## Possible Issues to Check

### 1. RLS Policy Issue

The `customer_bank_accounts` table might not allow INSERT for authenticated users.

**Check with Supabase MCP**:

```sql
-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'customer_bank_accounts';

-- Test INSERT directly
INSERT INTO customer_bank_accounts (
  user_id, bank_code, bank_name,
  account_number, account_name, is_default
) VALUES (
  'bc1a3546-ee13-47d6-804a-6be9055509b4',
  'KTB', 'ธนาคารกรุงไทย',
  '12121212121111', 'Test User', false
);
```

### 2. Function Permission Issue

The RPC function might not have proper permissions.

**Check**:

```sql
-- Check function permissions
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_name = 'add_customer_bank_account';

-- Check grants
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'add_customer_bank_account';
```

### 3. Constraint Violation

There might be a unique constraint or check constraint failing.

**Check**:

```sql
-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'customer_bank_accounts';

-- Check if account already exists
SELECT * FROM customer_bank_accounts
WHERE user_id = 'bc1a3546-ee13-47d6-804a-6be9055509b4'
AND account_number = '12121212121111';
```

## Database Function Details

**Function**: `add_customer_bank_account`
**Location**: `supabase/migrations/201_customer_withdrawal_system.sql`
**Parameters**:

- `p_user_id` UUID
- `p_bank_code` VARCHAR(20)
- `p_bank_name` VARCHAR(100)
- `p_account_number` VARCHAR(20)
- `p_account_name` VARCHAR(100)
- `p_is_default` BOOLEAN

**Returns**: TABLE (success BOOLEAN, account_id UUID, message TEXT)

## Next Steps

1. **Run the app** and try to add a bank account
2. **Copy all console logs** starting with `[WalletView] handleAddBank` and `[WalletStore] addBankAccount`
3. **Share the logs** to identify the exact error
4. Based on logs, we can:
   - Fix RLS policies if needed
   - Fix function permissions if needed
   - Fix constraints if needed
   - Fix function logic if needed

## Test User

- User ID: `bc1a3546-ee13-47d6-804a-6be9055509b4`
- Current balance: ฿1,250.00
- Has wallet: ✅
- Has transactions: ✅

## Files Modified

- ✅ `src/views/WalletView.vue` - Enhanced logging in `handleAddBank()`
- ✅ `src/stores/wallet.ts` - Enhanced logging in `addBankAccount()`
