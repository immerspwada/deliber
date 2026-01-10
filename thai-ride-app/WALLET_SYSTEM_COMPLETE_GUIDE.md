# 💰 Wallet System - Complete Guide

## 📋 สรุประบบ Wallet ทั้งหมด

### 🎯 ภาพรวมระบบ

ระบบ Wallet ของ Thai Ride App รองรับ **3 Roles หลัก**:

1. **Customer** - เติมเงิน, ชำระค่าบริการ, ถอนเงิน
2. **Provider** - รับเงินจากงาน, ถอนเงิน (ใช้ระบบแยก)
3. **Admin** - จัดการคำขอเติมเงิน, ถอนเงิน, บัญชีรับเงิน

---

## 🏗️ โครงสร้างฐานข้อมูล

### Tables หลัก

#### 1. `user_wallets`

```sql
- id: UUID
- user_id: UUID (FK -> users)
- balance: DECIMAL(12,2)
- total_earned: DECIMAL(12,2)
- total_spent: DECIMAL(12,2)
- created_at, updated_at: TIMESTAMPTZ
```

#### 2. `wallet_transactions`

```sql
- id: UUID
- user_id: UUID
- type: VARCHAR (topup, payment, refund, cashback, referral, promo, withdrawal)
- amount: DECIMAL(12,2)
- balance_before, balance_after: DECIMAL(12,2)
- description: TEXT
- reference_type, reference_id: VARCHAR/UUID
- status: VARCHAR
- created_at: TIMESTAMPTZ
```

#### 3. `topup_requests`

```sql
- id: UUID
- user_id: UUID
- tracking_id: VARCHAR (TOP-xxxxx)
- amount: DECIMAL(12,2)
- payment_method: VARCHAR (promptpay, bank_transfer, credit_card)
- payment_reference: VARCHAR
- slip_url: TEXT
- status: VARCHAR (pending, approved, rejected, cancelled, expired)
- admin_note: TEXT
- created_at, updated_at, approved_at, rejected_at, expires_at
```

#### 4. `customer_bank_accounts`

```sql
- id: UUID
- user_id: UUID
- bank_code, bank_name: VARCHAR
- account_number, account_name: VARCHAR
- is_default, is_verified: BOOLEAN
- created_at: TIMESTAMPTZ
```

#### 5. `customer_withdrawals`

```sql
- id: UUID
- user_id: UUID
- bank_account_id: UUID
- amount, fee, net_amount: DECIMAL(12,2)
- status: VARCHAR (pending, processing, completed, failed, cancelled)
- transaction_ref: VARCHAR
- failed_reason: TEXT
- created_at, processed_at: TIMESTAMPTZ
```

#### 6. `payment_receiving_accounts` (Admin)

```sql
- id: UUID
- account_type: VARCHAR (promptpay, bank_transfer)
- account_name, account_number: VARCHAR
- bank_code, bank_name: VARCHAR
- qr_code_url: TEXT
- display_name, description: TEXT
- is_active, is_default: BOOLEAN
- sort_order: INTEGER
- created_at, updated_at: TIMESTAMPTZ
```

#### 7. `wallet_audit_log`

```sql
- id: UUID
- user_id: UUID
- action_type: VARCHAR
- amount: DECIMAL(12,2)
- balance_before, balance_after: DECIMAL(12,2)
- reference_type, reference_id: VARCHAR/UUID
- performed_by: UUID (admin)
- ip_address: INET
- user_agent: TEXT
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

---

## 🔄 Flow การทำงาน

### 1. Customer เติมเงิน (Topup)

```
Customer                    System                      Admin
   |                          |                           |
   |--[1] เลือกจำนวนเงิน----->|                           |
   |--[2] เลือกวิธีชำระ------->|                           |
   |                          |--[3] แสดง QR/บัญชี        |
   |<-------------------------|                           |
   |--[4] โอนเงิน + แนบสลิป-->|                           |
   |                          |--[5] สร้าง topup_request  |
   |                          |    status: pending         |
   |                          |-------------------------->|
   |                          |                           |--[6] ตรวจสอบสลิป
   |                          |                           |--[7] อนุมัติ/ปฏิเสธ
   |                          |<--------------------------|
   |                          |--[8] เพิ่มเงินเข้า wallet |
   |                          |    (ถ้าอนุมัติ)           |
   |<--[9] แจ้งเตือน----------|                           |
