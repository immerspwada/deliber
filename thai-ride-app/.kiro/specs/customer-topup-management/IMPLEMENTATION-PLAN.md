# Customer Topup Management - Implementation Plan

**Date**: 2026-01-22  
**Status**: 🚧 In Progress  
**Priority**: 🔥 High

---

## ✅ Current Status

### Database Schema - ✅ READY

- `payment_settings` table exists with all necessary fields
- `payment_receiving_accounts` table exists with QR code support
- `topup_requests` table exists for tracking requests

### Existing RPC Functions - ✅ READY

- `get_payment_receiving_accounts()` - Get active payment accounts
- `get_all_payment_settings()` - Get all settings
- `update_payment_setting()` - Update individual setting
- `admin_delete_payment_account()` - Delete payment account
- `get_topup_payment_info()` - Get payment info for customers
- `admin_get_topup_stats()` - Get topup statistics

### Storage - ✅ READY

- Bucket: `payment-qr` exists
- QR codes already being stored
- Public read access configured

---

## 🎯 Implementation Phases

### Phase 1: Admin UI (Current)

**Status**: 🚧 In Progress

**Components to Create**:

1. ✅ `AdminTopupSettingsView.vue` - Main settings view (Started)
2. ⏳ Payment accounts management section
3. ⏳ PromptPay settings section
4. ⏳ Amount limits settings section
5. ⏳ Statistics dashboard section

**Features**:

- View all payment accounts
- Add/Edit/Delete bank accounts
- Upload/Update QR codes
- Set min/max topup amounts
- View topup statistics

### Phase 2: Customer UI Enhancement

**Status**: ⏳ Pending

**Components to Update**:

1. ⏳ Update existing customer topup view
2. ⏳ Display QR codes dynamically
3. ⏳ Show bank account options
4. ⏳ Add quick amount buttons
5. ⏳ Copy to clipboard functionality

### Phase 3: API Enhancement

**Status**: ⏳ Pending

**New Functions Needed**:

1. ⏳ `admin_add_payment_account()` - Add new account
2. � ` admin_update_payment_account()` - Update account
3. ⏳ `admin_upload_qr_code()` - Handle QR upload
4. ⏳ `get_topup_statistics_detailed()` - Enhanced stats

---

## 📊 Database Schema Review

### Existing Tables

#### `payment_settings`

```sql
- id: UUID
- setting_key: VARCHAR (promptpay_id, min_topup_amount, etc.)
- setting_value: TEXT
- setting_label: VARCHAR
- setting_label_th: VARCHAR
- setting_type: VARCHAR (text, number, boolean)
- is_active: BOOLEAN
- updated_by: UUID
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `payment_receiving_accounts`

```sql
- id: UUID
- account_type: VARCHAR (promptpay, bank_transfer)
- account_name: VARCHAR
- account_number: VARCHAR
- bank_code: VARCHAR
- bank_name: VARCHAR
- qr_code_url: TEXT
- display_name: VARCHAR
- description: TEXT
- is_active: BOOLEAN
- is_default: BOOLEAN
- sort_order: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Status**: ✅ Schema is perfect! No changes needed.

---

## 🔌 API Functions Status

### Existing Functions ✅

1. `get_payment_receiving_accounts(p_account_type)` - Get accounts
2. `get_all_payment_settings()` - Get settings
3. `update_payment_setting(key, value)` - Update setting
4. `admin_delete_payment_account(account_id)` - Delete account
5. `get_topup_payment_info()` - Customer payment info
6. `admin_get_topup_stats()` - Statistics

### Functions to Create ⏳

1. `admin_add_payment_account()` - Add new account with validation
2. `admin_update_payment_account()` - Update account details
3. `admin_toggle_account_status()` - Enable/disable account
4. `admin_reorder_accounts()` - Change display order

---

## 🎨 UI Design Plan

### AdminTopupSettingsView Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: ตั้งค่าการเติมเงิน                    [รีเฟรช] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📊 Statistics Cards (4 cards)                          │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│ │Total │ │Active│ │PromptPay│ │Bank│                   │
│ └──────┘ └──────┘ └──────┘ └──────┘                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 💳 Payment Accounts Management                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ [+ เพิ่มบัญชีใหม่]                                  ││
│ │                                                     ││
│ │ Table: Account List                                 ││
│ │ - Type | Name | Number | QR | Status | Actions     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ⚙️ Amount Limits Settings                              │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Min Amount: [____] THB                              ││
│ │ Max Amount: [____] THB                              ││
│ │ Quick Amounts: [100] [500] [1000] [2000] [5000]    ││
│ │                                    [บันทึก]        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

### Immediate (Today)

1. ✅ Create requirements document
2. ✅ Review existing database schema
3. ✅ Check existing RPC functions
4. 🚧 Create AdminTopupSettingsView.vue
5. ⏳ Implement payment accounts table
6. ⏳ Implement add/edit account modals

### Short Term (This Week)

1. ⏳ Complete Admin UI
2. ⏳ Add QR code upload functionality
3. ⏳ Implement amount limits settings
4. ⏳ Add statistics dashboard
5. ⏳ Test all admin functions

### Medium Term (Next Week)

1. ⏳ Update customer topup view
2. ⏳ Add dynamic QR code display
3. ⏳ Implement quick amount buttons
4. ⏳ Add copy to clipboard
5. ⏳ End-to-end testing

---

## 📝 Notes

### Key Findings

- ✅ Database schema is already perfect
- ✅ Most RPC functions exist
- ✅ Storage bucket configured
- ✅ QR codes already working
- ⚠️ Need to create admin management UI
- ⚠️ Need to enhance customer UI

### Technical Decisions

- Use existing tables (no schema changes needed)
- Leverage existing RPC functions
- Create new functions only when necessary
- Follow existing admin UI patterns
- Use Tailwind CSS for styling

### Risks & Mitigations

- **Risk**: Breaking existing topup flow
  - **Mitigation**: Test thoroughly before deployment
- **Risk**: QR code upload size limits
  - **Mitigation**: Validate file size (max 2MB)
- **Risk**: Concurrent admin updates
  - **Mitigation**: Use optimistic locking

---

**Created**: 2026-01-22  
**Last Updated**: 2026-01-22  
**Next Review**: 2026-01-23
