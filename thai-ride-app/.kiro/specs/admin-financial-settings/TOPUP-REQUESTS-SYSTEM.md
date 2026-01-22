# 💰 Customer Topup Request Management System

**Date**: 2026-01-22  
**Status**: ✅ Complete  
**Priority**: 🔥 Production Ready  
**Migration**: `316_topup_requests_system.sql`

---

## 📋 Overview

Complete customer topup request management system with admin approval workflow, wallet integration, and comprehensive audit trail.

---

## 🎯 Features

### Customer Features

- ✅ Submit topup requests with payment proof
- ✅ Multiple payment methods supported
- ✅ Track request status in real-time
- ✅ View topup history
- ✅ Upload payment proof images

### Admin Features

- ✅ View all topup requests with filters
- ✅ Approve requests and credit wallets automatically
- ✅ Reject requests with reasons
- ✅ View customer wallet balance
- ✅ Pagination support
- ✅ Real-time status updates

### System Features

- ✅ Atomic wallet transactions
- ✅ Automatic wallet creation
- ✅ Transaction history logging
- ✅ RLS security policies
- ✅ Admin role verification
- ✅ Audit trail

---

## 🗄️ Database Schema

### topup_requests Table

```sql
CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'bank_transfer',
    'promptpay',
    'mobile_banking',
    'cash',
    'other'
  )),
  payment_reference TEXT NOT NULL,
  payment_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  )),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_topup_requests_user_id ON topup_requests(user_id);
CREATE INDEX idx_topup_requests_status ON topup_requests(status);
CREATE INDEX idx_topup_requests_requested_at ON topup_requests(requested_at DESC);
CREATE INDEX idx_topup_requests_processed_by ON topup_requests(processed_by);
```

---

## 🔒 Security (RLS Policies)

### Customer Policies

```sql
-- Users can view their own requests
CREATE POLICY "users_view_own_topup_requests" ON topup_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "users_create_own_topup_requests" ON topup_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### Admin Policies

```sql
-- Admins can view all requests
CREATE POLICY "admins_view_all_topup_requests" ON topup_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can update requests
CREATE POLICY "admins_update_topup_requests" ON topup_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
```

---

## 🔌 RPC Functions

### 1. get_topup_requests_admin()

Get paginated list of topup requests with customer details.

**Parameters**:

- `p_status` (TEXT, optional) - Filter by status
- `p_limit` (INT, default: 20) - Page size
- `p_offset` (INT, default: 0) - Pagination offset

**Returns**: Table with customer info, request details, and wallet balance

**Usage**:

```typescript
const { data, error } = await supabase.rpc("get_topup_requests_admin", {
  p_status: "pending",
  p_limit: 20,
  p_offset: 0,
});
```

### 2. count_topup_requests_admin()

Count total topup requests for pagination.

**Parameters**:

- `p_status` (TEXT, optional) - Filter by status

**Returns**: INT (total count)

**Usage**:

```typescript
const { data: count } = await supabase.rpc("count_topup_requests_admin", {
  p_status: "pending",
});
```

### 3. approve_topup_request()

Approve topup request and credit customer wallet.

**Parameters**:

- `p_request_id` (UUID, required) - Request ID
- `p_admin_id` (UUID, required) - Admin user ID
- `p_admin_note` (TEXT, optional) - Admin note

**Returns**:

```typescript
{
  success: boolean;
  message: string;
  new_balance: number;
}
```

**Behavior**:

1. Validates admin role
2. Locks request row (FOR UPDATE)
3. Checks status is 'pending'
4. Updates request to 'approved'
5. Creates/updates wallet
6. Credits wallet amount
7. Creates transaction record
8. Returns new balance

**Usage**:

```typescript
const { data, error } = await supabase.rpc("approve_topup_request", {
  p_request_id: requestId,
  p_admin_id: adminUser.id,
  p_admin_note: "ตรวจสอบแล้ว สลิปถูกต้อง",
});

if (data[0].success) {
  console.log("New balance:", data[0].new_balance);
}
```

### 4. reject_topup_request()

Reject topup request with reason.

**Parameters**:

- `p_request_id` (UUID, required) - Request ID
- `p_admin_id` (UUID, required) - Admin user ID
- `p_admin_note` (TEXT, required) - Rejection reason

**Returns**:

```typescript
{
  success: boolean;
  message: string;
}
```

**Usage**:

```typescript
const { data, error } = await supabase.rpc("reject_topup_request", {
  p_request_id: requestId,
  p_admin_id: adminUser.id,
  p_admin_note: "สลิปไม่ชัดเจน กรุณาอัพโหลดใหม่",
});
```

---

## 💳 Payment Methods

| Method         | Code             | Description       |
| -------------- | ---------------- | ----------------- |
| Bank Transfer  | `bank_transfer`  | โอนเงินผ่านธนาคาร |
| PromptPay      | `promptpay`      | พร้อมเพย์         |
| Mobile Banking | `mobile_banking` | แอปธนาคาร         |
| Cash           | `cash`           | เงินสด            |
| Other          | `other`          | อื่นๆ             |

---

## 📊 Status Flow

```
pending → approved → wallet credited
        ↓
        rejected (with reason)
        ↓
        cancelled (by customer)