```

**Functions ที่ใช้:**

- `create_simple_topup_request()` - สร้างคำขอเติมเงิน
- `admin_approve_topup_request()` - Admin อนุมัติ
- `admin_reject_topup_request()` - Admin ปฏิเสธ
- `add_wallet_transaction_with_audit()` - เพิ่มเงินเข้า wallet

### 2. Customer ชำระค่าบริการ

```
Customer                    System
   |                          |
   |--[1] เลือกบริการ--------->|
   |                          |--[2] คำนวณราคา
   |                          |--[3] ตรวจสอบยอดเงิน
   |                          |    check_wallet_balance()
   |                          |
   |--[4] ยืนยันชำระเงิน----->|
   |                          |--[5] หักเงินจาก wallet
   |                          |    pay_from_wallet()
   |                          |--[6] สร้าง transaction
   |                          |    type: payment
   |<--[7] ยืนยันการชำระ-----|
```

**Functions ที่ใช้:**

- `check_wallet_balance()` - ตรวจสอบยอดเงิน
- `pay_from_wallet()` - หักเงิน
- `process_service_payment()` - ชำระค่าบริการ

### 3. Customer ถอนเงิน

```
Customer                    System                      Admin
   |                          |                           |
   |--[1] เพิ่มบัญชีธนาคาร--->|                           |
   |                          |--[2] บันทึกบัญชี          |
   |                          |    customer_bank_accounts |
   |                          |                           |
   |--[3] ขอถอนเงิน---------->|                           |
   |                          |--[4] ตรวจสอบยอดเงิน       |
   |                          |--[5] สร้าง withdrawal     |
   |                          |    status: pending         |
   |                          |-------------------------->|
   |                          |                           |--[6] ตรวจสอบ
   |                          |                           |--[7] โอนเงิน
   |                          |<--------------------------|
   |                          |--[8] อัพเดทสถานะ         |
   |<--[9] แจ้งเตือน----------|                           |
```

**Functions ที่ใช้:**

- `add_customer_bank_account()` - เพิ่มบัญชีธนาคาร
- `request_customer_withdrawal()` - ขอถอนเงิน
- `admin_process_withdrawal()` - Admin ดำเนินการ

---

## 💻 Frontend Components

### Customer Components

#### 1. `WalletView.vue`

**หน้าหลักของ Wallet**

- แสดงยอดเงินคงเหลือ
- ปุ่มเติมเงิน/ถอนเงิน
- แท็บ: ประวัติ, เติมเงิน, ถอนเงิน
- Modal เติมเงิน (2 steps)
- Modal ถอนเงิน

**Features:**

- ✅ Real-time balance updates
- ✅ Auto-resize slip images
- ✅ QR Code display
- ✅ Bank account management
- ✅ Transaction history

#### 2. `useWallet.ts` Composable

**Core logic สำหรับ Wallet**

**State:**

```typescript
- balance: WalletBalance
- transactions: WalletTransaction[]
- topupRequests: TopupRequest[]
- bankAccounts: CustomerBankAccount[]
- withdrawals: CustomerWithdrawal[]
- paymentAccounts: PaymentReceivingAccount[]
```

**Key Functions:**

```typescript
// Balance
fetchBalance();
checkWalletBalance(requiredAmount);

// Transactions
fetchTransactions(limit);
payFromWallet(amount, description, refType, refId);
refundToWallet(amount, description, refType, refId);

// Topup
fetchTopupRequests();
createTopupRequest(amount, method, ref, slipUrl);
cancelTopupRequest(requestId);

// Withdrawal
fetchBankAccounts();
addBankAccount(bankCode, accountNumber, accountName);
fetchWithdrawals();
requestWithdrawal(bankAccountId, amount);

// Payment Accounts (Admin's QR/Bank)
fetchPaymentAccounts(accountType);
getDefaultPaymentAccount(accountType);

// Subscriptions
subscribeToWallet();
subscribeToWithdrawals();
```

### Admin Components

#### 1. `AdminTopupRequestsView.vue`

**จัดการคำขอเติมเงิน**

- แสดงรายการคำขอทั้งหมด
- สถิติ: รอดำเนินการ, อนุมัติแล้ว, ปฏิเสธ
- ค้นหา/กรอง
- ดูรายละเอียด + สลิป
- อนุมัติ/ปฏิเสธ

#### 2. `PaymentAccountsView.vue`

**จัดการบัญชีรับเงิน**

- แสดงบัญชีพร้อมเพย์
- แสดงบัญชีธนาคาร
- อัพโหลด QR Code
- เพิ่ม/แก้ไข/ลบบัญชี
- ตั้งบัญชีหลัก

---

## 🔐 Security Features

### 1. Row Level Security (RLS)

```sql
-- user_wallets
CREATE POLICY "users_own_wallet" ON user_wallets
  FOR ALL USING (user_id = auth.uid());

-- wallet_transactions
CREATE POLICY "users_own_transactions" ON wallet_transactions
  FOR SELECT USING (user_id = auth.uid());

-- topup_requests
CREATE POLICY "users_own_topup_requests" ON topup_requests
  FOR ALL USING (user_id = auth.uid());
```

### 2. Audit Logging

ทุก transaction บันทึกใน `wallet_audit_log`:

- User ID
- Action type
- Amount
- Balance before/after
- Admin who performed (if applicable)
- IP address & User agent
- Metadata (JSON)

### 3. Fraud Detection

`wallet_fraud_alerts` table:

- Rapid topup (>5 ใน 1 ชม.)
- Large withdrawal (>50,000 บาท)
- Unusual patterns
- Balance manipulation

### 4. Balance Reconciliation

`wallet_reconciliation` table:

- ตรวจสอบความถูกต้องของยอดเงิน
- เปรียบเทียบ wallet balance vs sum of transactions
- รัน daily job

---

## 📱 API Endpoints (RPC Functions)

### Customer APIs

```typescript
// Balance
get_customer_wallet(p_user_id)
get_wallet_balance(p_user_id)
check_wallet_balance(p_user_id, p_required_amount)

// Transactions
add_wallet_transaction(p_user_id, p_type, p_amount, p_description)
add_wallet_transaction_with_audit(...)
pay_from_wallet(p_user_id, p_amount, p_description, p_reference_type, p_reference_id)
refund_to_wallet(...)
process_service_payment(p_user_id, p_service_type, p_service_id, p_amount)
process_service_refund(...)

// Topup
get_topup_requests_by_user(p_user_id, p_limit)
get_customer_topup_requests(p_limit)
create_simple_topup_request(p_user_id, p_amount, p_payment_method, p_payment_reference, p_slip_url)
customer_create_topup_request(...)
customer_cancel_topup_request(p_request_id)

// Bank Accounts
get_customer_bank_accounts(p_user_id)
add_customer_bank_account(p_user_id, p_bank_code, p_bank_name, p_account_number, p_account_name, p_is_default)
delete_customer_bank_account(p_user_id, p_account_id)

// Withdrawals
get_customer_withdrawals(p_user_id, p_limit)
request_customer_withdrawal(p_user_id, p_bank_account_id, p_amount)
cancel_customer_withdrawal(p_user_id, p_withdrawal_id)

// Payment Accounts (Admin's QR/Bank)
get_payment_receiving_accounts(p_account_type)
get_default_payment_account(p_account_type)
```

### Admin APIs

```typescript
// Topup Management
admin_get_topup_requests_enhanced(p_status, p_limit, p_search)
admin_approve_topup_request(p_request_id, p_admin_note)
admin_reject_topup_request(p_request_id, p_admin_note)

// Payment Accounts
admin_add_payment_account(...)
admin_update_payment_account(...)
admin_delete_payment_account(p_account_id)
admin_update_account_qr(p_account_id, p_qr_code_url)

// Withdrawal Management
admin_get_withdrawal_requests(p_status, p_limit)
admin_process_withdrawal(p_withdrawal_id, p_transaction_ref, p_admin_note)
admin_reject_withdrawal(p_withdrawal_id, p_reason)