```

### Status Values

| Status      | Description     | Can Change To      |
| ----------- | --------------- | ------------------ |
| `pending`   | รอการอนุมัติ    | approved, rejected |
| `approved`  | อนุมัติแล้ว     | (final state)      |
| `rejected`  | ปฏิเสธแล้ว      | (final state)      |
| `cancelled` | ยกเลิกโดยลูกค้า | (final state)      |

---

## 🔄 Transaction Flow

### Customer Submits Request

```typescript
// 1. Customer creates topup request
const { data, error } = await supabase.from("topup_requests").insert({
  user_id: user.id,
  amount: 1000,
  payment_method: "promptpay",
  payment_reference: "TXN123456",
  payment_proof_url: "https://storage.../proof.jpg",
});
```

### Admin Approves Request

```typescript
// 2. Admin approves request
const { data, error } = await supabase.rpc("approve_topup_request", {
  p_request_id: requestId,
  p_admin_id: adminUser.id,
  p_admin_note: "Verified",
});

// System automatically:
// - Updates request status to 'approved'
// - Credits customer wallet
// - Creates wallet transaction
// - Records admin who approved
// - Sets processed_at timestamp
```

### Wallet Transaction Created

```sql
-- Automatic wallet transaction record
INSERT INTO wallet_transactions (
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  reference_type,
  reference_id,
  description
) VALUES (
  customer_id,
  'topup',
  1000.00,
  500.00,
  1500.00,
  'topup_request',
  request_id,
  'เติมเงินผ่าน promptpay (อนุมัติแล้ว)'
);
```

---

## 🎨 UI Components

### AdminTopupRequestsView.vue

Main admin view for managing customer topup requests with enhanced UI/UX.

**Location**: `src/admin/views/AdminTopupRequestsView.vue`

**Features**:

- ✅ Responsive stats cards with hover effects
- ✅ Real-time statistics dashboard
- ✅ Filter by status (pending/approved/rejected)
- ✅ Approve/Reject modals with confirmation
- ✅ Payment proof image viewer
- ✅ Mobile-first responsive design

**Stats Cards Design**:

```vue
<!-- Responsive grid: 1 col mobile, 2 cols tablet, 4 cols desktop -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500
              hover:shadow-md transition-shadow">
    <div class="text-sm font-medium text-gray-600">รอดำเนินการ</div>
    <div class="text-3xl font-bold text-yellow-600 mt-2">{{ stats.total_pending }}</div>
    <div class="text-sm text-gray-500 mt-1">{{ formatCurrency(stats.total_pending_amount) }}</div>
  </div>
  <!-- Additional cards... -->
</div>
```

**UI Improvements** (2026-01-22):

**Stats Cards**:

- Enhanced padding: `p-4` → `p-6` for better spacing
- Larger numbers: `text-2xl` → `text-3xl` for better readability
- Improved typography hierarchy with consistent font weights
- Added hover effects: `hover:shadow-md transition-shadow`
- Better responsive breakpoints: `grid-cols-2 md:grid-cols-4` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Enhanced text contrast: `text-gray-400` → `text-gray-500` for amounts

**Table Design**:

- Enhanced container: `rounded-xl shadow-sm` → `rounded-2xl shadow-lg border border-gray-200`
- Gradient header: `bg-gray-50` → `bg-gradient-to-r from-gray-50 to-gray-100`
- Icon-enhanced headers: Added SVG icons to all column headers for better visual hierarchy
  - User icon for "ลูกค้า" (Customer)
  - Currency icon for "จำนวนเงิน" (Amount)
  - Credit card icon for "การชำระเงิน" (Payment)
  - Image icon for "หลักฐาน" (Evidence)
  - Check circle icon for "สถานะ" (Status)
  - Calendar icon for "วันที่" (Date)
  - Settings icon for "จัดการ" (Actions)
- Improved typography: `font-semibold` → `font-bold` for headers
- Better row separation: `divide-gray-200` → `divide-gray-100` for softer dividers

### TopupSettingsCard.vue

Admin component for configuring topup settings:

- Minimum/maximum amounts
- Daily limits
- Fee percentages
- Auto-approval thresholds
- Expiry hours

**Location**: `src/admin/components/TopupSettingsCard.vue`

### Usage in Admin Panel

```vue
<template>
  <div class="topup-management">
    <TopupSettingsCard />

    <!-- Topup requests list -->
    <div class="requests-list">
      <TopupRequestCard
        v-for="request in requests"
        :key="request.id"
        :request="request"
        @approve="handleApprove"
        @reject="handleReject"
      />
    </div>
  </div>
</template>
```

---

## 📝 TypeScript Types

```typescript
// src/types/financial-settings.ts

export interface TopupSettings {
  min_amount: number;
  max_amount: number;
  daily_limit: number;
  credit_card_fee: number;
  bank_transfer_fee: number;
  promptpay_fee: number;
  truemoney_fee: number;
  auto_approval_threshold: number;
  expiry_hours: number;
  require_slip_threshold: number;
}