// Analytics
get_wallet_admin_stats()
check_wallet_balance_integrity(p_user_id)
run_daily_wallet_reconciliation()
```

---

## 🎨 UI/UX Features

### Customer Experience

1. **Balance Display**

   - ยอดเงินคงเหลือ (ใหญ่ชัดเจน)
   - รายรับทั้งหมด
   - รายจ่ายทั้งหมด

2. **Topup Flow**

   - Step 1: เลือกจำนวน + วิธีชำระ
   - Step 2: แสดง QR/บัญชี + อัพโหลดสลิป
   - Auto-resize images
   - Copy account number

3. **Withdrawal Flow**

   - เพิ่มบัญชีธนาคาร
   - เลือกบัญชี + จำนวนเงิน
   - แสดงยอดที่ถอนได้

4. **Transaction History**
   - แยกตาม type (เติมเงิน, ชำระ, คืนเงิน)
   - แสดงจำนวนเงิน (+/-)
   - วันที่-เวลา

### Admin Experience

1. **Dashboard**

   - สถิติรวม
   - รอดำเนินการ (highlighted)
   - กราฟ

2. **Request Management**

   - ค้นหา/กรอง
   - ดูสลิป (zoom)
   - อนุมัติ/ปฏิเสธ พร้อมหมายเหตุ

3. **Payment Accounts**
   - จัดการ QR Code
   - หลายบัญชี
   - ตั้งบัญชีหลัก

---

## 🚀 Deployment Checklist

### Database

- [ ] Run migrations 211-214
- [ ] Verify RLS policies
- [ ] Test all RPC functions
- [ ] Set up daily reconciliation job

### Storage

- [ ] Create `payment-slips` bucket
- [ ] Create `payment-qr` bucket
- [ ] Set up storage policies
- [ ] Configure file size limits

### Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Admin Setup

- [ ] Create admin user
- [ ] Add payment accounts (PromptPay + Bank)
- [ ] Upload QR Codes
- [ ] Test topup approval flow

### Testing

- [ ] Customer topup (all methods)
- [ ] Customer withdrawal
- [ ] Admin approval/rejection
- [ ] Balance reconciliation
- [ ] Fraud detection triggers

---

## 📊 Monitoring & Analytics

### Key Metrics

1. **Topup Metrics**

   - Pending requests count
   - Average approval time
   - Approval rate
   - Total topup volume

2. **Withdrawal Metrics**

   - Pending withdrawals
   - Processing time
   - Success rate
   - Total withdrawal volume

3. **Balance Health**
   - Total balance in system
   - Discrepancies found
   - Fraud alerts

### Alerts

- Pending requests > 10
- Fraud alert triggered
- Balance discrepancy detected
- Large withdrawal (>50k)

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "ไม่สามารถสร้างคำขอได้"

**Causes:**

- User not authenticated
- RLS policy blocking
- Missing wallet

**Solutions:**

- Check auth state
- Verify RLS policies
- Auto-create wallet on first use

#### 2. "ยอดเงินไม่เพียงพอ"

**Causes:**

- Insufficient balance
- Pending withdrawals

**Solutions:**

- Check `availableForWithdrawal`
- Show pending amount

#### 3. QR Code ไม่แสดง

**Causes:**

- No payment account
- QR URL invalid
- Storage policy

**Solutions:**

- Check `payment_receiving_accounts`
- Verify storage bucket
- Re-upload QR

---

## 📝 Best Practices

### 1. Transaction Handling

```typescript
// ✅ Good - Use RPC functions
const result = await payFromWallet(amount, description, refType, refId)
if (result.success) {
  await fetchBalance() // Refresh
}

// ❌ Bad - Direct insert
await supabase.from('wallet_transactions').insert(...)
```

### 2. Balance Checks

```typescript
// ✅ Good - Check before payment
const check = await checkWalletBalance(amount);
if (!check.hasSufficientBalance) {
  showError(`ยอดเงินไม่พียงพอ ขาดอีก ${check.shortfall} บาท`);
  return;
}
```

### 3. Error Handling

```typescript
// ✅ Good - Specific error messages
try {
  const result = await createTopupRequest(...)
  if (!result.success) {
    showError(result.message) // User-friendly message
  }
} catch (err) {
  console.error('[Wallet]', err)
  showError('เกิดข้อผิดพลาด กรุณาลองใหม่')
}
```

### 4. Real-time Updates

```typescript
// ✅ Good - Subscribe to changes
onMounted(() => {
  const sub = subscribeToWallet();
  onUnmounted(() => sub.unsubscribe());
});
```

---

## 🎯 Future Enhancements

### Phase 1 (Current)

- ✅ Basic topup/withdrawal
- ✅ Admin approval
- ✅ QR Code support
- ✅ Audit logging

### Phase 2 (Planned)

- [ ] Auto-approval (OCR slip verification)
- [ ] Multiple payment gateways
- [ ] Scheduled withdrawals
- [ ] Wallet limits per user

### Phase 3 (Future)

- [ ] Crypto payments
- [ ] International transfers
- [ ] Loyalty points integration
- [ ] Advanced fraud detection (ML)

---

## 📚 Related Documentation

- [WALLET_AUTH_FIX.md](./WALLET_AUTH_FIX.md) - Auth issues & fixes
- [WALLET_FIX_GUIDE.md](./WALLET_FIX_GUIDE.md) - Common fixes
- [SECURITY.md](./SECURITY.md) - Security guidelines
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment steps

---

**Last Updated:** 2026-01-10
**Version:** 1.0.0
**Status:** ✅ Production Ready