export interface TopupRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  amount: number;
  payment_method:
    | "bank_transfer"
    | "promptpay"
    | "mobile_banking"
    | "cash"
    | "other";
  payment_reference: string;
  payment_proof_url?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
  wallet_balance: number;
}
```

---

## ✅ Testing

### Manual Testing Checklist

- [ ] Customer can submit topup request
- [ ] Admin can view all requests
- [ ] Admin can filter by status
- [ ] Admin can approve request
- [ ] Wallet is credited correctly
- [ ] Transaction is recorded
- [ ] Admin can reject request
- [ ] Rejection reason is saved
- [ ] RLS policies work correctly
- [ ] Pagination works
- [ ] Real-time updates work

### Test Scenarios

**Scenario 1: Successful Approval**

```typescript
// 1. Create request
const request = await createTopupRequest(1000, "promptpay");

// 2. Approve
const result = await approveTopupRequest(request.id, admin.id);

// 3. Verify
expect(result.success).toBe(true);
expect(result.new_balance).toBe(1000);

// 4. Check wallet
const wallet = await getWallet(customer.id);
expect(wallet.balance).toBe(1000);

// 5. Check transaction
const txn = await getLastTransaction(customer.id);
expect(txn.type).toBe("topup");
expect(txn.amount).toBe(1000);
```

**Scenario 2: Rejection**

```typescript
// 1. Create request
const request = await createTopupRequest(1000, "bank_transfer");

// 2. Reject
const result = await rejectTopupRequest(request.id, admin.id, "สลิปไม่ชัดเจน");

// 3. Verify
expect(result.success).toBe(true);

// 4. Check status
const updated = await getTopupRequest(request.id);
expect(updated.status).toBe("rejected");
expect(updated.rejection_reason).toBe("สลิปไม่ชัดเจน");

// 5. Wallet should not be credited
const wallet = await getWallet(customer.id);
expect(wallet.balance).toBe(0);
```

---

## 🚀 Deployment

### Migration Applied

```bash
# Migration file: supabase/migrations/316_topup_requests_system.sql
# Status: ✅ Applied to production
# Date: 2026-01-22
```

### Verification

```sql
-- Check table exists
SELECT * FROM topup_requests LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'topup_requests';

-- Check functions
SELECT proname FROM pg_proc WHERE proname LIKE '%topup%';

-- Test admin function
SELECT * FROM get_topup_requests_admin(NULL, 10, 0);
```

---

## 📚 Documentation

### Updated Files

1. ✅ `README.md` - Added wallet system overview
2. ✅ `docs/admin-rpc-functions.md` - Added topup functions documentation
3. ✅ `.kiro/specs/admin-financial-settings/TOPUP-REQUESTS-SYSTEM.md` - This document

### Related Documentation

- [Admin RPC Functions](../../../docs/admin-rpc-functions.md)
- [Financial Settings](./SETTINGS-REORGANIZATION.md)
- [Business Model](../../business-model.md)
- [Topup Requests View UI Enhancement](../admin-settings-ux-redesign/TOPUP-REQUESTS-VIEW-ENHANCEMENT.md) - Modern UI redesign (2026-01-22)

---

## 🔐 Security Considerations

### Admin Role Verification

All admin functions verify role using:

```sql
IF NOT EXISTS (
  SELECT 1 FROM public.users
  WHERE users.id = auth.uid() AND users.role = 'admin'
) THEN
  RAISE EXCEPTION 'Access denied. Admin privileges required.';
END IF;
```

### Transaction Safety

- Uses `FOR UPDATE` row locking
- Atomic wallet updates
- Prevents double-processing
- Validates status before changes

### RLS Policies

- Customers see only their requests
- Admins see all requests
- Proper role-based access control

---

## 💡 Future Enhancements

### Short-term

- [ ] Auto-approval for amounts below threshold
- [ ] Email notifications on approval/rejection
- [ ] SMS notifications
- [ ] Bulk approval interface

### Long-term

- [ ] OCR for payment slip verification
- [ ] Integration with payment gateways
- [ ] Automatic bank statement matching
- [ ] Fraud detection system
- [ ] Analytics dashboard

---

## 📊 Metrics

### Key Performance Indicators

- Average approval time
- Approval rate
- Rejection rate
- Total topup volume
- Average topup amount
- Payment method distribution

### Monitoring Queries

```sql
-- Pending requests count
SELECT COUNT(*) FROM topup_requests WHERE status = 'pending';

-- Average approval time
SELECT AVG(processed_at - requested_at)
FROM topup_requests
WHERE status = 'approved';

-- Approval rate
SELECT
  COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / COUNT(*) as approval_rate
FROM topup_requests
WHERE status IN ('approved', 'rejected');

-- Total volume by payment method
SELECT
  payment_method,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM topup_requests
WHERE status = 'approved'
GROUP BY payment_method;
```

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026-01-22  
**Next Review**: 2026-02-22
